# server.py - FINAL FULL VERSION
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
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

# --- CONFIGURATION ---
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- DATABASE CONNECTION ---
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# --- FIREBASE GLOBAL INITIALIZATION ---

firebase_cred = None
try:
    key_path = ROOT_DIR / "serviceAccountKey.json"
    if key_path.exists():
        firebase_cred = credentials.Certificate(str(key_path))
        firebase_admin.initialize_app(firebase_cred)
        print("✅ FIREBASE CONNECTED SUCCESSFULLY", flush=True)
    else:
        print(
            f"❌ CRITICAL: 'serviceAccountKey.json' missing at {key_path}", flush=True
        )
except Exception as e:
    # Handle hot-reload re-initialization error gracefully
    if "The default Firebase app already exists" not in str(e):
        print(f"⚠️ FIREBASE INIT ERROR: {e}", flush=True)

# --- SECURITY CONFIGURATION ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get("JWT_SECRET", "secret")
JWT_ALGORITHM = "HS256"


# --- HELPER FUNCTIONS ---


def hash_password(password: str) -> str:
    """Hashes a plain password."""
    return pwd_context.hash(password)


def verify_password(plain, hashed) -> bool:
    """Verifies a plain password against a hash."""
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict):
    """Creates a JWT token with a 7-day expiration."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Decodes the JWT token and retrieves the user from the database.
    """
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(401, "Invalid token")

        # Explicitly exclude _id to prevent ObjectId serialization crashes
        user = await db.users.find_one({"id": user_id}, {"_id": 0})

        if not user:
            raise HTTPException(401, "User not found")

        return user
    except Exception as e:
        raise HTTPException(401, "Invalid token or expired session")


async def get_admin_user(current_user: dict = Depends(get_current_user)):
    """Ensures the user has admin privileges."""
    if not current_user.get("is_admin"):
        raise HTTPException(403, "Admin access required")
    return current_user


def calculate_level(xp: int) -> int:
    """Calculates level based on XP (100 XP per level)."""
    return floor(xp / 100) + 1


def get_user_title(level: int) -> str:
    """Returns a burning 3D title for levels 1-30+"""
    if level < 5:
        return "NEON PHANTOM"  # Beginner
    if level < 10:
        return "COBALT STRIKER"  # Progressing
    if level < 15:
        return "CYBER VANGUARD"  # Intermediate
    if level < 20:
        return "PLASMA EXECUTOR"  # Advanced
    if level < 25:
        return "TITAN ARCHITECT"  # Elite
    if level < 30:
        return "VOID OVERLORD"  # Master
    return "SOLAR DEITY"  # Level 30+ (Max Rank)


def get_badges(xp: int) -> List[str]:
    """Returns a list of badges based on total XP."""
    badges = []
    if xp >= 0:
        badges.append("Beginner")
    if xp >= 200:
        badges.append("Novice")
    if xp >= 1000:
        badges.append("Intermediate")
    if xp >= 2500:
        badges.append("Expert")
    if xp >= 5000:
        badges.append("Master")
    return badges


