from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import base64
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Admin email
ADMIN_EMAIL = "creatorbennett@gmail.com"

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    username: Optional[str] = None
    picture: Optional[str] = None
    trade_points: int = 0
    rating: Optional[float] = None
    rating_count: int = 0
    is_admin: bool = False
    is_suspended: bool = False
    suspended_until: Optional[datetime] = None
    suspension_reason: Optional[str] = None
    portfolio: List[str] = []  # List of item_ids
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserUpdate(BaseModel):
    username: Optional[str] = None
    picture: Optional[str] = None

class Item(BaseModel):
    item_id: str = Field(default_factory=lambda: f"item_{uuid.uuid4().hex[:12]}")
    user_id: str
    title: str
    description: Optional[str] = None
    image: str
    category: str
    subcategory: Optional[str] = None
    bottom_category: Optional[str] = None
    is_available: bool = True
    boost_score: float = 0.0
    pin_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    image: str
    category: str
    subcategory: Optional[str] = None
    bottom_category: Optional[str] = None

class Category(BaseModel):
    name: str
    click_count: int = 0
    parent_category: Optional[str] = None  # For subcategories
    level: int = 0  # 0=main, 1=sub, 2=bottom

class Message(BaseModel):
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    sender_id: str
    receiver_id: str
    item_id: Optional[str] = None
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageCreate(BaseModel):
    receiver_id: str
    item_id: Optional[str] = None
    content: str

class Trade(BaseModel):
    trade_id: str = Field(default_factory=lambda: f"trade_{uuid.uuid4().hex[:12]}")
    item_id: str
    owner_id: str
    trader_id: str
    owner_confirmed: bool = False
    trader_confirmed: bool = False
    is_completed: bool = False
    owner_rating: Optional[int] = None
    trader_rating: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class TradeCreate(BaseModel):
    item_id: str
    owner_id: str

class RatingCreate(BaseModel):
    rating: int

class Report(BaseModel):
    report_id: str = Field(default_factory=lambda: f"report_{uuid.uuid4().hex[:12]}")
    reporter_id: str
    report_type: str  # "user", "item", "category"
    target_id: str  # user_id, item_id, or category name
    reason: str
    status: str = "pending"  # pending, reviewed, resolved
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReportCreate(BaseModel):
    report_type: str
    target_id: str
    reason: str

class Announcement(BaseModel):
    announcement_id: str = Field(default_factory=lambda: f"ann_{uuid.uuid4().hex[:12]}")
    message: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnnouncementCreate(BaseModel):
    message: str

class Pin(BaseModel):
    pin_id: str = Field(default_factory=lambda: f"pin_{uuid.uuid4().hex[:12]}")
    user_id: str
    item_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Settings(BaseModel):
    setting_id: str = "global_settings"
    max_portfolio_items: int = 7

class PortfolioUpdate(BaseModel):
    item_ids: List[str]

class SubcategoryCreate(BaseModel):
    name: str
    parent_category: Optional[str] = None

class SuspendUser(BaseModel):
    days: int  # Number of days to suspend (0 = unsuspend)
    reason: Optional[str] = None

class BulkDeleteItems(BaseModel):
    item_ids: List[str]

class BulkDeleteCategories(BaseModel):
    category_names: List[str]

class CategoryRequest(BaseModel):
    request_id: str = Field(default_factory=lambda: f"catreq_{uuid.uuid4().hex[:12]}")
    user_id: str
    category_name: str
    parent_category: Optional[str] = None
    reason: str
    status: str = "pending"  # pending, approved, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryRequestCreate(BaseModel):
    category_name: str
    parent_category: Optional[str] = None
    reason: str

class AdminCreateCategory(BaseModel):
    name: str
    parent_category: Optional[str] = None

class GlobalSearch(BaseModel):
    query: str
    search_type: Optional[str] = None  # users, items, categories, or None for all

# ============== AUTH HELPERS ==============

async def get_current_user(request: Request) -> User:
    """Get current user from session token in cookie or Authorization header"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Check if user is suspended
    if user.get("is_suspended"):
        suspended_until = user.get("suspended_until")
        if suspended_until:
            if isinstance(suspended_until, str):
                suspended_until = datetime.fromisoformat(suspended_until)
            if suspended_until.tzinfo is None:
                suspended_until = suspended_until.replace(tzinfo=timezone.utc)
            if suspended_until > datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=403, 
                    detail=f"Account suspended until {suspended_until.strftime('%Y-%m-%d %H:%M UTC')}. Reason: {user.get('suspension_reason', 'No reason provided')}"
                )
            else:
                # Suspension expired, auto-unsuspend
                await db.users.update_one(
                    {"user_id": user["user_id"]},
                    {"$set": {"is_suspended": False, "suspended_until": None, "suspension_reason": None}}
                )
                user["is_suspended"] = False
    
    return User(**user)

async def get_admin_user(request: Request) -> User:
    """Get current user and verify they are admin"""
    user = await get_current_user(request)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_optional_user(request: Request) -> Optional[User]:
    """Get current user if authenticated, otherwise return None"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ============== BOOSTING ALGORITHM ==============

