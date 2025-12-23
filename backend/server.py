from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
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
import firebase_admin
from firebase_admin import credentials, messaging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# --- FIREBASE GLOBAL SETUP ---
# We load the credential once into memory to avoid file path errors in background threads
firebase_cred = None
try:
    key_path = ROOT_DIR / "serviceAccountKey.json"
    if key_path.exists():
        firebase_cred = credentials.Certificate(str(key_path))
        firebase_admin.initialize_app(firebase_cred)
        print("✅ FIREBASE CONNECTED SUCCESSFULLY")
    else:
        print(f"❌ CRITICAL: 'serviceAccountKey.json' missing at {key_path}")
except Exception as e:
    print(f"⚠️ FIREBASE INIT ERROR: {e}")

# --- SECURITY ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get("JWT_SECRET", "secret")
JWT_ALGORITHM = "HS256"


# --- HELPERS ---
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain, hashed) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except:
        raise HTTPException(401, "Invalid token")


async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(403, "Admin only")
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
    completions = (
        await db.habit_completions.find({"user_id": user_id})
        .sort("completed_at", -1)
        .to_list(1000)
    )
    if not completions:
        return 0, 0
    dates = []
    for comp in completions:
        if isinstance(comp["completed_at"], str):
            dates.append(datetime.fromisoformat(comp["completed_at"]).date())
        else:
            dates.append(comp["completed_at"].date())
    unique_dates = sorted(set(dates), reverse=True)
    today = datetime.now(timezone.utc).date()
    current_streak = 0
    for i, date in enumerate(unique_dates):
        if date == (today - timedelta(days=i)):
            current_streak += 1
        else:
            break
    longest = 0
    temp = 1
    for i in range(len(unique_dates) - 1):
        if (unique_dates[i] - unique_dates[i + 1]).days == 1:
            temp += 1
            longest = max(longest, temp)
        else:
            temp = 1
    longest = max(longest, temp, current_streak)
    return current_streak, longest


async def log_event(user, action):
    try:
        await db.system_logs.insert_one(
            {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "username": user.get("username", user["email"].split("@")[0]),
                "email": user["email"],
                "action": action,
                "role": "ADMIN" if user.get("is_admin") else "USER",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )
    except:
        pass


# --- NOTIFICATION ENGINE ---
async def check_and_send_notifications():
    # 1. UTC to IST Conversion
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc + timedelta(hours=5, minutes=30)
    current_time_str = now_ist.strftime("%H:%M")

    print(f"⏰ TICK: Looking for habits at {current_time_str}")

    cursor = db.habits.find({"notification_time": current_time_str, "is_active": True})

    async for habit in cursor:
        print(f"🎯 FOUND HABIT: {habit['name']}")
        user = await db.users.find_one({"id": habit["user_id"]})

        if user and user.get("fcm_token"):
            try:
                # 2. Connection Safety Check using GLOBAL creds
                if not firebase_admin._apps:
                    if firebase_cred:
                        firebase_admin.initialize_app(firebase_cred)
                        print("♻️ Re-initialized Firebase Connection")
                    else:
                        print("❌ CRITICAL: Credential missing. Cannot send.")
                        continue

                msg = messaging.Message(
                    notification=messaging.Notification(
                        title=f"MISSION START: {habit['name']}",
                        body="Time to execute your daily quest.",
                    ),
                    token=user["fcm_token"],
                )
                messaging.send(msg)
                print(f"🚀 SENT NOTIFICATION TO: {user['email']}")
            except Exception as e:
                print(f"❌ SEND FAILED: {e}")
        else:
            print(f"⚠️ User {user['email'] if user else 'Unknown'} has no token")


# --- MODELS ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    frequency: str = "daily"
    notification_time: Optional[str] = None


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    is_admin: bool = False
    xp: int = 0
    level: int = 1
    current_streak: int = 0
    longest_streak: int = 0
    badges: List[str] = []
    created_at: str
    last_active: Optional[str] = None


class Habit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    frequency: str
    notification_time: Optional[str] = None
    is_active: bool = True


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


class SystemLog(BaseModel):
    id: str
    user_id: str
    username: str
    email: str
    action: str
    role: str
    timestamp: str


# --- ROUTES ---
@api_router.post("/auth/register")
async def register(data: UserRegister):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(400, "Email exists")
    uid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user = {
        "id": uid,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "is_admin": False,
        "xp": 0,
        "level": 1,
        "current_streak": 0,
        "longest_streak": 0,
        "badges": ["Beginner"],
        "created_at": now,
        "last_active": now,
        "phone": data.phone,
    }
    await db.users.insert_one(user)
    await log_event(user, "REGISTER")
    return {"token": create_access_token({"sub": uid}), "user": user}


@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}},
    )
    await log_event(user, "LOGIN")
    return {
        "token": create_access_token({"sub": user["id"]}),
        "user": {k: v for k, v in user.items() if k != "password_hash"},
    }


@api_router.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    await log_event(user, "LOGOUT")
    return {"message": "Logged out"}


@api_router.post("/auth/fcm-token")
async def save_fcm(data: dict, user: dict = Depends(get_current_user)):
    if not data.get("token"):
        raise HTTPException(400, "Token missing")
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"fcm_token": data["token"]}}
    )
    return {"message": "Token saved"}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    user["username"] = user.get("username", user["email"].split("@")[0])
    return user


@api_router.patch("/auth/username")
async def set_username(data: dict, user: dict = Depends(get_current_user)):
    if not data.get("username"):
        raise HTTPException(400, "Username required")
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"username": data["username"]}}
    )
    return {"message": "Updated"}


@api_router.get("/admin/users", response_model=List[User])
async def admin_users(user: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for u in users:
        if not u.get("last_active"):
            u["last_active"] = u.get("created_at")
    return users


@api_router.get("/admin/stats", response_model=AdminStats)
async def admin_stats(user: dict = Depends(get_admin_user)):
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    return AdminStats(
        total_users=await db.users.count_documents({}),
        admin_users=await db.users.count_documents({"is_admin": True}),
        inactive_users=await db.users.count_documents(
            {"is_admin": False, "last_active": {"$lt": week_ago}}
        ),
        total_habits=await db.habits.count_documents({"is_active": True}),
        total_completions=await db.habit_completions.count_documents({}),
    )


@api_router.get("/admin/logs", response_model=List[SystemLog])
async def admin_logs(user: dict = Depends(get_admin_user)):
    await db.system_logs.delete_many(
        {
            "timestamp": {
                "$lt": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
            }
        }
    )
    return await db.system_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(1000)


@api_router.delete("/admin/users/{uid}")
async def delete_user(uid: str, user: dict = Depends(get_admin_user)):
    target = await db.users.find_one({"id": uid})
    if target and target.get("is_admin"):
        raise HTTPException(400, "Cannot delete admin")
    await db.users.delete_one({"id": uid})
    await db.habits.delete_many({"user_id": uid})
    await db.habit_completions.delete_many({"user_id": uid})
    return {"message": "Deleted"}


@api_router.get("/habits", response_model=List[Habit])
async def get_habits(user: dict = Depends(get_current_user)):
    return await db.habits.find(
        {"user_id": user["id"], "is_active": True}, {"_id": 0}
    ).to_list(1000)


@api_router.get("/habits/completions/today")
async def get_completions(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).isoformat()[:10]
    return await db.habit_completions.find(
        {"user_id": user["id"], "completed_at": {"$gte": today}}, {"_id": 0}
    ).to_list(1000)


@api_router.post("/habits", response_model=Habit)
async def create_habit(data: HabitCreate, user: dict = Depends(get_current_user)):
    habit = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": data.name,
        "description": data.description,
        "frequency": data.frequency,
        "notification_time": data.notification_time,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.habits.insert_one(habit)
    return habit


@api_router.put("/habits/{hid}", response_model=Habit)
async def update_habit(
    hid: str, data: HabitCreate, user: dict = Depends(get_current_user)
):
    res = await db.habits.find_one_and_update(
        {"id": hid, "user_id": user["id"]},
        {"$set": data.model_dump()},
        return_document=True,
    )
    if not res:
        raise HTTPException(404, "Not found")
    return {k: v for k, v in res.items() if k != "_id"}


@api_router.patch("/habits/{hid}", response_model=Habit)
async def patch_habit(hid: str, data: dict, user: dict = Depends(get_current_user)):
    await db.habits.update_one({"id": hid, "user_id": user["id"]}, {"$set": data})
    h = await db.habits.find_one({"id": hid}, {"_id": 0})
    if not h:
        raise HTTPException(404, "Not found")
    return h


@api_router.delete("/habits/{hid}")
async def delete_habit(hid: str, user: dict = Depends(get_current_user)):
    await db.habits.update_one(
        {"id": hid, "user_id": user["id"]}, {"$set": {"is_active": False}}
    )
    return {"message": "Deleted"}


@api_router.post("/habits/{hid}/complete")
async def complete_habit(hid: str, user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).isoformat()[:10]
    if await db.habit_completions.find_one(
        {"habit_id": hid, "user_id": user["id"], "completed_at": {"$gte": today}}
    ):
        raise HTTPException(400, "Already completed")
    xp = 10
    await db.habit_completions.insert_one(
        {
            "id": str(uuid.uuid4()),
            "habit_id": hid,
            "user_id": user["id"],
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "xp_earned": xp,
        }
    )
    new_xp = user["xp"] + xp
    cur, lon = await update_streaks(user["id"])
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "xp": new_xp,
                "level": calculate_level(new_xp),
                "current_streak": cur,
                "longest_streak": max(lon, user.get("longest_streak", 0)),
                "badges": get_badges(new_xp),
                "last_active": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    return {
        "message": "Completed",
        "xp_earned": xp,
        "new_xp": new_xp,
        "new_level": calculate_level(new_xp),
    }


@api_router.get("/stats", response_model=StatsResponse)
async def get_stats(user: dict = Depends(get_current_user)):
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return StatsResponse(
        xp=user.get("xp", 0),
        level=user.get("level", 1),
        total_points=user.get("xp", 0),
        current_streak=user.get("current_streak", 0),
        longest_streak=user.get("longest_streak", 0),
        badges=user.get("badges", []),
        total_habits=await db.habits.count_documents(
            {"user_id": user["id"], "is_active": True}
        ),
        completed_today=await db.habit_completions.count_documents(
            {"user_id": user["id"], "completed_at": {"$gte": today_start.isoformat()}}
        ),
    )


@api_router.get("/leaderboard")
async def leaderboard():
    users = (
        await db.users.find(
            {"is_admin": False},
            {"_id": 0, "username": 1, "xp": 1, "level": 1, "email": 1},
        )
        .sort("xp", -1)
        .limit(10)
        .to_list(10)
    )
    for u in users:
        u["username"] = u.get("username") or u["email"].split("@")[0]
    return users


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(check_and_send_notifications, "interval", minutes=1)
    scheduler.start()
    print("🚀 SYSTEM ONLINE: Scheduler Active (IST Timezone)")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