async def apply_shield_protection(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("shields", 0) <= 0:
        return

    last_completion = await db.habit_completions.find_one(
        {"user_id": user_id}, sort=[("completed_at", -1)]
    )

    if not last_completion:
        return

    now = datetime.now(timezone.utc)
    today = now.date()

    if isinstance(last_completion["completed_at"], str):
        last_date = datetime.fromisoformat(last_completion["completed_at"]).date()
    else:
        last_date = last_completion["completed_at"].date()

    delta = (today - last_date).days

    if delta == 2:
        await db.users.update_one({"id": user_id}, {"$inc": {"shields": -1}})

        yesterday_iso = (now - timedelta(days=1)).isoformat()

        await db.habit_completions.insert_one(
            {
                "id": str(uuid.uuid4()),
                "habit_id": "SHIELD_PROTECTION",
                "user_id": user_id,
                "completed_at": yesterday_iso,
                "xp_earned": 0,
                "type": "shield",
            }
        )

        await log_event({**user, "id": user_id}, "SHIELD_USED_AUTOMATICALLY")


async def update_streaks(user_id: str):
    """
    Restored Full Logic: Calculates current and longest streaks based on unique completion dates.
    This handles consecutive days and gaps correctly.
    """
    completions = (
        await db.habit_completions.find({"user_id": user_id})
        .sort("completed_at", -1)
        .to_list(1000)
    )

    if not completions:
        return 0, 0

    # Extract unique dates from completions
    dates = []
    for comp in completions:
        if isinstance(comp["completed_at"], str):
            dates.append(datetime.fromisoformat(comp["completed_at"]).date())
        else:
            dates.append(comp["completed_at"].date())

    unique_dates = sorted(set(dates), reverse=True)
    today = datetime.now(timezone.utc).date()

    # --- Calculate Current Streak ---
    current_streak = 0
    # Check if the most recent completion was today or yesterday
    if unique_dates and unique_dates[0] < (today - timedelta(days=1)):
        current_streak = 0
    else:
        # Iterate backwards to find consecutive days
        for i, date in enumerate(unique_dates):
            # Check against 'today' offset by 'i'
            # (Simplified logic for robustness)
            expected_date_today = today - timedelta(days=i)
            expected_date_yesterday = today - timedelta(days=i + 1)

            # Logic: If date matches the expected consecutive date
            if date == (today - timedelta(days=i)):
                current_streak += 1
            elif i == 0 and date == (today - timedelta(days=1)):
                # Special case: Streak is alive if last completion was yesterday
                current_streak += 1
            elif i > 0 and date == (today - timedelta(days=i)):
                current_streak += 1
            else:
                # Break if the sequence is broken
                break

    # --- Calculate Longest Streak ---
    longest = 0
    temp = 1
    for i in range(len(unique_dates) - 1):
        # Check if the next date in the list is exactly 1 day before the current one
        if (unique_dates[i] - unique_dates[i + 1]).days == 1:
            temp += 1
            longest = max(longest, temp)
        else:
            temp = 1

    # Ensure longest is at least the current streak
    longest = max(longest, temp, current_streak)

    return current_streak, longest


async def log_event(user, action):
    """Logs system events to the database for the Admin Panel."""
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
    except Exception as e:
        print(f"⚠️ Log Error: {e}")


# --- NOTIFICATION ENGINE (Full Robust Version) ---
async def check_and_send_notifications():
    """
    Checks for habits due at the current IST time and sends FCM notifications.
    Uses 'last_notified_date' to prevent double-sending.
    """
    # 1. UTC to IST Conversion
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc + timedelta(hours=5, minutes=30)
    current_time_str = now_ist.strftime("%H:%M")
    current_seconds = now_ist.strftime("%S")
    today_str = now_ist.strftime("%Y-%m-%d")

    # Debug Log for Terminal Visibility
    print(f"⏰ TICK: {current_time_str}:{current_seconds} | Scanning...", flush=True)

    # 2. Find habits due NOW that haven't been notified TODAY yet
    cursor = db.habits.find(
        {
            "notification_time": current_time_str,
            "is_active": True,
            "last_notified_date": {"$ne": today_str},  # CRITICAL: Ensures 1 per day
        }
    )

    async for habit in cursor:
        print(f"🎯 MATCH FOUND: {habit['name']}", flush=True)

        # 3. Update DB first (Atomic Lock)
        update_result = await db.habits.update_one(
            {"id": habit["id"], "last_notified_date": {"$ne": today_str}},
            {"$set": {"last_notified_date": today_str}},
        )

        # If update failed (modified_count=0), another worker handled it
        if update_result.modified_count == 0:
            print(f"✋ SKIPPED: {habit['name']} (Already Handled)", flush=True)
            continue

        # 4. Fetch User for Token
        user = await db.users.find_one({"id": habit["user_id"]})

        if user and user.get("fcm_token"):
            try:
                # 5. Send Notification with Data Payload
                msg = messaging.Message(
                    notification=messaging.Notification(
                        title=f"MISSION START: {habit['name']}",
                        body="Time to execute your daily quest.",
                    ),
                    data={
                        "type": "reminder",
                        "habit_id": habit["id"],
                        "click_action": "FLUTTER_NOTIFICATION_CLICK",
                    },
                    token=user["fcm_token"],
                )

                response = messaging.send(msg)
                print(f"🚀 SENT SUCCESSFULLY TO: {user['email']}", flush=True)
            except Exception as e:
                print(f"❌ FIREBASE SEND FAILED: {e}", flush=True)
        else:
            print(f"⚠️ NO TOKEN: User {user.get('email', 'Unknown')}", flush=True)


# --- PYDANTIC MODELS (Full Definitions) ---
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
    is_measurable: bool = False
    target_value: float = 0
    starting_point: float = 0
    unit: str = ""


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    username: Optional[str] = None
    is_admin: bool = False
    xp: int = 0
    level: int = 1
    shields: int = 0
    title: Optional[str] = None
    current_streak: int = 0
    longest_streak: int = 0
    badges: List[str] = []
    created_at: str
    last_active: Optional[str] = None
    fcm_token: Optional[str] = None


class Habit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    is_measurable: bool = False
    starting_point: float = 0 
    target_value: float = 0
    current_value: float = 0 
    unit: str = ""
    description: Optional[str] = None
    frequency: str
    notification_time: Optional[str] = None
    is_active: bool = True
    last_notified_date: Optional[str] = None


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    notification_time: Optional[str] = None 
    frequency: Optional[str] = None
    current_value: Optional[float] = None


class StatsResponse(BaseModel):
    xp: int
    level: int
    total_points: int
    current_streak: int
    longest_streak: int
    badges: List[str]
    total_habits: int
    completed_today: int
    shields: int
    title: str


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


# --- AUTHENTICATION ROUTES ---


@api_router.post("/auth/register")
async def register(data: UserRegister):
    # Check if user exists
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(400, "Email exists")

    uid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Create User Object
    user = {
        "id": uid,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "is_admin": False,
        "xp": 0,
        "level": 1,
        "shields": 0,
        "current_streak": 0,
        "longest_streak": 0,
        "badges": ["Beginner"],
        "created_at": now,
        "last_active": now,
        "phone": data.phone,
    }

    await db.users.insert_one(user)

    # Prepare clean response (remove sensitive data)
    clean_user = {k: v for k, v in user.items() if k not in ["password_hash", "_id"]}
    clean_user["title"] = get_user_title(1)

    await log_event(clean_user, "REGISTER")

    return {"token": create_access_token({"sub": uid}), "user": clean_user}


@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")

    clean_user = {k: v for k, v in user.items() if k not in ["password_hash", "_id"]}

    # Calculate the title before sending to the frontend
    clean_user["title"] = get_user_title(user.get("level", 1))

    return {
        "token": create_access_token({"sub": user["id"]}),
        "user": clean_user,
    }


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    """Fetches current user details with dynamic title calculation."""
    user["username"] = user.get("username", user["email"].split("@")[0])
    user["title"] = get_user_title(user.get("level", 1))

    user["shields"] = user.get("shields", 0)
    return user


@api_router.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    await log_event(user, "LOGOUT")
    return {"message": "Logged out"}


@api_router.patch("/auth/username")
async def set_username(data: dict, user: dict = Depends(get_current_user)):
    new_username = data.get("username", "").strip()

    # VALIDATION: Check for Alphanumeric only
    if not re.match("^[a-zA-Z0-9]+$", new_username):
        raise HTTPException(
            status_code=400, detail="Invalid characters. Only A-Z and 0-9 allowed."
        )

    # Check for duplicates (existing logic)
    existing_user = await db.users.find_one(
        {
            "username": {"$regex": f"^{new_username}$", "$options": "i"},
            "id": {"$ne": user["id"]},
        }
    )

    if existing_user:
        raise HTTPException(status_code=400, detail="Username already claimed.")

    await db.users.update_one({"id": user["id"]}, {"$set": {"username": new_username}})
    return {"message": "Success", "username": new_username}


@api_router.post("/auth/fcm-token")
async def save_fcm(data: dict, user: dict = Depends(get_current_user)):
    if not data.get("token"):
        raise HTTPException(400, "Token missing")

    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"fcm_token": data["token"]}}
    )
    return {"message": "Token saved"}


