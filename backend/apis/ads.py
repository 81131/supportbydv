from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from models.user import User
from models.monetization import AdCampaign, AdPlacement, AdSubmissionRequest
from security import get_current_user, require_noOne, verify_csrf
from pydantic import BaseModel
from typing import Optional

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
def get_active_ads(semester_key: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch currently active ads"""
    now = datetime.utcnow()
    # If end_date is present, verify we haven't passed it
    ads = db.query(AdCampaign).filter(
        AdCampaign.is_active == True,
    ).all()
    
    # Filter memory (easier to handle null end_dates)
    active_list = []
    for ad in ads:
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
    return active_list

@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
def create_ad(ad_in: AdCreate, db: Session = Depends(get_db), current_user: User = Depends(require_noOne)):
    """Only NoOne can create ads."""
    new_ad = AdCampaign(**ad_in.dict())
    db.add(new_ad)
    db.commit()
    db.refresh(new_ad)
    return new_ad

@router.delete("/{ad_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(verify_csrf)])
def delete_ad(ad_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_noOne)):
    ad = db.query(AdCampaign).filter(AdCampaign.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    db.delete(ad)
    db.commit()
    return None

class AdSubmission(BaseModel):
    contact_name: str
    contact_number: str
    duration_months: int
    target_semester: Optional[str] = None
    desired_placeholders: str
    additional_details: Optional[str] = None

@router.post("/request", status_code=status.HTTP_201_CREATED)
def submit_ad_request(submission: AdSubmission, db: Session = Depends(get_db)):
    """Public endpoint for submitting an ad inquiry."""
    req = AdSubmissionRequest(**submission.dict())
    db.add(req)
    db.commit()
    return {"message": "Request submitted successfully. The Maesters will contact you."}

@router.get("/requests/pending")
def get_pending_ad_requests(db: Session = Depends(get_db), current_user: User = Depends(require_noOne)):
    """Only NoOne can view these."""
    reqs = db.query(AdSubmissionRequest).filter(AdSubmissionRequest.status == "pending").order_by(AdSubmissionRequest.created_at.desc()).all()
    return reqs
