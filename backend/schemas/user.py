from pydantic import BaseModel

class TokenPayload(BaseModel):
    token: str

class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    auth_provider: str

    class Config:
        from_attributes = True

# ... (your existing schemas) ...

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse