from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pywebpush import webpush, WebPushException
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from math import floor

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

# notifications
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VAPID_PUBLIC_KEY = "BNYiFa9uM0q9Ius1mg0-7mFeQNiNdUYKKs6RJbvw5fEirhMhcKxtKiGHJyIRfm3FwobRqDtv8eioRuGSxkXoOsI"
VAPID_PRIVATE_KEY = "RzxubIt1t7xImx9fJVZx4Mrprby0Xgnv9MYLPZNcjyk"

subscriptions = []

class Notification(BaseModel):
    title: str = "Reminder!"
    body: str = "Don't forget your habit today!"

# -----------------------------
@app.post("/subscribe")
async def subscribe(subscription: dict):
    subscriptions.append(subscription)
    print("New subscription:", subscription.get("endpoint"))
    return {"message": "Subscribed"}

# -----------------------------
@app.post("/send_notification")
async def send_notification(notification: Notification):
    title = notification.title
    body = notification.body

    if not subscriptions:
        return {"message": "No subscribers to send notifications"}

    for sub in subscriptions:
        try:
            webpush(
                subscription_info=sub,
                data=f"{title}|{body}",
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": "mailto:vj@example.com"}
            )
            print(f"Notification sent to {sub['endpoint']}")
        except WebPushException as e:
            print(f"Error sending notification to {sub['endpoint']}: {e}")

    return {"message": "Notifications sent"}


# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=7)):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def calculate_level(xp: int) -> int:
    return floor(xp / 100) + 1

def get_badges(xp: int) -> List[str]:
    badges = []
    if xp >= 0:
        badges.append("Beginner")
    if xp >= 100:
        badges.append("Novice")
    if xp >= 500:
        badges.append("Intermediate")
    if xp >= 1000:
        badges.append("Expert")
    if xp >= 2500:
        badges.append("Master")
    return badges

async def update_streaks(user_id: str):
    # Get user's last completion date
    completions = await db.habit_completions.find(
        {"user_id": user_id}
    ).sort("completed_at", -1).to_list(1000)
    
    if not completions:
        return 0, 0
    
    # Convert ISO strings to datetime
    dates = []
    for comp in completions:
        if isinstance(comp['completed_at'], str):
            dates.append(datetime.fromisoformat(comp['completed_at']).date())
        else:
            dates.append(comp['completed_at'].date())
    
    unique_dates = sorted(set(dates), reverse=True)
    
    # Calculate current streak
    current_streak = 0
    today = datetime.now(timezone.utc).date()
    
    for i, date in enumerate(unique_dates):
        expected_date = today - timedelta(days=i)
        if date == expected_date:
            current_streak += 1
        else:
            break
    
    # Calculate longest streak
    longest_streak = 0
    temp_streak = 1
    
    for i in range(len(unique_dates) - 1):
        if (unique_dates[i] - unique_dates[i + 1]).days == 1:
            temp_streak += 1
            longest_streak = max(longest_streak, temp_streak)
        else:
            temp_streak = 1
    
    longest_streak = max(longest_streak, temp_streak, current_streak)
    
    return current_streak, longest_streak

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    is_admin: bool = False
    xp: int = 0
    level: int = 1
    total_points: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    badges: List[str] = []
    phone: Optional[str] = None
    created_at: str

class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    frequency: str = "daily"  # daily or weekly
    notification_time: Optional[str] = None  # HH:MM format

class Habit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    frequency: str
    notification_time: Optional[str] = None
    is_active: bool = True
    created_at: str

class HabitCompletion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    habit_id: str
    user_id: str
    completed_at: str
    xp_earned: int = 10

class StatsResponse(BaseModel):
    xp: int
    level: int
    total_points: int
    current_streak: int
    longest_streak: int
    badges: List[str]
    total_habits: int
    completed_today: int

class AdminStats(BaseModel):
    total_users: int
    admin_users: int
    inactive_users: int
    total_habits: int
    total_completions: int

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(user_data.password)
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hashed_pwd,
        "is_admin": False,
        "xp": 0,
        "level": 1,
        "total_points": 0,
        "current_streak": 0,
        "longest_streak": 0,
        "badges": ["Beginner"],
        "phone": user_data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create token
    token = create_access_token({"sub": user_id})
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "is_admin": False,
            "xp": 0,
            "level": 1
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    token = create_access_token({"sub": user["id"]})
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "is_admin": user.get("is_admin", False),
            "xp": user.get("xp", 0),
            "level": user.get("level", 1)
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "is_admin": current_user.get("is_admin", False),
        "xp": current_user.get("xp", 0),
        "level": current_user.get("level", 1),
        "current_streak": current_user.get("current_streak", 0),
        "longest_streak": current_user.get("longest_streak", 0),
        "badges": current_user.get("badges", [])
    }

# Habit Routes
@api_router.get("/habits", response_model=List[Habit])
async def get_habits(current_user: dict = Depends(get_current_user)):
    habits = await db.habits.find(
        {"user_id": current_user["id"], "is_active": True},
        {"_id": 0}
    ).to_list(1000)
    return habits

@api_router.get("/habits/completions/today")
async def get_today_completions(current_user: dict = Depends(get_current_user)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    completions = await db.habit_completions.find(
        {
            "user_id": current_user["id"],
            "completed_at": {"$gte": today_start.isoformat()}
        },
        {"_id": 0}
    ).to_list(1000)
    return completions

@api_router.post("/habits", response_model=Habit)
async def create_habit(habit_data: HabitCreate, current_user: dict = Depends(get_current_user)):
    habit_id = str(uuid.uuid4())
    habit_doc = {
        "id": habit_id,
        "user_id": current_user["id"],
        "name": habit_data.name,
        "description": habit_data.description,
        "frequency": habit_data.frequency,
        "notification_time": habit_data.notification_time,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.habits.insert_one(habit_doc)
    return Habit(**habit_doc)

@api_router.put("/habits/{habit_id}", response_model=Habit)
async def update_habit(habit_id: str, habit_data: HabitCreate, current_user: dict = Depends(get_current_user)):
    result = await db.habits.find_one_and_update(
        {"id": habit_id, "user_id": current_user["id"]},
        {"$set": habit_data.model_dump()},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Habit not found")
    result.pop("_id", None)
    return Habit(**result)

@api_router.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.habits.update_one(
        {"id": habit_id, "user_id": current_user["id"]},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    return {"message": "Habit deleted successfully"}

@api_router.post("/habits/{habit_id}/complete")
async def complete_habit(habit_id: str, current_user: dict = Depends(get_current_user)):
    # Check if habit exists
    habit = await db.habits.find_one({"id": habit_id, "user_id": current_user["id"]})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    # Check if already completed today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    existing_completion = await db.habit_completions.find_one({
        "habit_id": habit_id,
        "user_id": current_user["id"],
        "completed_at": {"$gte": today_start.isoformat()}
    })
    
    if existing_completion:
        raise HTTPException(status_code=400, detail="Habit already completed today")
    
    # Award XP
    xp_earned = 10
    new_xp = current_user.get("xp", 0) + xp_earned
    new_level = calculate_level(new_xp)
    new_badges = get_badges(new_xp)
    
    # Create completion record
    completion_id = str(uuid.uuid4())
    completion_doc = {
        "id": completion_id,
        "habit_id": habit_id,
        "user_id": current_user["id"],
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "xp_earned": xp_earned
    }
    await db.habit_completions.insert_one(completion_doc)
    
    # Update user stats
    current_streak, longest_streak = await update_streaks(current_user["id"])
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "xp": new_xp,
            "level": new_level,
            "total_points": new_xp,
            "current_streak": current_streak,
            "longest_streak": max(longest_streak, current_user.get("longest_streak", 0)),
            "badges": new_badges
        }}
    )
    
    return {
        "message": "Habit completed!",
        "xp_earned": xp_earned,
        "new_xp": new_xp,
        "new_level": new_level,
        "current_streak": current_streak
    }

@api_router.get("/stats", response_model=StatsResponse)
async def get_stats(current_user: dict = Depends(get_current_user)):
    # Count habits
    total_habits = await db.habits.count_documents({
        "user_id": current_user["id"],
        "is_active": True
    })
    
    # Count today's completions
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    completed_today = await db.habit_completions.count_documents({
        "user_id": current_user["id"],
        "completed_at": {"$gte": today_start.isoformat()}
    })
    
    return StatsResponse(
        xp=current_user.get("xp", 0),
        level=current_user.get("level", 1),
        total_points=current_user.get("total_points", 0),
        current_streak=current_user.get("current_streak", 0),
        longest_streak=current_user.get("longest_streak", 0),
        badges=current_user.get("badges", []),
        total_habits=total_habits,
        completed_today=completed_today
    )

# Admin Routes
@api_router.get("/admin/users", response_model=List[User])
async def get_all_users(current_user: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_admin_user)):
    # Prevent deleting admins
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if target_user.get("is_admin"):
        raise HTTPException(status_code=400, detail="Cannot delete admin users")
    
    # Delete user and their data
    await db.users.delete_one({"id": user_id})
    await db.habits.delete_many({"user_id": user_id})
    await db.habit_completions.delete_many({"user_id": user_id})
    
    return {"message": "User deleted successfully"}

@api_router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats(current_user: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    admin_users = await db.users.count_documents({"is_admin": True})
    
    # Users inactive for 7+ days
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    inactive_users = await db.users.count_documents({
        "created_at": {"$lt": week_ago},
        "is_admin": False
    })
    
    total_habits = await db.habits.count_documents({"is_active": True})
    total_completions = await db.habit_completions.count_documents({})
    
    return AdminStats(
        total_users=total_users,
        admin_users=admin_users,
        inactive_users=inactive_users,
        total_habits=total_habits,
        total_completions=total_completions
    )

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()