from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from . import Base


class PersonalApiKey(Base):
    """
    Stores one or more encrypted Gemini API keys per student.
    Keys are rotated automatically when rate limits are hit.
    Raw keys are NEVER returned from any endpoint — only masked hints.
    """
    __tablename__ = "personal_api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    encrypted_key = Column(String, nullable=False)  # Fernet-symmetric encrypted
    label = Column(String(100), nullable=True)       # e.g. "My main key", "Backup key"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")
