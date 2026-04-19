import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List

from database import get_db
from models.user import User, UserRole
from models.monetization import SubscriptionRequest, UserSubscription, SubscriptionTier, SubscriptionStatus
from models.notification import Notification
from security import get_current_user, require_noOne

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

SLIP_DIR = "uploads/payment_slips"
os.makedirs(SLIP_DIR, exist_ok=True)

# -------------------------------------------------------------
# USER: Submitting a Request
# -------------------------------------------------------------
@router.post("/request", status_code=status.HTTP_201_CREATED)
async def submit_subscription_request(
    tier: SubscriptionTier = Form(...),
    requested_duration: int = Form(...),
    payment_method: str = Form("bank_transfer"),
    module_id: int = Form(None),
    semester_key: str = Form(None),
    is_upgrade: bool = Form(False),
    slip: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if tier == SubscriptionTier.BEGINNER and not module_id:
        raise HTTPException(status_code=400, detail="Beginner tier requires a targeted module.")
    if tier == SubscriptionTier.INTERMEDIATE and not semester_key:
        raise HTTPException(status_code=400, detail="Intermediate tier requires a semester key.")

    # Restrict same or lower plan overlapping
    if not is_upgrade:
        now = datetime.utcnow()
        active_subs = db.query(UserSubscription).filter(
            UserSubscription.user_id == current_user.id,
            UserSubscription.is_active == True,
            UserSubscription.expiry_date > now
        ).all()
        
        for sub in active_subs:
            if sub.tier == SubscriptionTier.ADVANCED:
                raise HTTPException(status_code=400, detail="You already have an Active Master pass. You cannot purchase a lower tier.")
            elif sub.tier == SubscriptionTier.INTERMEDIATE:
                if tier == SubscriptionTier.INTERMEDIATE and sub.semester_key == semester_key:
                    raise HTTPException(status_code=400, detail=f"You already have an Active pass for {semester_key}.")
                if tier == SubscriptionTier.BEGINNER and semester_key == sub.semester_key:
                    # Approximation: We rely on frontend to pass semester_key for beginner if we want to restrict module vs sem
                    pass 
            elif sub.tier == SubscriptionTier.BEGINNER:
                if tier == SubscriptionTier.BEGINNER and sub.module_id == module_id:
                    raise HTTPException(status_code=400, detail="You already have an Active pass for this module.")

    # Save payment slip
    ext = slip.filename.split(".")[-1].lower() if "." in slip.filename else "png"
    safe_name = f"slip_{current_user.id}_{datetime.utcnow().timestamp()}.{ext}"
    file_path = os.path.join(SLIP_DIR, safe_name)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(slip.file, buffer)
        
    slip_url = f"/static/payment_slips/{safe_name}"

    req = SubscriptionRequest(
        user_id=current_user.id,
        tier=tier,
        module_id=module_id,
        semester_key=semester_key,
        payment_slip_url=slip_url,
        payment_method=payment_method,
        requested_duration=requested_duration,
        status=SubscriptionStatus.PENDING,
        is_upgrade=is_upgrade
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    
    no_ones = db.query(User).filter(User.role == UserRole.NO_ONE).all()
    for admin in no_ones:
        msg = f"Scholar {current_user.first_name} requested an UPGRADE to {tier.value}. Please evaluate for partial refund." if is_upgrade else f"Scholar {current_user.first_name} submitted a new subscription request for {tier.value}."
        notif = Notification(user_id=admin.id, message=msg, destination_url="/admin-dashboard/requests")
        db.add(notif)
    db.commit()

    return {"message": "Request submitted. Awaiting the Maesters' review."}

# -------------------------------------------------------------
# ADMIN/NO ONE: View Pending Requests
# -------------------------------------------------------------
@router.get("/requests/pending")
def get_pending_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Forbidden.")
    return db.query(SubscriptionRequest).filter(SubscriptionRequest.status == SubscriptionStatus.PENDING).order_by(SubscriptionRequest.created_at.desc()).all()

@router.get("/requests/all")
def get_all_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Forbidden.")
    return db.query(SubscriptionRequest).order_by(SubscriptionRequest.created_at.desc()).all()


# -------------------------------------------------------------
# ADMIN/NO ONE: Approve Request
# -------------------------------------------------------------
@router.put("/requests/{req_id}/approve")
def approve_request(req_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Forbidden.")
        
    req = db.query(SubscriptionRequest).filter(SubscriptionRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    
    if req.status == SubscriptionStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Already approved.")

    req.status = SubscriptionStatus.APPROVED
    req.reviewed_at = datetime.utcnow()
    req.reviewed_by = current_user.id

    # Create the active subscription
    now = datetime.utcnow()
    # Assuming requested_duration is in months
    expiry = now + timedelta(days=30 * req.requested_duration)

    sub = UserSubscription(
        user_id=req.user_id,
        tier=req.tier,
        module_id=req.module_id,
        semester_key=req.semester_key,
        start_date=now,
        expiry_date=expiry,
        duration=req.requested_duration,
        payment_method=req.payment_method,
        request_id=req.id,
        is_active=True
    )
    db.add(sub)
    
    # Notify user
    notif = Notification(user_id=req.user_id, message="Your Citadel subscription has been approved! The archives are open.", destination_url="/subscriptions")
    db.add(notif)
    
    # Upgrade user role
    target_user = db.query(User).filter(User.id == req.user_id).first()
    if target_user and target_user.role not in [UserRole.ADMIN, UserRole.NO_ONE, UserRole.PREMIUM_USER]:
        target_user.role = UserRole.PREMIUM_USER

    
    db.commit()
    return {"message": "Subscription approved."}


# -------------------------------------------------------------
# ADMIN/NO ONE: Reject Request
# -------------------------------------------------------------
@router.put("/requests/{req_id}/reject")
def reject_request(req_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Forbidden.")
        
    req = db.query(SubscriptionRequest).filter(SubscriptionRequest.id == req_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    req.status = SubscriptionStatus.REJECTED
    req.reviewed_at = datetime.utcnow()
    req.reviewed_by = current_user.id
    
    # Notify user
    notif = Notification(user_id=req.user_id, message="Your subscription request was declined. Please contact support.", destination_url="/support")
    db.add(notif)

    db.commit()
    return {"message": "Subscription rejected."}


# -------------------------------------------------------------
# NO ONE ONLY: View History
# -------------------------------------------------------------
@router.get("/history")
def get_subscription_history(db: Session = Depends(get_db), current_user: User = Depends(require_noOne)):
    """Full historical view of all processed requests"""
    return db.query(SubscriptionRequest).order_by(SubscriptionRequest.created_at.desc()).all()


# -------------------------------------------------------------
# USER: Get My Active Subs
# -------------------------------------------------------------
@router.get("/me")
def get_my_subscriptions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    subs = db.query(UserSubscription).filter(
        UserSubscription.user_id == current_user.id,
        UserSubscription.is_active == True,
        UserSubscription.expiry_date > now
    ).all()
    return subs

# -------------------------------------------------------------
# USER: Get My Payment History
# -------------------------------------------------------------
@router.get("/history/me")
def get_my_payment_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(SubscriptionRequest).filter(SubscriptionRequest.user_id == current_user.id).order_by(SubscriptionRequest.created_at.desc()).all()

