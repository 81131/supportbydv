from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from . import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # What did they do? (e.g., "ROLE_CHANGE", "SUSPENSION")
    action = Column(String, nullable=False) 
    
    # Specific details (e.g., "Changed role from user to verified")
    details = Column(String, nullable=True) 
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # --- Relationships ---
    admin = relationship("User", foreign_keys=[admin_id])
    target_user = relationship("User", foreign_keys=[target_user_id])