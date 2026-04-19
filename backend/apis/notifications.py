from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models.notification import Notification
from models.user import User
from security import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
async def get_notifications(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    notes = (await db.execute(select(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()))).scalars().all()
    return [{"id": n.id, "message": n.message, "is_read": n.is_read, "created_at": n.created_at, "destination_url": n.destination_url} for n in notes]

@router.put("/{notification_id}/read")
async def read_notification(notification_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = (await db.execute(select(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id))).scalars().first()
    if note:
        note.is_read = True
        await db.commit()
    return {"message": "Notification marked as read."}