def calculate_boost_score(pins: List[dict]) -> float:
    """
    Calculate boost score based on pins with time decay.
    
    Algorithm:
    - Each pin contributes: base_points / (1 + days_old * decay_rate)
    - base_points = 10 (each pin's initial value)
    - decay_rate = 0.1 (how fast pins lose value)
    
    This means:
    - A pin from today = 10 points
    - A pin from 10 days ago = 10 / (1 + 1) = 5 points
    - A pin from 30 days ago = 10 / (1 + 3) = 2.5 points
    
    Benefits:
    1. Recent engagement is rewarded more
    2. Consistent popularity over time still accumulates
    3. Old items don't stay boosted forever without new pins
    """
    BASE_POINTS = 10.0
    DECAY_RATE = 0.1
    
    total_score = 0.0
    now = datetime.now(timezone.utc)
    
    for pin in pins:
        pin_date = pin.get("created_at")
        if isinstance(pin_date, str):
            pin_date = datetime.fromisoformat(pin_date.replace('Z', '+00:00'))
        if pin_date.tzinfo is None:
            pin_date = pin_date.replace(tzinfo=timezone.utc)
        
        days_old = (now - pin_date).days
        decay_factor = 1 + (days_old * DECAY_RATE)
        pin_score = BASE_POINTS / decay_factor
        total_score += pin_score
    
    return round(total_score, 2)

async def update_item_boost(item_id: str):
    """Recalculate and update an item's boost score"""
    pins = await db.pins.find({"item_id": item_id}, {"_id": 0}).to_list(1000)
    boost_score = calculate_boost_score(pins)
    pin_count = len(pins)
    await db.items.update_one(
        {"item_id": item_id},
        {"$set": {"boost_score": boost_score, "pin_count": pin_count}}
    )
    return boost_score

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token and user data"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent auth API
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        auth_data = resp.json()
    
    # Check if admin
    is_admin = auth_data["email"].lower() == ADMIN_EMAIL.lower()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info if needed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": auth_data["name"],
                "picture": auth_data.get("picture"),
                "is_admin": is_admin
            }}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "username": None,
            "picture": auth_data.get("picture"),
            "trade_points": 0,
            "rating": None,
            "rating_count": 0,
            "is_admin": is_admin,
            "portfolio": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user.copy())
    
    # Create session
    session_token = auth_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc.copy())
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    # Get user data
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"user": user, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ============== USER ENDPOINTS ==============

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get user profile by ID"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.put("/users/profile")
async def update_profile(update: UserUpdate, user: User = Depends(get_current_user)):
    """Update current user's profile"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if "username" in update_data:
        # Validate username is single word
        username = update_data["username"].strip()
        if " " in username:
            raise HTTPException(status_code=400, detail="Username must be a single word")
        # Check if username is taken
        existing = await db.users.find_one({"username": username, "user_id": {"$ne": user.user_id}}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        update_data["username"] = username
    
    if update_data:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return updated_user

@api_router.delete("/users/account")
async def delete_account(user: User = Depends(get_current_user)):
    """Delete current user's account and all their data"""
    # Delete user's items
    await db.items.delete_many({"user_id": user.user_id})
    # Delete user's messages
    await db.messages.delete_many({"$or": [{"sender_id": user.user_id}, {"receiver_id": user.user_id}]})
    # Delete user's trades
    await db.trades.delete_many({"$or": [{"owner_id": user.user_id}, {"trader_id": user.user_id}]})
    # Delete user's pins
    await db.pins.delete_many({"user_id": user.user_id})
    # Delete user's sessions
    await db.user_sessions.delete_many({"user_id": user.user_id})
    # Delete user's reports
    await db.reports.delete_many({"reporter_id": user.user_id})
    # Delete user
    await db.users.delete_one({"user_id": user.user_id})
    
    return {"message": "Account deleted successfully"}

@api_router.put("/users/portfolio")
async def update_portfolio(portfolio: PortfolioUpdate, user: User = Depends(get_current_user)):
    """Update user's portfolio (ordered list of item_ids)"""
    # Get settings for max items
    settings = await db.settings.find_one({"setting_id": "global_settings"}, {"_id": 0})
    max_items = settings.get("max_portfolio_items", 7) if settings else 7
    
    if len(portfolio.item_ids) > max_items:
        raise HTTPException(status_code=400, detail=f"Portfolio can have at most {max_items} items")
    
    # Verify all items belong to user and exist
    for item_id in portfolio.item_ids:
        item = await db.items.find_one({"item_id": item_id, "user_id": user.user_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=400, detail=f"Item {item_id} not found or doesn't belong to you")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"portfolio": portfolio.item_ids}}
    )
    
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return updated_user

@api_router.get("/users/{user_id}/portfolio")
async def get_user_portfolio(user_id: str):
    """Get user's portfolio items ordered by boost score"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    portfolio_ids = user.get("portfolio", [])
    if not portfolio_ids:
        return []
    
    # Get items and sort by boost_score (descending)
    items = await db.items.find(
        {"item_id": {"$in": portfolio_ids}},
        {"_id": 0}
    ).to_list(100)
    
    # Sort by boost_score descending
    items.sort(key=lambda x: x.get("boost_score", 0), reverse=True)
    
    return items

# ============== ITEM ENDPOINTS ==============

@api_router.get("/items")
async def get_items(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    bottom_category: Optional[str] = None,
    user_id: Optional[str] = None
):
    """Get all available items, optionally filtered by category or user, sorted by boost"""
    query = {"is_available": True}
    if category:
        query["category"] = category
        # Increment category click count
        await db.categories.update_one(
            {"name": category},
            {"$inc": {"click_count": 1}},
            upsert=True
        )
    if subcategory:
        query["subcategory"] = subcategory
    if bottom_category:
        query["bottom_category"] = bottom_category
    if user_id:
        query["user_id"] = user_id
    
    # Sort by boost_score descending, then by created_at descending
    items = await db.items.find(query, {"_id": 0}).sort([("boost_score", -1), ("created_at", -1)]).to_list(100)
    
    # Convert datetime strings if needed
    for item in items:
        if isinstance(item.get("created_at"), str):
            item["created_at"] = datetime.fromisoformat(item["created_at"])
    
    return items

@api_router.get("/items/{item_id}")
async def get_item(item_id: str):
    """Get item by ID"""
    item = await db.items.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Get owner info
    owner = await db.users.find_one({"user_id": item["user_id"]}, {"_id": 0})
    
    return {"item": item, "owner": owner}

@api_router.post("/items")
async def create_item(item_data: ItemCreate, user: User = Depends(get_current_user)):
    """Create a new item for trade"""
    # Validate category exists
    category = item_data.category.strip().lower()
    existing_cat = await db.categories.find_one({"name": category, "level": 0}, {"_id": 0})
    if not existing_cat:
        raise HTTPException(status_code=400, detail="Category does not exist. Please select from available categories or request a new one.")
    
    # Validate subcategory if provided
    subcategory = None
    if item_data.subcategory:
        subcategory = item_data.subcategory.strip().lower()
        existing_sub = await db.categories.find_one({"name": subcategory, "parent_category": category, "level": 1}, {"_id": 0})
        if not existing_sub:
            raise HTTPException(status_code=400, detail="Subcategory does not exist under this category.")
    
    # Validate bottom_category if provided
    bottom_category = None
    if item_data.bottom_category and subcategory:
        bottom_category = item_data.bottom_category.strip().lower()
        existing_bottom = await db.categories.find_one({"name": bottom_category, "parent_category": subcategory, "level": 2}, {"_id": 0})
        if not existing_bottom:
            raise HTTPException(status_code=400, detail="Bottom category does not exist under this subcategory.")
    
    item = Item(
        user_id=user.user_id,
        title=item_data.title,
        description=item_data.description,
        image=item_data.image,
        category=category,
        subcategory=subcategory,
        bottom_category=bottom_category
    )
    
    item_dict = item.model_dump()
    item_dict["created_at"] = item_dict["created_at"].isoformat()
    
    # Create a copy for insertion to avoid _id contamination
    insert_dict = item_dict.copy()
    await db.items.insert_one(insert_dict)
    
    # Increment category click count
    await db.categories.update_one({"name": category}, {"$inc": {"click_count": 1}})
    
    return item_dict

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, user: User = Depends(get_current_user)):
    """Delete an item (only owner can delete)"""
    item = await db.items.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item["user_id"] != user.user_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Remove from portfolio if present
    await db.users.update_one(
        {"user_id": item["user_id"]},
        {"$pull": {"portfolio": item_id}}
    )
    
    # Delete pins for this item
    await db.pins.delete_many({"item_id": item_id})
    
    await db.items.delete_one({"item_id": item_id})
    return {"message": "Item deleted"}

@api_router.get("/my-items")
async def get_my_items(user: User = Depends(get_current_user)):
    """Get current user's items"""
    items = await db.items.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items

# ============== PIN ENDPOINTS ==============

@api_router.post("/items/{item_id}/pin")
async def pin_item(item_id: str, user: User = Depends(get_current_user)):
    """Pin an item to boost it"""
    item = await db.items.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if already pinned by this user
    existing_pin = await db.pins.find_one({"user_id": user.user_id, "item_id": item_id}, {"_id": 0})
    if existing_pin:
        raise HTTPException(status_code=400, detail="Already pinned this item")
    
    # Create pin
    pin = Pin(user_id=user.user_id, item_id=item_id)
    pin_dict = pin.model_dump()
    pin_dict["created_at"] = pin_dict["created_at"].isoformat()
    
    insert_dict = pin_dict.copy()
    await db.pins.insert_one(insert_dict)
    
    # Update item boost score
    new_score = await update_item_boost(item_id)
    
    return {"message": "Item pinned", "new_boost_score": new_score}

@api_router.delete("/items/{item_id}/pin")
async def unpin_item(item_id: str, user: User = Depends(get_current_user)):
    """Unpin an item"""
    result = await db.pins.delete_one({"user_id": user.user_id, "item_id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pin not found")
    
    # Update item boost score
    new_score = await update_item_boost(item_id)
    
    return {"message": "Item unpinned", "new_boost_score": new_score}

@api_router.get("/items/{item_id}/pin-status")
async def get_pin_status(item_id: str, user: User = Depends(get_current_user)):
    """Check if current user has pinned this item"""
    pin = await db.pins.find_one({"user_id": user.user_id, "item_id": item_id}, {"_id": 0})
    return {"is_pinned": pin is not None}

# ============== CATEGORY ENDPOINTS ==============

@api_router.get("/categories")
async def get_categories(level: Optional[int] = None, parent: Optional[str] = None):
    """Get all categories sorted by click count (most popular first)"""
    query = {}
    if level is not None:
        query["level"] = level
    if parent:
        query["parent_category"] = parent
    
    categories = await db.categories.find(query, {"_id": 0}).sort("click_count", -1).to_list(50)
    return categories

# ============== CATEGORY REQUEST ENDPOINTS ==============

@api_router.post("/category-requests")
async def create_category_request(data: CategoryRequestCreate, user: User = Depends(get_current_user)):
    """Submit a request for a new category"""
    name = data.category_name.strip().lower()
    if " " in name:
        raise HTTPException(status_code=400, detail="Category name must be a single word")
    
    # Check if category already exists
    existing = await db.categories.find_one({"name": name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    # Check if request already pending
    pending = await db.category_requests.find_one({
        "category_name": name,
        "status": "pending"
    }, {"_id": 0})
    if pending:
        raise HTTPException(status_code=400, detail="A request for this category is already pending")
    
    request = CategoryRequest(
        user_id=user.user_id,
        category_name=name,
        parent_category=data.parent_category.strip().lower() if data.parent_category else None,
        reason=data.reason
    )
    
    request_dict = request.model_dump()
    request_dict["created_at"] = request_dict["created_at"].isoformat()
    
    insert_dict = request_dict.copy()
    await db.category_requests.insert_one(insert_dict)
    
    return {"message": "Category request submitted", "request_id": request.request_id}

@api_router.get("/category-requests/mine")
async def get_my_category_requests(user: User = Depends(get_current_user)):
    """Get current user's category requests"""
    requests = await db.category_requests.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return requests

@api_router.get("/admin/category-requests")
async def admin_get_category_requests(status: Optional[str] = None, admin: User = Depends(get_admin_user)):
    """Get all category requests (admin only)"""
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.category_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with user info
    result = []
    for req in requests:
        user = await db.users.find_one({"user_id": req["user_id"]}, {"_id": 0, "user_id": 1, "name": 1, "username": 1})
        result.append({"request": req, "user": user})
    
    return result

@api_router.post("/admin/category-requests/{request_id}/approve")
async def admin_approve_category_request(request_id: str, admin: User = Depends(get_admin_user)):
    """Approve a category request and create the category (admin only)"""
    req = await db.category_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Determine level
    level = 0
    parent = req.get("parent_category")
    if parent:
        parent_cat = await db.categories.find_one({"name": parent}, {"_id": 0})
        if parent_cat:
            level = parent_cat.get("level", 0) + 1
    
    # Create the category
    await db.categories.update_one(
        {"name": req["category_name"]},
        {"$setOnInsert": {
            "name": req["category_name"],
            "click_count": 0,
            "parent_category": parent,
            "level": level
        }},
        upsert=True
    )
    
    # Update request status
    await db.category_requests.update_one(
        {"request_id": request_id},
        {"$set": {"status": "approved"}}
    )
    
    return {"message": "Category request approved and category created"}

@api_router.post("/admin/category-requests/{request_id}/reject")
async def admin_reject_category_request(request_id: str, admin: User = Depends(get_admin_user)):
    """Reject a category request (admin only)"""
    result = await db.category_requests.update_one(
        {"request_id": request_id, "status": "pending"},
        {"$set": {"status": "rejected"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found or already processed")
    
    return {"message": "Category request rejected"}

@api_router.post("/admin/categories")
async def admin_create_category(data: AdminCreateCategory, admin: User = Depends(get_admin_user)):
    """Create a new category (admin only)"""
    name = data.name.strip().lower()
    if " " in name:
        raise HTTPException(status_code=400, detail="Category name must be a single word")
    
    # Check if exists
    existing = await db.categories.find_one({"name": name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    # Determine level
    level = 0
    parent = None
    if data.parent_category:
        parent = data.parent_category.strip().lower()
        parent_cat = await db.categories.find_one({"name": parent}, {"_id": 0})
        if not parent_cat:
            raise HTTPException(status_code=404, detail="Parent category not found")
        level = parent_cat.get("level", 0) + 1
        if level > 2:
            raise HTTPException(status_code=400, detail="Cannot create category deeper than 3 levels")
    
    await db.categories.insert_one({
        "name": name,
        "click_count": 0,
        "parent_category": parent,
        "level": level
    })
    
    return {"name": name, "parent_category": parent, "level": level}

# ============== GLOBAL SEARCH ENDPOINT ==============

@api_router.get("/search")
async def global_search(q: str, type: Optional[str] = None, user: User = Depends(get_current_user)):
    """Search across users, items, and categories"""
    results = {
        "users": [],
        "items": [],
        "categories": []
    }
    
    if not q or len(q) < 2:
        return results
    
    # Search users
    if type is None or type == "users":
        users = await db.users.find({
            "$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"username": {"$regex": q, "$options": "i"}}
            ]
        }, {"_id": 0, "email": 0}).limit(10).to_list(10)
        results["users"] = users
    
    # Search items
    if type is None or type == "items":
        items = await db.items.find({
            "is_available": True,
            "$or": [
                {"title": {"$regex": q, "$options": "i"}},
                {"description": {"$regex": q, "$options": "i"}},
                {"category": {"$regex": q, "$options": "i"}}
            ]
        }, {"_id": 0}).limit(20).to_list(20)
        results["items"] = items
    
    # Search categories
    if type is None or type == "categories":
        categories = await db.categories.find({
            "name": {"$regex": q, "$options": "i"}
        }, {"_id": 0}).limit(10).to_list(10)
        results["categories"] = categories
    
    return results

# ============== MESSAGE ENDPOINTS ==============

@api_router.get("/conversations")
async def get_conversations(user: User = Depends(get_current_user)):
    """Get all conversations for current user"""
    # Find unique conversation partners
    pipeline = [
        {"$match": {"$or": [{"sender_id": user.user_id}, {"receiver_id": user.user_id}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": {
                "$cond": [
                    {"$eq": ["$sender_id", user.user_id]},
                    "$receiver_id",
                    "$sender_id"
                ]
            },
            "last_message": {"$first": "$content"},
            "last_message_time": {"$first": "$created_at"},
            "item_id": {"$first": "$item_id"}
        }},
        {"$sort": {"last_message_time": -1}}
    ]
    
    conversations = await db.messages.aggregate(pipeline).to_list(50)
    
    # Get user info for each conversation
    result = []
    for conv in conversations:
        partner = await db.users.find_one({"user_id": conv["_id"]}, {"_id": 0})
        if partner:
            result.append({
                "partner": partner,
                "last_message": conv["last_message"],
                "last_message_time": conv["last_message_time"],
                "item_id": conv.get("item_id")
            })
    
    return result

@api_router.get("/messages/{partner_id}")
async def get_messages(partner_id: str, user: User = Depends(get_current_user)):
    """Get messages with a specific user"""
    messages = await db.messages.find({
        "$or": [
            {"sender_id": user.user_id, "receiver_id": partner_id},
            {"sender_id": partner_id, "receiver_id": user.user_id}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    return messages

@api_router.post("/messages")
async def send_message(msg: MessageCreate, user: User = Depends(get_current_user)):
    """Send a message to another user"""
    message = Message(
        sender_id=user.user_id,
        receiver_id=msg.receiver_id,
        item_id=msg.item_id,
        content=msg.content
    )
    
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    
    # Create a copy for insertion to avoid _id contamination
    insert_dict = msg_dict.copy()
    await db.messages.insert_one(insert_dict)
    return msg_dict

# ============== TRADE ENDPOINTS ==============

@api_router.post("/trades")
async def create_trade(trade_data: TradeCreate, user: User = Depends(get_current_user)):
    """Initiate a trade for an item"""
    # Check if item exists and is available
    item = await db.items.find_one({"item_id": trade_data.item_id, "is_available": True}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or not available")
    
    # Can't trade with yourself
    if item["user_id"] == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot trade with yourself")
    
    # Check if trade already exists
    existing_trade = await db.trades.find_one({
        "item_id": trade_data.item_id,
        "trader_id": user.user_id,
        "is_completed": False
    }, {"_id": 0})
    
    if existing_trade:
        return existing_trade
    
    trade = Trade(
        item_id=trade_data.item_id,
        owner_id=item["user_id"],
        trader_id=user.user_id
    )
    
    trade_dict = trade.model_dump()
    trade_dict["created_at"] = trade_dict["created_at"].isoformat()
    
    # Create a copy for insertion to avoid _id contamination
    insert_dict = trade_dict.copy()
    await db.trades.insert_one(insert_dict)
    return trade_dict

@api_router.get("/trades")
async def get_my_trades(user: User = Depends(get_current_user)):
    """Get all trades for current user"""
    trades = await db.trades.find({
        "$or": [{"owner_id": user.user_id}, {"trader_id": user.user_id}]
    }, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Enrich with item and user data
    result = []
    for trade in trades:
        item = await db.items.find_one({"item_id": trade["item_id"]}, {"_id": 0})
        owner = await db.users.find_one({"user_id": trade["owner_id"]}, {"_id": 0})
        trader = await db.users.find_one({"user_id": trade["trader_id"]}, {"_id": 0})
        result.append({
            "trade": trade,
            "item": item,
            "owner": owner,
            "trader": trader
        })
    
    return result

@api_router.get("/trades/{trade_id}")
async def get_trade(trade_id: str, user: User = Depends(get_current_user)):
    """Get trade details"""
    trade = await db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    # Only participants can view
    if trade["owner_id"] != user.user_id and trade["trader_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    item = await db.items.find_one({"item_id": trade["item_id"]}, {"_id": 0})
    owner = await db.users.find_one({"user_id": trade["owner_id"]}, {"_id": 0})
    trader = await db.users.find_one({"user_id": trade["trader_id"]}, {"_id": 0})
    
    return {"trade": trade, "item": item, "owner": owner, "trader": trader}

@api_router.post("/trades/{trade_id}/confirm")
async def confirm_trade(trade_id: str, user: User = Depends(get_current_user)):
    """Confirm trade completion (both parties must confirm)"""
    trade = await db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    if trade["is_completed"]:
        raise HTTPException(status_code=400, detail="Trade already completed")
    
    # Determine which party is confirming
    update_field = None
    if trade["owner_id"] == user.user_id:
        update_field = "owner_confirmed"
    elif trade["trader_id"] == user.user_id:
        update_field = "trader_confirmed"
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update confirmation
    await db.trades.update_one(
        {"trade_id": trade_id},
        {"$set": {update_field: True}}
    )
    
    # Check if both confirmed
    updated_trade = await db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
    
    if updated_trade["owner_confirmed"] and updated_trade["trader_confirmed"]:
        # Complete the trade
        await db.trades.update_one(
            {"trade_id": trade_id},
            {"$set": {
                "is_completed": True,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Mark item as unavailable
        await db.items.update_one(
            {"item_id": trade["item_id"]},
            {"$set": {"is_available": False}}
        )
        
        # Award trade points to both users
        await db.users.update_one({"user_id": trade["owner_id"]}, {"$inc": {"trade_points": 1}})
        await db.users.update_one({"user_id": trade["trader_id"]}, {"$inc": {"trade_points": 1}})
        
        updated_trade = await db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
    
    return updated_trade

@api_router.post("/trades/{trade_id}/rate")
async def rate_trade(trade_id: str, rating_data: RatingCreate, user: User = Depends(get_current_user)):
    """Rate the other party after a completed trade"""
    trade = await db.trades.find_one({"trade_id": trade_id}, {"_id": 0})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    
    if not trade["is_completed"]:
        raise HTTPException(status_code=400, detail="Trade not completed yet")
    
    if rating_data.rating < 1 or rating_data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # Determine who is rating whom
    rating_field = None
    rated_user_id = None
    
    if trade["owner_id"] == user.user_id:
        if trade.get("owner_rating") is not None:
            raise HTTPException(status_code=400, detail="Already rated")
        rating_field = "owner_rating"
        rated_user_id = trade["trader_id"]
    elif trade["trader_id"] == user.user_id:
        if trade.get("trader_rating") is not None:
            raise HTTPException(status_code=400, detail="Already rated")
        rating_field = "trader_rating"
        rated_user_id = trade["owner_id"]
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Save rating in trade
    await db.trades.update_one(
        {"trade_id": trade_id},
        {"$set": {rating_field: rating_data.rating}}
    )
    
    # Update user's average rating
    rated_user = await db.users.find_one({"user_id": rated_user_id}, {"_id": 0})
    current_rating = rated_user.get("rating") or 0
    rating_count = rated_user.get("rating_count", 0)
    
    new_rating_count = rating_count + 1
    new_rating = ((current_rating * rating_count) + rating_data.rating) / new_rating_count
    
    await db.users.update_one(
        {"user_id": rated_user_id},
        {"$set": {"rating": round(new_rating, 1), "rating_count": new_rating_count}}
    )
    
    return {"message": "Rating submitted", "rating": rating_data.rating}

# ============== REPORT ENDPOINTS ==============

@api_router.post("/reports")
async def create_report(report_data: ReportCreate, user: User = Depends(get_current_user)):
    """Create a report for user, item, or category"""
    if report_data.report_type not in ["user", "item", "category"]:
        raise HTTPException(status_code=400, detail="Invalid report type")
    
    report = Report(
        reporter_id=user.user_id,
        report_type=report_data.report_type,
        target_id=report_data.target_id,
        reason=report_data.reason
    )
    
    report_dict = report.model_dump()
    report_dict["created_at"] = report_dict["created_at"].isoformat()
    
    insert_dict = report_dict.copy()
    await db.reports.insert_one(insert_dict)
    
    return {"message": "Report submitted", "report_id": report.report_id}

@api_router.get("/admin/reports")
async def get_reports(status: Optional[str] = None, admin: User = Depends(get_admin_user)):
    """Get all reports (admin only)"""
    query = {}
    if status:
        query["status"] = status
    
    reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with reporter info
    result = []
    for report in reports:
        reporter = await db.users.find_one({"user_id": report["reporter_id"]}, {"_id": 0})
        result.append({
            "report": report,
            "reporter": reporter
        })
    
    return result

@api_router.put("/admin/reports/{report_id}")
async def update_report(report_id: str, status: str, admin: User = Depends(get_admin_user)):
    """Update report status (admin only)"""
    if status not in ["pending", "reviewed", "resolved"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.reports.update_one(
        {"report_id": report_id},
        {"$set": {"status": status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"message": "Report updated"}

# ============== ADMIN ENDPOINTS ==============

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: User = Depends(get_admin_user)):
    """Delete a user (admin only)"""
    if user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete user's items
    await db.items.delete_many({"user_id": user_id})
    # Delete user's messages
    await db.messages.delete_many({"$or": [{"sender_id": user_id}, {"receiver_id": user_id}]})
    # Delete user's trades
    await db.trades.delete_many({"$or": [{"owner_id": user_id}, {"trader_id": user_id}]})
    # Delete user's pins
    await db.pins.delete_many({"user_id": user_id})
    # Delete user's sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    # Delete user
    await db.users.delete_one({"user_id": user_id})
    
    return {"message": "User deleted"}

@api_router.delete("/admin/items/{item_id}")
async def admin_delete_item(item_id: str, admin: User = Depends(get_admin_user)):
    """Delete any item (admin only)"""
    item = await db.items.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Remove from portfolio if present
    await db.users.update_one(
        {"user_id": item["user_id"]},
        {"$pull": {"portfolio": item_id}}
    )
    
    # Delete pins for this item
    await db.pins.delete_many({"item_id": item_id})
    
    await db.items.delete_one({"item_id": item_id})
    return {"message": "Item deleted"}

@api_router.delete("/admin/categories/{category_name}")
async def admin_delete_category(category_name: str, admin: User = Depends(get_admin_user)):
    """Delete a category (admin only)"""
    result = await db.categories.delete_one({"name": category_name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Also delete child categories
    await db.categories.delete_many({"parent_category": category_name})
    
    return {"message": "Category deleted"}

# ============== ADMIN MANAGEMENT ENDPOINTS ==============

@api_router.get("/admin/users")
async def admin_list_users(
    search: Optional[str] = None,
    suspended_only: bool = False,
    admin: User = Depends(get_admin_user)
):
    """List all users with optional search (admin only)"""
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}}
        ]
    if suspended_only:
        query["is_suspended"] = True
    
    users = await db.users.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return users

@api_router.get("/admin/items")
async def admin_list_items(
    search: Optional[str] = None,
    category: Optional[str] = None,
    admin: User = Depends(get_admin_user)
):
    """List all items with optional search (admin only)"""
    query = {}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if category:
        query["category"] = category
    
    items = await db.items.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Add owner info
    result = []
    for item in items:
        owner = await db.users.find_one({"user_id": item["user_id"]}, {"_id": 0, "user_id": 1, "name": 1, "username": 1, "email": 1})
        result.append({"item": item, "owner": owner})
    
    return result

@api_router.get("/admin/categories")
async def admin_list_categories(admin: User = Depends(get_admin_user)):
    """List all categories grouped by level (admin only)"""
    categories = await db.categories.find({}, {"_id": 0}).sort([("level", 1), ("click_count", -1)]).to_list(200)
    
    # Group by level
    grouped = {
        "main": [c for c in categories if c.get("level", 0) == 0],
        "sub": [c for c in categories if c.get("level") == 1],
        "bottom": [c for c in categories if c.get("level") == 2]
    }
    
    return grouped

@api_router.post("/admin/users/{user_id}/suspend")
async def admin_suspend_user(user_id: str, data: SuspendUser, admin: User = Depends(get_admin_user)):
    """Suspend or unsuspend a user (admin only)"""
    if user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="Cannot suspend yourself")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("is_admin"):
        raise HTTPException(status_code=400, detail="Cannot suspend another admin")
    
    if data.days <= 0:
        # Unsuspend
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "is_suspended": False,
                "suspended_until": None,
                "suspension_reason": None
            }}
        )
        return {"message": "User unsuspended"}
    else:
        # Suspend
        suspended_until = datetime.now(timezone.utc) + timedelta(days=data.days)
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "is_suspended": True,
                "suspended_until": suspended_until.isoformat(),
                "suspension_reason": data.reason or f"Suspended for {data.days} days"
            }}
        )
        # Also invalidate their sessions
        await db.user_sessions.delete_many({"user_id": user_id})
        return {"message": f"User suspended until {suspended_until.strftime('%Y-%m-%d %H:%M UTC')}"}

@api_router.post("/admin/items/bulk-delete")
async def admin_bulk_delete_items(data: BulkDeleteItems, admin: User = Depends(get_admin_user)):
    """Delete multiple items at once (admin only)"""
    deleted_count = 0
    for item_id in data.item_ids:
        item = await db.items.find_one({"item_id": item_id}, {"_id": 0})
        if item:
            # Remove from portfolio if present
            await db.users.update_one(
                {"user_id": item["user_id"]},
                {"$pull": {"portfolio": item_id}}
            )
            # Delete pins
            await db.pins.delete_many({"item_id": item_id})
            # Delete item
            await db.items.delete_one({"item_id": item_id})
            deleted_count += 1
    
    return {"message": f"Deleted {deleted_count} items"}

@api_router.post("/admin/categories/bulk-delete")
async def admin_bulk_delete_categories(data: BulkDeleteCategories, admin: User = Depends(get_admin_user)):
    """Delete multiple categories at once (admin only)"""
    deleted_count = 0
    for name in data.category_names:
        result = await db.categories.delete_one({"name": name})
        if result.deleted_count > 0:
            # Also delete child categories
            await db.categories.delete_many({"parent_category": name})
            deleted_count += 1
    
    return {"message": f"Deleted {deleted_count} categories"}

@api_router.get("/admin/stats")
async def admin_get_stats(admin: User = Depends(get_admin_user)):
    """Get platform statistics (admin only)"""
    total_users = await db.users.count_documents({})
    suspended_users = await db.users.count_documents({"is_suspended": True})
    total_items = await db.items.count_documents({})
    available_items = await db.items.count_documents({"is_available": True})
    total_trades = await db.trades.count_documents({})
    completed_trades = await db.trades.count_documents({"is_completed": True})
    pending_reports = await db.reports.count_documents({"status": "pending"})
    total_categories = await db.categories.count_documents({})
    
    return {
        "users": {"total": total_users, "suspended": suspended_users},
        "items": {"total": total_items, "available": available_items},
        "trades": {"total": total_trades, "completed": completed_trades},
        "reports": {"pending": pending_reports},
        "categories": {"total": total_categories}
    }

# ============== ANNOUNCEMENT ENDPOINTS ==============

@api_router.get("/announcements")
async def get_announcements():
    """Get active announcements"""
    announcements = await db.announcements.find({"is_active": True}, {"_id": 0}).sort("created_at", -1).to_list(10)
    return announcements

@api_router.post("/admin/announcements")
async def create_announcement(data: AnnouncementCreate, admin: User = Depends(get_admin_user)):
    """Create an announcement (admin only)"""
    announcement = Announcement(message=data.message)
    ann_dict = announcement.model_dump()
    ann_dict["created_at"] = ann_dict["created_at"].isoformat()
    
    insert_dict = ann_dict.copy()
    await db.announcements.insert_one(insert_dict)
    
    return ann_dict

@api_router.put("/admin/announcements/{announcement_id}")
async def toggle_announcement(announcement_id: str, is_active: bool, admin: User = Depends(get_admin_user)):
    """Toggle announcement active status (admin only)"""
    result = await db.announcements.update_one(
        {"announcement_id": announcement_id},
        {"$set": {"is_active": is_active}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    return {"message": "Announcement updated"}

@api_router.delete("/admin/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, admin: User = Depends(get_admin_user)):
    """Delete an announcement (admin only)"""
    result = await db.announcements.delete_one({"announcement_id": announcement_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    return {"message": "Announcement deleted"}

# ============== SETTINGS ENDPOINTS ==============

@api_router.get("/settings")
async def get_settings():
    """Get global settings"""
    settings = await db.settings.find_one({"setting_id": "global_settings"}, {"_id": 0})
    if not settings:
        return {"setting_id": "global_settings", "max_portfolio_items": 7}
    return settings

@api_router.put("/admin/settings")
async def update_settings(max_portfolio_items: int, admin: User = Depends(get_admin_user)):
    """Update global settings (admin only)"""
    if max_portfolio_items < 1 or max_portfolio_items > 50:
        raise HTTPException(status_code=400, detail="Max portfolio items must be between 1 and 50")
    
    await db.settings.update_one(
        {"setting_id": "global_settings"},
        {"$set": {"max_portfolio_items": max_portfolio_items}},
        upsert=True
    )
    
    return {"message": "Settings updated", "max_portfolio_items": max_portfolio_items}

# ============== FILE UPLOAD ==============

@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    """Upload an image and return base64 data URL"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    base64_data = base64.b64encode(contents).decode("utf-8")
    data_url = f"data:{file.content_type};base64,{base64_data}"
    
    return {"image_url": data_url}

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "SwapFlow API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
