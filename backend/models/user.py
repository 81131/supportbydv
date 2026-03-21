from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from . import Base

class UserRole(enum.Enum):
    NO_ONE = "noOne"
    ADMIN = "admin"
    VERIFIED = "verified"
    FACELESS = "faceless"
    USER = "user"
    STUDENT = "student" 

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    picture = Column(String, nullable=True) 

    # --- Governance & Tracking ---
    role = Column(Enum(UserRole), default=UserRole.USER)
    is_suspended = Column(Boolean, default=False)
    last_active_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # --- Relationships ---
    attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="creator") # Uncomment if you track creators bidirectionally