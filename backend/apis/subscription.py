import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import List

from database import get_db
from models.user import User, UserRole
from models.monetization import SubscriptionRequest, UserSubscription, SubscriptionTier, SubscriptionStatus
from models.notification import Notification
from security import get_current_user, require_noOne

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

from storage import get_s3_client, R2_BUCKET_NAME


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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if tier == SubscriptionTier.BEGINNER and not module_id:
        raise HTTPException(status_code=400, detail="Beginner tier requires a targeted module.")
    if tier == SubscriptionTier.INTERMEDIATE and not semester_key:
        raise HTTPException(status_code=400, detail="Intermediate tier requires a semester key.")

    if not is_upgrade:
        now = datetime.utcnow()
        active_subs = (await db.execute(
            select(UserSubscription).filter(
                UserSubscription.user_id == current_user.id,
                UserSubscription.is_active == True,
                UserSubscription.expiry_date > now,
            )
        )).scalars().all()

        for sub in active_subs:
            if sub.tier == SubscriptionTier.ADVANCED:
                raise HTTPException(status_code=400, detail="You already have an Active Master pass.")
            elif sub.tier == SubscriptionTier.INTERMEDIATE:
                if tier == SubscriptionTier.INTERMEDIATE and sub.semester_key == semester_key:
                    raise HTTPException(status_code=400, detail=f"You already have an Active pass for {semester_key}.")
            elif sub.tier == SubscriptionTier.BEGINNER:
                if tier == SubscriptionTier.BEGINNER and sub.module_id == module_id:
                    raise HTTPException(status_code=400, detail="You already have an Active pass for this module.")

    # Save payment slip to R2
    ext = slip.filename.split(".")[-1].lower() if "." in slip.filename else "png"
    safe_name = f"payment_slips/slip_{current_user.id}_{int(datetime.utcnow().timestamp())}.{ext}"
    
    file_bytes = await slip.read()
    import io
    async with get_s3_client() as client:
        await client.upload_fileobj(
            io.BytesIO(file_bytes),
            R2_BUCKET_NAME,
            safe_name,
            ExtraArgs={'ContentType': slip.content_type or 'image/png'}
        )

    slip_url = safe_name

    req = SubscriptionRequest(
        user_id=current_user.id,
        tier=tier,
        module_id=module_id,
        semester_key=semester_key,
        payment_slip_url=slip_url,
        payment_method=payment_method,
        requested_duration=requested_duration,
        status=SubscriptionStatus.PENDING,
        is_upgrade=is_upgrade,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    no_ones = (await db.execute(select(User).filter(User.role == UserRole.NO_ONE))).scalars().all()
    for admin in no_ones:
        msg = (
            f"Scholar {current_user.first_name} requested an UPGRADE to {tier.value}."
            if is_upgrade
            else f"Scholar {current_user.first_name} submitted a new subscription request for {tier.value}."
        )
        db.add(Notification(user_id=admin.id, message=msg, destination_url="/admin-dashboard/requests"))
    await db.commit()

    return {"message": "Request submitted. Awaiting the Maesters' review."}


# -------------------------------------------------------------
# ADMIN/NO ONE: View Pending Requests
# -------------------------------------------------------------
@router.get("/requests/pending")
async def get_pending_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Forbidden.")
    requests = (await db.execute(
        select(SubscriptionRequest)
        .filter(SubscriptionRequest.status == SubscriptionStatus.PENDING)
        .order_by(SubscriptionRequest.created_at.desc())
    )).scalars().all()
    
    result_list = []
    async with get_s3_client() as client:
        for req in requests:
            req_dict = {c.name: getattr(req, c.name) for c in req.__table__.columns}
            if req.payment_slip_url and not req.payment_slip_url.startswith("http") and not req.payment_slip_url.startswith("/static/"):
                req_dict["payment_slip_url"] = await client.generate_presigned_url('get_object', Params={'Bucket': R2_BUCKET_NAME, 'Key': req.payment_slip_url}, ExpiresIn=3600)
            result_list.append(req_dict)
    return result_list


@router.get("/requests/all")
async def get_all_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Forbidden.")
    requests = (await db.execute(
        select(SubscriptionRequest).order_by(SubscriptionRequest.created_at.desc())
    )).scalars().all()
    
    result_list = []
    async with get_s3_client() as client:
        for req in requests:
            req_dict = {c.name: getattr(req, c.name) for c in req.__table__.columns}
            if req.payment_slip_url and not req.payment_slip_url.startswith("http") and not req.payment_slip_url.startswith("/static/"):
                req_dict["payment_slip_url"] = await client.generate_presigned_url('get_object', Params={'Bucket': R2_BUCKET_NAME, 'Key': req.payment_slip_url}, ExpiresIn=3600)
            result_list.append(req_dict)
    return result_list


# -------------------------------------------------------------
# ADMIN/NO ONE: Approve Request
# -------------------------------------------------------------
@router.put("/requests/{req_id}/approve")
async def approve_request(
    req_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Forbidden.")

    req = (await db.execute(select(SubscriptionRequest).filter(SubscriptionRequest.id == req_id))).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.status == SubscriptionStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Already approved.")

    req.status = SubscriptionStatus.APPROVED
    req.reviewed_at = datetime.utcnow()
    req.reviewed_by = current_user.id

    now = datetime.utcnow()
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
        is_active=True,
    )
    db.add(sub)
    db.add(Notification(
        user_id=req.user_id,
        message="Your Citadel subscription has been approved! The archives are open.",
        destination_url="/subscriptions",
    ))

    # Upgrade user role
    target_user = (await db.execute(select(User).filter(User.id == req.user_id))).scalars().first()
    if target_user and target_user.role not in [UserRole.ADMIN, UserRole.NO_ONE, UserRole.PREMIUM_USER]:
        target_user.role = UserRole.PREMIUM_USER

    await db.commit()
    return {"message": "Subscription approved."}


# -------------------------------------------------------------
# ADMIN/NO ONE: Reject Request
# -------------------------------------------------------------
@router.put("/requests/{req_id}/reject")
async def reject_request(
    req_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Forbidden.")

    req = (await db.execute(select(SubscriptionRequest).filter(SubscriptionRequest.id == req_id))).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")

    req.status = SubscriptionStatus.REJECTED
    req.reviewed_at = datetime.utcnow()
    req.reviewed_by = current_user.id

    db.add(Notification(
        user_id=req.user_id,
        message="Your subscription request was declined. Please contact support.",
        destination_url="/support",
    ))
    await db.commit()
    return {"message": "Subscription rejected."}


# -------------------------------------------------------------
# NO ONE ONLY: View History
# -------------------------------------------------------------
@router.get("/history")
async def get_subscription_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_noOne)
):
    """Full historical view of all processed requests"""
    return (await db.execute(
        select(SubscriptionRequest).order_by(SubscriptionRequest.created_at.desc())
    )).scalars().all()


# -------------------------------------------------------------
# USER: Get My Active Subs
# -------------------------------------------------------------
@router.get("/me")
async def get_my_subscriptions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.utcnow()
    return (await db.execute(
        select(UserSubscription).filter(
            UserSubscription.user_id == current_user.id,
            UserSubscription.is_active == True,
            UserSubscription.expiry_date > now,
        )
    )).scalars().all()


# -------------------------------------------------------------
# USER: Get My Payment History
# -------------------------------------------------------------
@router.get("/history/me")
async def get_my_payment_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (await db.execute(
        select(SubscriptionRequest)
        .filter(SubscriptionRequest.user_id == current_user.id)
        .order_by(SubscriptionRequest.created_at.desc())
    )).scalars().all()
