from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from models.user import User
from models.monetization import AdCampaign, AdPlacement
from security import get_current_user, require_noOne
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

@router.get("/active")
def get_active_ads(db: Session = Depends(get_db)):
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
        active_list.append(ad)
    return active_list

@router.post("", status_code=status.HTTP_201_CREATED)
def create_ad(ad_in: AdCreate, db: Session = Depends(get_db), current_user: User = Depends(require_noOne)):
    """Only NoOne can create ads."""
    new_ad = AdCampaign(**ad_in.dict())
    db.add(new_ad)
    db.commit()
    db.refresh(new_ad)
    return new_ad

@router.delete("/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ad(ad_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_noOne)):
    ad = db.query(AdCampaign).filter(AdCampaign.id == ad_id).first()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    db.delete(ad)
    db.commit()
    return None