@api_router.delete("/auth/fcm-token")
async def remove_fcm(user: dict = Depends(get_current_user)):
    """Removes the FCM token so notifications stop."""
    await db.users.update_one({"id": user["id"]}, {"$unset": {"fcm_token": ""}})
    return {"message": "Notifications Disabled"}


# --- EVOLUTION & SHOP ROUTES ---


@api_router.post("/shop/buy-shield")
async def buy_shield(user: dict = Depends(get_current_user)):
    SHIELD_COST = 200
    current_xp = user.get("xp", 0)

    if current_xp < SHIELD_COST:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient XP. Shield requires {SHIELD_COST} XP.",
        )

    new_xp = current_xp - SHIELD_COST

    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "xp": new_xp,
                "level": calculate_level(new_xp),
                "badges": get_badges(new_xp),
            },
            "$inc": {"shields": 1},
        },
    )

    await log_event(user, "SHOP_PURCHASE: STREAK_SHIELD")

    return {
        "message": "Shield Secured",
        "new_xp": new_xp,
        "shields": user.get("shields", 0) + 1,
    }


@api_router.get("/stats", response_model=StatsResponse)
async def get_stats(user: dict = Depends(get_current_user)):
    try:
        # Check shield before calculating stats
        if user.get("shields", 0) > 0:
            await apply_shield_protection(user["id"])
            user = await db.users.find_one({"id": user["id"]}, {"_id": 0})

        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        user_xp = user.get("xp", 0)
        user_level = user.get("level", 1)

        cur_streak, long_streak = await update_streaks(user["id"])

        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"current_streak": cur_streak, "longest_streak": long_streak}},
        )

        return StatsResponse(
            xp=user_xp,
            level=user_level,
            total_points=user_xp,
            current_streak=cur_streak,
            longest_streak=long_streak,
            badges=user.get("badges", ["Beginner"]),
            shields=user.get("shields", 0),
            title=get_user_title(user_level),
            total_habits=await db.habits.count_documents(
                {"user_id": user["id"], "is_active": True}
            ),
            completed_today=await db.habit_completions.count_documents(
                {
                    "user_id": user["id"],
                    "completed_at": {"$gte": today_start.isoformat()},
                }
            ),
        )
    except Exception as e:
        print(f"❌ STATS CRASH ERROR: {str(e)}", flush=True)
        raise HTTPException(status_code=500, detail="Error fetching stats")


