from pydantic import BaseModel
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from models.user import UserRole

class TokenPayload(BaseModel):
    token: str

class UserRegister(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    picture: Optional[str] = None
    role: UserRole
    is_suspended: bool
    auth_provider: Optional[str] = None
    current_year: Optional[int] = 2
    current_semester: Optional[int] = 2
    preferences: Optional[Dict[str, Any]] = {}
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    public_email: Optional[str] = None

    class Config:
        from_attributes = True

class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    facebook_url: Optional[str] = None
    public_email: Optional[str] = None
    current_year: Optional[int] = None
    current_semester: Optional[int] = None
    preferences: Optional[Dict[str, Any]] = None
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse