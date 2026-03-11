import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests

from database import get_db
from models.user import User
from schemas.user import TokenPayload, Token
from security import create_access_token  # Import our new function

router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("VITE_GOOGLE_CLIENT_ID")

# Notice the response_model is now Token
@router.post("/google", response_model=Token)
def google_auth(payload: TokenPayload, db: Session = Depends(get_db)):
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

        # 2. Find or create the user
        user = db.query(User).filter(User.email == email).first()

        if not user:
            user = User(
                email=email,
                first_name=first_name,
                last_name=last_name,
                auth_provider="google"
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # 3. Generate our internal JWT
        access_token = create_access_token(data={"sub": str(user.id)})

        # 4. Return the token and the user data to the frontend
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The old gods reject this token. Authentication failed.",
        )