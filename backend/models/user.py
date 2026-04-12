from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, JSON
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
    PREMIUM_USER = "premium_user"
    ACOLYTE = "acolyte"

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    picture = Column(String, nullable=True) 
    hashed_password = Column(String, nullable=True)
    current_year = Column(Integer, nullable=True, default=2)
    current_semester = Column(Integer, nullable=True, default=2)
    preferences = Column(JSON, nullable=True, default={})
    auth_provider = Column(String, default="local")
    
    # --- Profile & Social Links ---
    bio = Column(String(500), nullable=True)
    linkedin_url = Column(String, nullable=True)
    github_url = Column(String, nullable=True)
    instagram_url = Column(String, nullable=True)
    facebook_url = Column(String, nullable=True)
    public_email = Column(String, nullable=True)

    # --- Governance & Tracking ---
    role = Column(Enum(UserRole), default=UserRole.USER)
    is_suspended = Column(Boolean, default=False)
    last_active_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # --- Relationships ---
    attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="creator")
    achievements = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")


class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    badge_image_url = Column(String, nullable=True)
    frame_name = Column(String, nullable=True) # E.g., 'frame-no-one'
    condition = Column(String, nullable=True)


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    achievement_id = Column(Integer, ForeignKey("achievements.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    achieved_at = Column(DateTime(timezone=True), server_default=func.now())
    is_valid = Column(Boolean, default=True)
    
    # Priority for display on the public profile (0 = lowest default, 1 = highest, etc.)
    priority = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement")