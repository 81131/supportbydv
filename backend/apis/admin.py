from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import String
from database import get_db
from models.user import User, UserRole
from models.audit import AuditLog
from security import get_current_user # Adjust this import to match your auth setup
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["Governance"])

# --- Security Dependencies ---

def require_admin(current_user: User = Depends(get_current_user)):
    """Allows both NO_ONE and ADMIN"""
    if current_user.role not in [UserRole.NO_ONE, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only the Small Council may enter.")
    return current_user

# --- Schemas ---

class RoleUpdateRequest(BaseModel):
    new_role: UserRole

class SuspendRequest(BaseModel):
    is_suspended: bool

# --- Routes ---

from typing import Optional

@router.get("/users")
def get_all_users(q: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Fetch all users and their status for the dashboard table."""
    from models.monetization import UserSubscription
    from datetime import datetime
    
    query = db.query(User)
    if q:
        query = query.filter(
            (User.first_name.ilike(f"%{q}%")) |
            (User.last_name.ilike(f"%{q}%")) |
            (User.email.ilike(f"%{q}%")) |
            (User.id.cast(String).ilike(f"%{q}%"))
        )
    users = query.order_by(User.created_at.desc()).all()
    now = datetime.utcnow()
    
    result = []
    for u in users:
        # Reconstruct as dictionary to append custom fields safely
        u_dict = {
            "id": u.id,
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "picture": u.picture,
            "role": u.role.value if hasattr(u.role, 'value') else u.role,
            "is_suspended": u.is_suspended,
            "last_active_at": u.last_active_at,
            "created_at": u.created_at
        }
        
        # Calculate active tiers
        subs = db.query(UserSubscription).filter(
            UserSubscription.user_id == u.id,
            UserSubscription.is_active == True,
            UserSubscription.expiry_date > now
        ).all()
        
        tiers = list(set([sub.tier.value for sub in subs])) if subs else ["free"]
        u_dict["active_tiers"] = tiers
        
        result.append(u_dict)
        
    return result

@router.put("/users/{target_id}/role")
def change_user_role(
    target_id: int, 
    request: RoleUpdateRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_admin)
):
    target_user = db.query(User).filter(User.id == target_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Scholar not found.")

    # 🛡️ Hierarchy Protections
    if target_user.role == UserRole.NO_ONE and current_user.role != UserRole.NO_ONE:
        raise HTTPException(status_code=403, detail="A Maester cannot alter No One.")
        
    if request.new_role == UserRole.NO_ONE and current_user.role != UserRole.NO_ONE:
        raise HTTPException(status_code=403, detail="Only No One can crown another No One.")

    old_role = target_user.role
    target_user.role = request.new_role
    
    # Log the action
    log = AuditLog(
        admin_id=current_user.id, 
        target_user_id=target_id, 
        action="ROLE_CHANGE", 
        details=f"Changed role from {old_role.value} to {request.new_role.value}"
    )
    db.add(log)
    db.commit()
    
    return {"message": f"Scholar elevated to {request.new_role.value}."}

@router.put("/users/{target_id}/suspend")
def toggle_suspension(
    target_id: int, 
    request: SuspendRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_admin)
):
    target_user = db.query(User).filter(User.id == target_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Scholar not found.")

    # 🛡️ Hierarchy Protections
    if target_user.role == UserRole.NO_ONE:
        raise HTTPException(status_code=403, detail="No One cannot be suspended.")

    target_user.is_suspended = request.is_suspended
    
    action_text = "SUSPENDED" if request.is_suspended else "RESTORED"
    
    # Log the action
    log = AuditLog(
        admin_id=current_user.id, 
        target_user_id=target_id, 
        action=action_text, 
        details=f"User access was {action_text.lower()}."
    )
    db.add(log)
    db.commit()
    
    return {"message": f"Scholar has been {action_text.lower()}."}

@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Fetch the ledger of admin actions."""
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    
    result = []
    for log in logs:
        admin_user = db.query(User).filter(User.id == log.admin_id).first()
        target_user = db.query(User).filter(User.id == log.target_user_id).first()
        
        result.append({
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp,
            "admin_name": f"{admin_user.first_name} {admin_user.last_name}" if admin_user else "Unknown",
            "target_name": f"{target_user.first_name} {target_user.last_name}" if target_user else "Unknown"
        })
        
    return result