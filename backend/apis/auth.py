import os
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from google.oauth2 import id_token
from google.auth.transport import requests
from database import get_db
from models.user import User, UserRole
from models.quiz import Quiz
from models.attempts import QuizAttempt
from models.library import Note, Collection
from security import create_access_token, get_password_hash, verify_password, get_current_user 
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
            if getattr(user, 'is_suspended', False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Your access to the Citadel has been revoked by the Maesters."
                )
            if user.email == SUPER_ADMIN_EMAIL and user.role != UserRole.NO_ONE:
                user.role = UserRole.NO_ONE
            elif user.role == UserRole.STUDENT:
                user.role = UserRole.USER
            # Only update name from Google if user hasn't set a custom name
            if not user.first_name:
                user.first_name = first_name
            if not user.last_name:
                user.last_name = last_name
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
    response.delete_cookie(key="access_token", path="/", httponly=True, samesite="lax")
    response.delete_cookie(key="csrftoken", path="/", httponly=False, samesite="lax")
    return {"message": "You have left the Citadel. Your watch has ended."}


# ─── Profile Endpoints ───────────────────────────────────────────────────────

from schemas.user import ProfileUpdateRequest

@router.patch("/profile", response_model=UserResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update the current user's display name and social links."""
    if payload.first_name is not None: current_user.first_name = payload.first_name.strip()
    if payload.last_name is not None: current_user.last_name = payload.last_name.strip()
    if payload.bio is not None: current_user.bio = payload.bio.strip()
    if payload.linkedin_url is not None: current_user.linkedin_url = payload.linkedin_url.strip()
    if payload.github_url is not None: current_user.github_url = payload.github_url.strip()
    if payload.instagram_url is not None: current_user.instagram_url = payload.instagram_url.strip()
    if payload.facebook_url is not None: current_user.facebook_url = payload.facebook_url.strip()
    if payload.public_email is not None: current_user.public_email = payload.public_email.strip()
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/profile/stats")
def get_profile_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Return aggregate performance stats for the current user."""
    from models.quiz import Question
    uid = current_user.id

    quizzes_taken    = db.query(QuizAttempt).filter(QuizAttempt.user_id == uid, QuizAttempt.status == "COMPLETED").count()
    quizzes_made     = db.query(Quiz).filter(Quiz.created_user_id == uid, Quiz.is_deleted == False).count()
    notes_uploaded   = db.query(Note).filter(Note.uploader_id == uid).count()
    collections_made = db.query(Collection).filter(Collection.creator_id == uid).count()

    # Compute score percentages from completed attempts
    attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == uid, QuizAttempt.status == "COMPLETED").all()
    scores = []
    for a in attempts:
        # Sum max marks for all questions in this quiz
        max_marks = db.query(func.sum(Question.marks)).filter(Question.quiz_id == a.quiz_id).scalar() or 0
        if max_marks > 0:
            scores.append(round((a.total_marks / max_marks) * 100, 1))

    avg_score  = round(sum(scores) / len(scores), 1) if scores else None
    best_score = max(scores) if scores else None

    return {
        "quizzes_taken":    quizzes_taken,
        "quizzes_made":     quizzes_made,
        "notes_uploaded":   notes_uploaded,
        "collections_made": collections_made,
        "avg_score_pct":    avg_score,
        "best_score_pct":   best_score,
        "member_since":     current_user.created_at,
    }