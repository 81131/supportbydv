import os
from urllib import response
from fastapi import APIRouter, Depends, HTTPException, status, Response
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
def google_auth(
    payload: TokenPayload, 
    response: Response, # Inject Response object
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

        # 1. Generate internal JWT
        access_token = create_access_token(data={"sub": str(user.id)})
        
        # 2. Set the HttpOnly Cookie (Auth)
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            samesite="lax",
            secure=False, # Set to True when you host with HTTPS
            max_age=604800 # 7 days
        )
        
        # 3. Set the CSRF Cookie (Not HttpOnly so React can read it)
        csrf_token = secrets.token_hex(32)
        response.set_cookie(
            key="csrftoken",
            value=csrf_token,
            httponly=False, 
            samesite="lax",
            secure=False,
            max_age=604800
        )

        return {"user": user} # No longer need to return the token in the body

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
        path="/", # Ensure the path matches where it was set
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
