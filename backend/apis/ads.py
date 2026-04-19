from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import Optional

from database import get_db
from models.user import User, UserRole
from models.monetization import AdCampaign, AdPlacement, AdSubmissionRequest
from security import get_current_user, get_current_user_optional, require_noOne, verify_csrf
from models.notification import Notification
from pydantic import BaseModel

router = APIRouter(prefix="/ads", tags=["Advertisement Campaigns"])

class AdCreate(BaseModel):
    title: str
    placement: AdPlacement
    target_url: str
    light_image_url: Optional[str] = None
    dark_image_url: Optional[str] = None
    fee: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool = True
    target_semester: Optional[str] = None

@router.get("/active")
async def get_active_ads(semester_key: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Fetch currently active ads"""
    now = datetime.utcnow()
    # If end_date is present, verify we haven't passed it
    ads = (await db.execute(select(AdCampaign).filter(
        AdCampaign.is_active == True,
    ))).scalars().all()
    
    # Filter memory (easier to handle null end_dates)
    active_list = []
    for ad in ads:
        if ad.start_date and now < ad.start_date.replace(tzinfo=None):
            continue
        if ad.end_date and now > ad.end_date.replace(tzinfo=None):
            continue
        # Filter by semester if provided: Only show if ad is global (target_semester == None) OR ad target matches
        if semester_key and ad.target_semester and ad.target_semester != semester_key:
            continue
        # If the requester is not in a semester page, don't show semester-specific ads?
        # Actually, global means show everywhere. Specific means show only there.
        if not semester_key and ad.target_semester:
            continue
            
        active_list.append(ad)
        
    result_list = []
    async with get_s3_client() as client:
        for ad in active_list:
            ad_dict = {c.name: getattr(ad, c.name) for c in ad.__table__.columns}
            
            if ad.light_image_url and not ad.light_image_url.startswith("http") and not ad.light_image_url.startswith("/static/"):
                ad_dict["light_image_url"] = await client.generate_presigned_url('get_object', Params={'Bucket': R2_BUCKET_NAME, 'Key': ad.light_image_url}, ExpiresIn=3600)
            if ad.dark_image_url and not ad.dark_image_url.startswith("http") and not ad.dark_image_url.startswith("/static/"):
                ad_dict["dark_image_url"] = await client.generate_presigned_url('get_object', Params={'Bucket': R2_BUCKET_NAME, 'Key': ad.dark_image_url}, ExpiresIn=3600)
                
            result_list.append(ad_dict)

    return result_list

@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
async def create_ad(ad_in: AdCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_noOne)):
    """Only NoOne can create ads."""
    new_ad = AdCampaign(**ad_in.dict())
    db.add(new_ad)
    await db.commit()
    await db.refresh(new_ad)
    return new_ad

@router.get("/campaigns/all")
async def get_all_campaigns(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_noOne)):
    return (await db.execute(select(AdCampaign).order_by(AdCampaign.created_at.desc()))).scalars().all()

@router.put("/campaigns/{ad_id}/cancel", dependencies=[Depends(verify_csrf)])
async def cancel_campaign(ad_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_noOne)):
    ad = (await db.execute(select(AdCampaign).filter(AdCampaign.id == ad_id))).scalars().first()
    if not ad: raise HTTPException(status_code=404, detail="Ad not found")
    ad.is_active = False
    await db.commit()
    return {"message": "Campaign termianted."}

class AdSubmission(BaseModel):
    contact_name: str
    contact_number: str
    duration_months: int
    target_semester: Optional[str] = None
    desired_placeholders: str
    additional_details: Optional[str] = None

@router.post("/request", status_code=status.HTTP_201_CREATED)
async def submit_ad_request(submission: AdSubmission, db: AsyncSession = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    """Public endpoint for submitting an ad inquiry."""
    req = AdSubmissionRequest(**submission.dict())
    if current_user:
        req.user_id = current_user.id
    db.add(req)
    await db.flush()  # Get req.id before committing

    # Notify all NoOne/Super Admins
    noones = (await db.execute(select(User).filter(User.role == UserRole.NO_ONE))).scalars().all()
    for admin in noones:
        notif = Notification(
            user_id=admin.id,
            message=f"New Ad Campaign Request from {submission.contact_name} ({submission.desired_placeholders}).",
            destination_url="/admin-dashboard/ads"
        )
        db.add(notif)

    # Notify the submitter if logged in
    if current_user:
        db.add(Notification(
            user_id=current_user.id,
            message="Your Ad Campaign request has been received. The Small Council will review it shortly.",
            destination_url="/about"
        ))

    await db.commit()
    return {"message": "Request submitted successfully. The Maesters will contact you."}

@router.get("/requests/all")
async def get_all_ad_requests(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_noOne)):
    """Return ALL ad requests for admin management and filtering."""
    return (await db.execute(select(AdSubmissionRequest).order_by(AdSubmissionRequest.created_at.desc()))).scalars().all()

@router.get("/requests/pending")
async def get_pending_ad_requests(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_noOne)):
    """Only NoOne can view these."""
    reqs = (await db.execute(select(AdSubmissionRequest).filter(AdSubmissionRequest.status == "pending").order_by(AdSubmissionRequest.created_at.desc()))).scalars().all()
    return reqs

import os
import shutil
from fastapi import UploadFile, File, Form

from storage import get_s3_client, R2_BUCKET_NAME

@router.post("/campaigns/deploy", dependencies=[Depends(verify_csrf)])
async def deploy_campaign(
    request_id: int = Form(...),
    title: str = Form(...),
    placement: str = Form(...),
    target_url: str = Form(...),
    start_date: datetime = Form(...),
    end_date: datetime = Form(...),
    target_semester: Optional[str] = Form(None),
    light_image: UploadFile = File(...),
    dark_image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_noOne)
):
    req = (await db.execute(select(AdSubmissionRequest).filter(AdSubmissionRequest.id == request_id))).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Ad request not found")

    async def save_img_to_r2(f: UploadFile):
        if not f: return None
        ext = f.filename.split(".")[-1].lower() if "." in f.filename else "png"
        safe_name = f"ads/ad_{req.id}_{int(datetime.utcnow().timestamp())}.{ext}"
        
        file_bytes = await f.read()
        import io
        async with get_s3_client() as client:
            await client.upload_fileobj(
                io.BytesIO(file_bytes),
                R2_BUCKET_NAME,
                safe_name,
                ExtraArgs={'ContentType': f.content_type or 'image/png'}
            )
        return safe_name

    light_url = await save_img_to_r2(light_image)
    dark_url = await save_img_to_r2(dark_image)

    from models.monetization import AdPlacement
    try:
        placement_enum = AdPlacement(placement)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid placement enum value")

    campaign = AdCampaign(
        title=title,
        placement=placement_enum,
        target_url=target_url,
        light_image_url=light_url,
        dark_image_url=dark_url,
        start_date=start_date,
        end_date=end_date,
        target_semester=target_semester,
        is_active=True
    )
    db.add(campaign)

    req.status = "approved"
    if req.user_id:
        notif = Notification(user_id=req.user_id, message="Your Ad Campaign was launched by the Small Council. It is now active on the Citadel.", destination_url="/about")
        db.add(notif)

    await db.commit()
    return {"message": "Ad campaign deployed successfully!"}

@router.put("/requests/{req_id}/reject", dependencies=[Depends(verify_csrf)])
async def reject_ad_request(req_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_noOne)):
    req = (await db.execute(select(AdSubmissionRequest).filter(AdSubmissionRequest.id == req_id))).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Ad request not found")
    req.status = "rejected"
    
    if req.user_id:
        notif = Notification(user_id=req.user_id, message="Your Ad Campaign was declined by the Small Council.", destination_url="/about")
        db.add(notif)
        
    await db.commit()
    return {"message": "Ad campaign rejected."}
@router.post("/campaigns/{ad_id}/click")
async def record_ad_click(ad_id: int, db: AsyncSession = Depends(get_db)):
    """Increment click counter for analytics (public endpoint)."""
    ad = (await db.execute(select(AdCampaign).filter(AdCampaign.id == ad_id))).scalars().first()
    if ad:
        ad.click_count = (ad.click_count or 0) + 1
        await db.commit()
    return {"ok": True}
