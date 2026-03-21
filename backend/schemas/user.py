from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models.user import UserRole

class TokenPayload(BaseModel):
    token: str

class UserResponse(BaseModel):
    id: int
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    picture: Optional[str] = None
    role: UserRole
    is_suspended: bool
    auth_provider: Optional[str] = None # 👈 Make sure this is Optional!

    class Config:
        from_attributes = True # Important for ORM models!

# ... (your existing schemas) ...

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse