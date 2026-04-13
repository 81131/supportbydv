from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from . import Base

class AdPlacement(enum.Enum):
    LEFT_NAV = "left_nav"
    RIGHT_NAV = "right_nav"
    TOP_BANNER = "top_banner"
    MIDDLE_BANNER = "middle_banner"
    BOTTOM_BANNER = "bottom_banner"
    MOBILE_BANNER = "mobile_banner"

class AdCampaign(Base):
    __tablename__ = "ad_campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    placement = Column(Enum(AdPlacement), nullable=False)
    target_url = Column(String, nullable=False)
    light_image_url = Column(String, nullable=True) # Used for both if dark is empty
    dark_image_url = Column(String, nullable=True)
    fee = Column(Float, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True) # duration
    is_active = Column(Boolean, default=True)
    target_semester = Column(String, nullable=True) # e.g. "Y1S1", or null for global
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SubscriptionTier(enum.Enum):
    BEGINNER = "beginner" # 1 module per month
    INTERMEDIATE = "intermediate" # all modules in 1 semester
    ADVANCED = "advanced" # all premium content

class SubscriptionStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class SubscriptionRequest(Base):
    __tablename__ = "subscription_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tier = Column(Enum(SubscriptionTier), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    semester_key = Column(String, nullable=True)
    payment_slip_url = Column(String, nullable=False)
    payment_method = Column(String, nullable=True) # e.g., "bank_transfer", "azure_credits"
    requested_duration = Column(Integer, nullable=False) # e.g. 1 month, 6 months
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.PENDING)
    is_upgrade = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True) # The admin/noOne who approved/rejected it

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tier = Column(Enum(SubscriptionTier), nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    semester_key = Column(String, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    expiry_date = Column(DateTime(timezone=True), nullable=False)
    duration = Column(Integer, nullable=False) # Keep historical context
    payment_method = Column(String, nullable=True)
    purchased_date = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Optional link back to the request that generated this
    request_id = Column(Integer, ForeignKey("subscription_requests.id"), nullable=True)

class AdSubmissionRequest(Base):
    __tablename__ = "ad_submission_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    contact_name = Column(String, nullable=False)
    contact_number = Column(String, nullable=False)
    duration_months = Column(Integer, nullable=False)
    target_semester = Column(String, nullable=True) # Null means global
    desired_placeholders = Column(String, nullable=False) # JSON or comma separated string
    additional_details = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
