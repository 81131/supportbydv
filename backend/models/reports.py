from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from . import Base

class TicketStatus(enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN)
    category = Column(String, default="general") # e.g. "payment", "quizzes", "notes", "premium"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Store the conversation context if escalated
    chat_history = Column(Text, nullable=True) # JSON serialized history
    
    # Relationships
    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan")

class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("support_tickets.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True) # None if sender is bot
    is_bot = Column(Integer, default=0) # 0 = User/Admin, 1 = Bot
    content = Column(Text, nullable=False)
    attachment_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    ticket = relationship("SupportTicket", back_populates="messages")

class BusinessContactRequest(Base):
    __tablename__ = "business_contact_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    contact_name = Column(String, nullable=False)
    contact_email = Column(String, nullable=False)
    company = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String, default="unread") # unread, read, replied
    created_at = Column(DateTime(timezone=True), server_default=func.now())
