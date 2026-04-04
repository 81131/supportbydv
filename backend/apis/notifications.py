from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.notification import Notification
from models.user import User
from security import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notes = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()
    return [{"id": n.id, "message": n.message, "is_read": n.is_read, "created_at": n.created_at} for n in notes]

@router.put("/{notification_id}/read")
def read_notification(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if note:
        note.is_read = True
        db.commit()
    return {"message": "Notification marked as read."}
