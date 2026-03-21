import os
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy.sql import func # 👈 Added for tracking active time
from google.oauth2 import id_token
from google.auth.transport import requests
from database import get_db
from models.user import User, UserRole
from security import create_access_token  
from pydantic import BaseModel
from schemas.user import TokenPayload, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("VITE_GOOGLE_CLIENT_ID")
SUPER_ADMIN_EMAIL = "saluwadanagedaradinindu@gmail.com" # 👈 The Faceless Master

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
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            samesite="lax",
            secure=False, # Set to True when you host with HTTPS
            max_age=604800 # 7 days
        )
        
        # 5. Set the CSRF Cookie (Not HttpOnly so React can read it)
        csrf_token = secrets.token_hex(32)
        response.set_cookie(
            key="csrftoken",
            value=csrf_token,
            httponly=False, 
            samesite="lax",
            secure=False,
            max_age=604800
        )

        return {"user": user}

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="To trespass, a man should have an account.",
        )

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