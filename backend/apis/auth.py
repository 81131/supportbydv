import os
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from google.oauth2 import id_token
from google.auth.transport import requests
from database import get_db
from models.user import User, UserRole
from security import create_access_token, get_password_hash, verify_password  
from pydantic import BaseModel
from schemas.user import TokenPayload, UserResponse, UserRegister, UserLogin

router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("VITE_GOOGLE_CLIENT_ID")
SUPER_ADMIN_EMAIL = os.environ["SUPER_ADMIN_EMAIL"]

class AuthResponse(BaseModel):
    user: UserResponse

@router.post("/google", response_model=AuthResponse)
def google_auth(
    payload: TokenPayload, 
    response: Response, 
    db: Session = Depends(get_db)):
    try:
        # 1. Verify Google's token
        id_info = id_token.verify_oauth2_token(
            payload.token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        email = id_info.get("email")
        first_name = id_info.get("given_name", "")
        last_name = id_info.get("family_name", "")
        picture = id_info.get("picture", "") 

        # 2. Find or create the user
        user = db.query(User).filter(User.email == email).first()

        if user:
            # --- 🛡️ NEW GOVERNANCE LOGIC ---
            if getattr(user, 'is_suspended', False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Your access to the Citadel has been revoked by the Maesters."
                )
            
            # Auto-upgrade you to NO_ONE if you were already in the DB
            if user.email == SUPER_ADMIN_EMAIL and user.role != UserRole.NO_ONE:
                user.role = UserRole.NO_ONE
                
            # Auto-migrate any other old "STUDENT" roles to the new "USER" role
            elif user.role == UserRole.STUDENT:
                user.role = UserRole.USER
                
            # Track online presence
            user.last_active_at = func.now()

        else:
            # --- 🎭 NEW ROLE ASSIGNMENT ---
            assigned_role = UserRole.NO_ONE if email == SUPER_ADMIN_EMAIL else UserRole.USER
            
            user = User(
                email=email,
                first_name=first_name,
                last_name=last_name,
                picture=picture,
                # auth_provider="google", # Uncomment if this column exists in your actual DB model
                role=assigned_role
            )
            db.add(user)
            
        db.commit()
        db.refresh(user)

        # 3. Generate internal JWT
        access_token = create_access_token(data={
            "sub": str(user.id),
            "role": user.role.value if hasattr(user.role, 'value') else str(user.role) # 👈 Prevents string/enum crashes
        })      
        
        # 4. Set the HttpOnly Cookie (Auth)
        is_secure = os.getenv("APP_ENV") == "production"
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            samesite="lax",
            secure=is_secure, # Set to True when you host with HTTPS
            max_age=604800 # 7 days
        )
        
        # 5. Set the CSRF Cookie (Not HttpOnly so React can read it)
        csrf_token = secrets.token_hex(32)
        response.set_cookie(
            key="csrftoken",
            value=csrf_token,
            httponly=False, 
            samesite="lax",
            secure=is_secure,
            max_age=604800
        )

        return {"user": user}

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="To trespass, a man should have an account.",
        )

@router.post("/register", response_model=AuthResponse)
def local_register(
    payload: UserRegister, 
    response: Response, 
    db: Session = Depends(get_db)
):
    try:
        user = db.query(User).filter(User.email == payload.email).first()
        if user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="A man with this email is already known to the House."
            )

        # Ensure SUPER_ADMIN_EMAIL exists in environment to avoid 500
        super_admin = os.getenv("SUPER_ADMIN_EMAIL", "admin@example.com")
        assigned_role = UserRole.NO_ONE if payload.email == super_admin else UserRole.USER
        
        new_user = User(
            email=payload.email,
            first_name=payload.first_name,
            last_name=payload.last_name,
            hashed_password=get_password_hash(payload.password),
            role=assigned_role,
            auth_provider="local"
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        access_token = create_access_token(data={
            "sub": str(new_user.id),
            "role": new_user.role.value if hasattr(new_user.role, 'value') else str(new_user.role)
        })      
        
        is_secure = os.getenv("APP_ENV") == "production"
        
        response.set_cookie(
            key="access_token", 
            value=access_token, 
            httponly=True, 
            samesite="lax", 
            secure=is_secure, 
            max_age=604800
        )
        
        csrf_token = secrets.token_hex(32)
        response.set_cookie(
            key="csrftoken", 
            value=csrf_token, 
            httponly=False, 
            samesite="lax", 
            secure=is_secure, 
            max_age=604800
        )

        return {"user": new_user}
    except Exception as e:
        # Log the error if possible, but definitely return a JSON error instead of crashing
        print(f"Registration Error: {str(e)}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"The Citadel's register is currently locked: {str(e)}")

@router.post("/login", response_model=AuthResponse)
def local_login(
    payload: UserLogin, 
    response: Response, 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Incorrect credentials. A man must speak the truth."
        )

    if getattr(user, 'is_suspended', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Your access to the Citadel has been revoked by the Maesters."
        )

    user.last_active_at = func.now()
    db.commit()

    access_token = create_access_token(data={
        "sub": str(user.id),
        "role": user.role.value if hasattr(user.role, 'value') else str(user.role)
    })      
    
    is_secure = os.getenv("APP_ENV") == "production"
    response.set_cookie(key="access_token", value=access_token, httponly=True, samesite="lax", secure=is_secure, max_age=604800)
    csrf_token = secrets.token_hex(32)
    response.set_cookie(key="csrftoken", value=csrf_token, httponly=False, samesite="lax", secure=is_secure, max_age=604800)

    return {"user": user}

@router.post("/logout")
def logout(response: Response):
    """
    Clears the authentication and CSRF cookies to end the session.
    """
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        samesite="lax"
    )
    response.delete_cookie(
        key="csrftoken",
        path="/",
        httponly=False,
        samesite="lax"
    )
    return {"message": "You have left the Citadel. Your watch has ended."}