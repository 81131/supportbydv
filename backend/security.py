import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from database import get_db
from models.user import User, UserRole
from models.monetization import UserSubscription, SubscriptionTier

SECRET_KEY = os.environ["SECRET_KEY"] # Throw error if missing
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 180
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    deprecated=["bcrypt"],  # existing bcrypt hashes still verify; new ones use argon2
)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# This tells FastAPI where clients should look to authenticate
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):
    # Read the token from the 'access_token' cookie
    token = request.cookies.get("access_token")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="To trespass, a man should have an account.", 
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = (await db.execute(select(User).filter(User.id == int(user_id)))).scalars().first()
    if user is None:
        raise credentials_exception
        
    return user

async def get_current_user_optional(request: Request, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return (await db.execute(select(User).filter(User.id == int(user_id)))).scalars().first()
    except JWTError:
        return None

def verify_csrf(request: Request):
    """
    Ensures the CSRF token in the header matches the one in the cookie.
    Only required for state-changing methods (POST, PUT, DELETE).
    """
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        csrf_cookie = request.cookies.get("csrftoken")
        csrf_header = request.headers.get("X-CSRF-Token")
        
        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF validation failed. The archives remain sealed."
            )

def require_noOne(user: User = Depends(get_current_user)):
    """Throws 403 if the user is not a noOne."""
    if user.role != UserRole.NO_ONE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only No One can forge the truth."
        )
    return user

async def require_premium_access(user: User, db: AsyncSession, module_id: int = None, semester_key: str = None):
    """
    Checks if a user is permitted to view premium content associated with a specific module or semester.
    Returns True if allowed, or raises 403.
    """
    # 1. Super users bypass all restrictions
    if user.role in [UserRole.NO_ONE, UserRole.ADMIN, UserRole.FACELESS]:
        return True
    
    # 2. Check active subscriptions
    now = datetime.utcnow()
    active_subs = (await db.execute(select(UserSubscription).filter(
        UserSubscription.user_id == user.id,
        UserSubscription.is_active == True,
        UserSubscription.expiry_date > now
    ))).scalars().all()
    
    for sub in active_subs:
        if sub.tier == SubscriptionTier.ADVANCED:
            return True
        if sub.tier == SubscriptionTier.INTERMEDIATE and sub.semester_key == semester_key:
            return True
        if sub.tier == SubscriptionTier.BEGINNER and sub.module_id == module_id:
            return True
            
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="The Citadel demands greater sacrifice. Upgrade your tier to view this content."
    )