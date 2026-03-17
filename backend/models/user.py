from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base # Adjust import if needed
import enum

# Define user roles
class UserRole(enum.Enum):
    STUDENT = "STUDENT"
    CREATOR = "CREATOR"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)
    auth_provider = Column(String, default="local")
    is_active = Column(Boolean, default=True)
    
    # 👈 New Role Column
    role = Column(Enum(UserRole), default=UserRole.STUDENT) 
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 👈 Link to their quiz attempts
    attempts = relationship("QuizAttempt", back_populates="user")