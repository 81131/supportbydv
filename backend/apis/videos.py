import os
import hashlib
import time
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy import desc

from database import get_db
from security import get_current_user
from models.user import User, UserRole
from models.library import Video
from pydantic import BaseModel

router = APIRouter(prefix="/videos", tags=["Premium Videos"])

BUNNY_LIBRARY_ID = os.getenv("BUNNY_LIBRARY_ID")
BUNNY_SECURITY_KEY = os.getenv("BUNNY_SECURITY_KEY")

class VideoCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    bunny_video_id: str
    module_id: int
    year: int
    semester: int
    topic_ids: Optional[str] = None

class VideoResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    bunny_video_id: str
    module_id: int
    year: int
    semester: int
    topic_ids: Optional[str]
    is_premium: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.post("/upload", response_model=VideoResponse)
async def add_video_link(data: VideoCreateRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Only NoOne can link a new video from Bunny to the system."""
    if current_user.role != UserRole.NO_ONE:
        raise HTTPException(status_code=403, detail="Only No One can weave the visual archives.")
        
    new_video = Video(
        title=data.title,
        description=data.description,
        bunny_video_id=data.bunny_video_id,
        module_id=data.module_id,
        year=data.year,
        semester=data.semester,
        topic_ids=data.topic_ids,
        uploader_id=current_user.id
    )
    db.add(new_video)
    await db.commit()
    await db.refresh(new_video)
    return new_video

@router.get("/module/{module_id}", response_model=List[VideoResponse])
async def get_videos_for_module(module_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch all available videos for a specific module."""
    videos = (await db.execute(select(Video).filter(Video.module_id == module_id).order_by(desc(Video.created_at)))).scalars().all()
    return videos

@router.get("/stream/{video_id}")
async def generate_stream_url(video_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Generates the SHA256 hashed playback token for the Bunny Net iframe."""
    video = (await db.execute(select(Video).filter(Video.id == video_id))).scalars().first()
    if not video:
        raise HTTPException(status_code=404, detail="Video scroll not found.")
        
    # Validation
    if video.is_premium and current_user.role not in [UserRole.PREMIUM_USER, UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="A premium subscription is required to unlock this visual archive.")
        
    if not BUNNY_LIBRARY_ID or not BUNNY_SECURITY_KEY:
        raise HTTPException(status_code=500, detail="Bunny Net securely key missing from the Citadel environment.")
        
    # Generate Time-Limited Hash (15 minutes = 900 seconds)
    expiration_time = int(time.time()) + 900
    
    # Bunny Algorithm: sha256(securityKey + videoId + expirationTime)
    hash_payload = f"{BUNNY_SECURITY_KEY}{video.bunny_video_id}{expiration_time}"
    token = hashlib.sha256(hash_payload.encode('utf-8')).hexdigest()
    
    stream_url = f"https://iframe.mediadelivery.net/embed/{BUNNY_LIBRARY_ID}/{video.bunny_video_id}?token={token}&expires={expiration_time}"
    
    return {
        "stream_url": stream_url,
        "video_title": video.title,
        "description": video.description
    }

@router.delete("/{video_id}")
async def delete_video_link(video_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.NO_ONE:
        raise HTTPException(status_code=403, detail="Unworthy.")
    video = (await db.execute(select(Video).filter(Video.id == video_id))).scalars().first()
    if video:
        await db.delete(video)
        await db.commit()
        return {"message": "Video removed securely from all collections"}