@api_router.get("/leaderboard")
async def leaderboard():
    """Returns top 10 users for the leaderboard."""
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


# --- ADMIN ROUTES ---


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
    # Auto-cleanup old logs > 10 days
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

    # Delete User and all associated data
    await db.users.delete_one({"id": uid})
    await db.habits.delete_many({"user_id": uid})
    await db.habit_completions.delete_many({"user_id": uid})

    return {"message": "Deleted"}


# --- HABIT CRUD ROUTES ---


@api_router.get("/habits", response_model=List[Habit])
async def get_habits(user: dict = Depends(get_current_user)):
    return await db.habits.find(
        {"user_id": user["id"], "is_active": True}, {"_id": 0}
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
        "is_measurable": data.is_measurable,
        "target_value": data.target_value,
        "starting_point": data.starting_point,
        "current_value": data.starting_point,  # Start at the starting point
        "unit": data.unit,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.habits.insert_one(habit)
    if "_id" in habit:
        del habit["_id"]
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


@api_router.patch("/habits/{hid}")
async def patch_habit(
    hid: str, update_data: HabitUpdate, user: dict = Depends(get_current_user)
):
    data = {k: v for k, v in update_data.dict().items() if v is not None}

    if data:
        await db.habits.update_one({"id": hid, "user_id": user["id"]}, {"$set": data})

    return {"status": "success"}


@api_router.delete("/habits/{hid}")
async def delete_habit(hid: str, user: dict = Depends(get_current_user)):
    await db.habits.update_one(
        {"id": hid, "user_id": user["id"]}, {"$set": {"is_active": False}}
    )
    return {"message": "Deleted"}


# --- COMPLETION ROUTES ---


@api_router.get("/habits/completions/today")
async def get_completions(user: dict = Depends(get_current_user)):
    """Used for Today's Progress Dots on Dashboard"""
    today = datetime.now(timezone.utc).isoformat()[:10]
    return await db.habit_completions.find(
        {"user_id": user["id"], "completed_at": {"$gte": today}}, {"_id": 0}
    ).to_list(1000)


@api_router.get("/habits/completions/weekly")
async def get_weekly_completions(user: dict = Depends(get_current_user)):
    """Used for Weekly Bar Chart on Dashboard"""
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    return await db.habit_completions.find(
        {"user_id": user["id"], "completed_at": {"$gte": seven_days_ago}}, {"_id": 0}
    ).to_list(1000)


@api_router.post("/habits/{hid}/complete")
async def complete_habit(hid: str, user: dict = Depends(get_current_user)):
    """
    Marks a habit as complete for today.
    Updates XP, Level, Streaks, and Badges.
    """
    today = datetime.now(timezone.utc).isoformat()[:10]

    # Check if already completed today
    if await db.habit_completions.find_one(
        {"habit_id": hid, "user_id": user["id"], "completed_at": {"$gte": today}}
    ):
        raise HTTPException(400, "Already completed")

    xp_reward = 20

    # Record Completion
    await db.habit_completions.insert_one(
        {
            "id": str(uuid.uuid4()),
            "habit_id": hid,
            "user_id": user["id"],
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "xp_earned": xp_reward,
        }
    )

    # Update User Stats
    new_xp = user.get("xp", 0) + xp_reward
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
        "xp_earned": xp_reward,
        "new_xp": new_xp,
        "new_level": calculate_level(new_xp),
    }


# --- SYSTEM STARTUP & MIDDLEWARE ---

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    # Allow local frontend ports
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """
    Initializes the Scheduler on startup.
    Uses 'cron' to align with wall-clock time for accurate notifications.
    """
    scheduler = AsyncIOScheduler()

    # Check every 10 seconds to ensure no minute is skipped
    scheduler.add_job(check_and_send_notifications, "cron", second="0")

    scheduler.start()
    print(
        "🚀 SYSTEM ONLINE: Scheduler set to 1-Minute Intervals (Fires at :00)",
        flush=True,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
