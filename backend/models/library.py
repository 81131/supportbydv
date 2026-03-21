from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from . import Base

class VisibilityEnum(enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    UNLISTED = "unlisted"

class Note(Base):
    __tablename__ = "notes"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    
    # File Details
    file_url = Column(String, nullable=False)
    file_type = Column(String, nullable=False) # e.g., 'pdf', 'docx', 'zip'
    
    # Hierarchy & Organization
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    uploader_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Governance (No One's Power)
    is_pinned = Column(Boolean, default=False)
    is_recommended = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    module = relationship("Module")
    uploader = relationship("User")
    # Cascades to wipe mapping tables if the note is deleted
    favorited_by = relationship("FavoriteNote", back_populates="note", cascade="all, delete-orphan")
    collection_links = relationship("CollectionNote", back_populates="note", cascade="all, delete-orphan")


class Collection(Base):
    __tablename__ = "collections"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    visibility = Column(Enum(VisibilityEnum), default=VisibilityEnum.PRIVATE)
    
    # Governance
    is_pinned = Column(Boolean, default=False)
    is_recommended = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    creator = relationship("User")
    note_links = relationship("CollectionNote", back_populates="collection", cascade="all, delete-orphan")


# ==========================================
# MAPPING TABLES (Many-to-Many Relationships)
# ==========================================

class FavoriteNote(Base):
    __tablename__ = "favorite_notes"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    saved_at = Column(DateTime(timezone=True), server_default=func.now())

    note = relationship("Note", back_populates="favorited_by")


class CollectionNote(Base):
    __tablename__ = "collection_notes"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="CASCADE"), nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    collection = relationship("Collection", back_populates="note_links")
    note = relationship("Note", back_populates="collection_links")