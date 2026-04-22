import google.generativeai as genai
import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional
import json

from database import get_db
from models.user import User, UserRole
from models.reports import SupportTicket, TicketMessage, TicketStatus, BusinessContactRequest
from models.monetization import UserSubscription
from security import get_current_user, get_current_user_optional, require_noOne, verify_csrf
from models.notification import Notification

router = APIRouter(prefix="/support", tags=["Support"])

# Admin API key for support raven
api_key = os.getenv("VITE_GEMINI_API_KEY")

def get_support_model():
    if not api_key:
        return None
    return genai.GenerativeModel(
        "gemini-1.5-flash",
        client_options={"api_key": api_key}
    )

SYSTEM_PROMPT = """You are the Citadel AI Raven, the official platform support assistant for SupportByDV.
Your sole purpose is to help users navigate the platform, resolve billing issues, clarify subscription tiers, and report bugs regarding features (Quizzes, Notes, Subscriptions).
STRICT RULES:
1. You MUST NOT answer any questions about academic content, coding, literature, or theoretical subjects.
2. If a user asks about an academic subject, kindly reply: 'I am the Citadel AI Raven, bound only to platform support. I cannot assist with your academic inquiries.'
3. If you cannot help them, or if the user explicitly demands human assistance/Maester intervention, you MUST reply with exactly this keyword: ACTION_ESCALATE
4. ONLY use simple markdown bolding (**bold**) and avoiding complex structures.

Platform FAQ:
- Beginner Plan: Rs. 500 or $10 Azure Credits. Offers 1 specific Module access, zero ads, premium quizzes/notes, progress tracking.
- Intermediate Plan (Most Popular): Rs. 1500 or $15 Azure Credits. Offers everything in Beginner PLUS access to ALL Modules in 1 Semester, Custom Collections, Vaults, and is totally Ad-Free.
- Master Plan: Rs. 2000 or $20 Azure Credits. Offers everything in Intermediate PLUS Unlimited access to ALL Semesters, Complete freedom across the Citadel, and Priority support from Maesters.
"""

class ChatRequest(BaseModel):
    message: str
    history: List[dict] # Format: [{"role": "user", "parts": "msg"}, {"role": "model", "parts": "msg"}]

class EscalateRequest(BaseModel):
    category: str
    description: str
    chat_history: str # JSON Dump

@router.post("/chat", dependencies=[Depends(verify_csrf)])
async def chat_with_raven(req: ChatRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not api_key:
        return {"reply": "The maesters have not configured the Raven network (API key missing)."}
        
    try:
        # Build history for Gemini
        formatted_history = []
        for h in req.history:
            formatted_history.append({
                "role": h["role"],
                "parts": [h["parts"]]
            })
            
        model_instance = get_support_model()
        if not model_instance:
             return {"reply": "The ravens are grounded. Support AI is not configured."}

        chat = model_instance.start_chat(history=formatted_history)
        
        subs = (await db.execute(select(UserSubscription).filter(UserSubscription.user_id == current_user.id))).scalars().all()
        sub_desc = ", ".join([s.tier.value for s in subs]) if subs else "None"
        
        context = f"User Context:\nName: {current_user.first_name} {current_user.last_name}\nRole: {current_user.role.value}\nActive Subscriptions: {sub_desc}"
        response = chat.send_message(f"SYSTEM INSTRUCTION REMINDER: {SYSTEM_PROMPT}\n\n{context}\n\nUser: {req.message}")
        reply_text = response.text.strip()
        
        if reply_text == "ACTION_ESCALATE" or "[ESCALATE]" in reply_text:
            ticket = SupportTicket(
                user_id=current_user.id,
                category="General Escalation",
                chat_history=json.dumps(req.history),
                status=TicketStatus.OPEN
            )
            db.add(ticket)
            await db.commit()
            await db.refresh(ticket)
            
            # Initial User entry
            msg_user = TicketMessage(ticket_id=ticket.id, sender_id=current_user.id, is_bot=0, content=req.message)
            db.add(msg_user)
            # Notify admin
            admin = (await db.execute(select(User).filter(User.role == UserRole.NO_ONE))).scalars().first()
            if admin:
                notif = Notification(user_id=admin.id, message=f"A new Support Ticket #{ticket.id} was auto-escalated to the Small Council.", destination_url=f"/admin-dashboard/support?ticketID={ticket.id}")
                db.add(notif)
            
            await db.commit()
            
            return {"reply": "I am unable to assist you further. I have automatically dispatched a scroll to the Small Council. A Maester will review our chat and reply soon. (A Support Ticket has been created)", "escalated": True, "ticket_id": ticket.id}

        return {"reply": reply_text}
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "Quota" in err_msg:
            return {"reply": "The Ravens are currently overwhelmed with scrolls. Please try again in a few moments, or Escalate this issue to a Maester."}
        return {"reply": f"The Raven dropped the scroll. Error: {err_msg}"}

@router.post("/escalate", dependencies=[Depends(verify_csrf)])
async def escalate_to_admin(req: EscalateRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = SupportTicket(
        user_id=current_user.id,
        category=req.category,
        chat_history=req.chat_history,
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    
    # Initialize first message
    msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        is_bot=0,
        content=req.description
    )
    db.add(msg)
    await db.commit()
    return {"message": "Escalation request submitted. The Small Council will review it.", "ticket_id": ticket.id}

@router.get("/tickets/me")
async def get_my_tickets(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    tickets = (await db.execute(select(SupportTicket).filter(SupportTicket.user_id == current_user.id).order_by(SupportTicket.created_at.desc()))).scalars().all()
    return [{"id": t.id, "status": t.status.value, "category": t.category, "created_at": t.created_at} for t in tickets]

@router.get("/tickets/all")
async def get_all_tickets(category: Optional[str] = None, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.NO_ONE, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Forbidden")
    stmt = select(SupportTicket)
    if category:
        stmt = stmt.filter(SupportTicket.category == category)
    tickets = (await db.execute(stmt.order_by(SupportTicket.created_at.desc()))).scalars().all()
    return [{"id": t.id, "status": t.status.value, "category": t.category, "created_at": t.created_at, "user_id": t.user_id} for t in tickets]

class DirectChatRequest(BaseModel):
    user_id: Optional[int] = None # Admin needs to pass user_id they are initiating chat with
    message: str

@router.post("/tickets/direct", dependencies=[Depends(verify_csrf)])
async def create_direct_chat(req: DirectChatRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # If user creates it, the user_id is themselves. If admin creates it, they might pass a target user_id.
    target_user_id = current_user.id
    if current_user.role in [UserRole.NO_ONE, UserRole.ADMIN] and req.user_id:
        target_user_id = req.user_id
    
    # Check if there is already an open direct chat for this user? The user said "multiple different direct chat tickets" so we can just create a new one.
    
    ticket = SupportTicket(
        user_id=target_user_id,
        category="Direct Chat",
        chat_history="",
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    
    msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        is_bot=0,
        content=req.message
    )
    db.add(msg)
    
    # Notify if admin created it
    if current_user.role in [UserRole.NO_ONE, UserRole.ADMIN] and target_user_id != current_user.id:
        notif = Notification(user_id=target_user_id, message="A Maester has reached out to you through the Raven.", destination_url=f"/?ticketID={ticket.id}")
        db.add(notif)
    # Notify admin if user created it 
    elif current_user.role not in [UserRole.NO_ONE, UserRole.ADMIN]:
        admin = (await db.execute(select(User).filter(User.role == UserRole.NO_ONE))).scalars().first()
        if admin:
            notif = Notification(user_id=admin.id, message=f"A new direct chat #{ticket.id} was opened by a user.", destination_url=f"/admin-dashboard/support?ticketID={ticket.id}")
            db.add(notif)
            
    await db.commit()
    return {"message": "Direct chat created", "ticket_id": ticket.id}

@router.put("/tickets/{ticket_id}/resolve", dependencies=[Depends(verify_csrf)])
async def resolve_ticket(ticket_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = (await db.execute(select(SupportTicket).filter(SupportTicket.id == ticket_id))).scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if current_user.role not in [UserRole.NO_ONE, UserRole.ADMIN] and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    ticket.status = TicketStatus.RESOLVED
    
    msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        is_bot=0,
        content="[TICKET CLOSED] This issue has been marked as resolved."
    )
    db.add(msg)
    await db.commit()
    
    return {"message": "Ticket resolved."}

class BusinessContact(BaseModel):
    contact_name: str
    contact_email: str
    company: Optional[str] = None
    message: str

@router.get("/tickets/{ticket_id}")
async def get_ticket_details(ticket_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = (await db.execute(select(SupportTicket).filter(SupportTicket.id == ticket_id))).scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if current_user.role not in [UserRole.NO_ONE, UserRole.ADMIN] and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    messages = (await db.execute(select(TicketMessage).filter(TicketMessage.ticket_id == ticket_id).order_by(TicketMessage.created_at.asc()))).scalars().all()
    
    if current_user.role in [UserRole.NO_ONE, UserRole.ADMIN]:
        if ticket.status == TicketStatus.OPEN:
            ticket.status = TicketStatus.IN_PROGRESS
            await db.commit()
            
    # Pre-fetch all sender users in a single query
    sender_ids = {m.sender_id for m in messages if m.sender_id}
    senders_map = {}
    if sender_ids:
        senders = (await db.execute(select(User).filter(User.id.in_(sender_ids)))).scalars().all()
        senders_map = {s.id: s for s in senders}

    # We enrich messages with sender details
    res_messages = []
    for m in messages:
        sender_role = "user"
        if m.is_bot:
            sender_role = "bot"
        elif m.sender_id:
            sender = senders_map.get(m.sender_id)
            if sender and sender.role in [UserRole.NO_ONE, UserRole.ADMIN]:
                sender_role = "admin"
        
        res_messages.append({
            "id": m.id,
            "content": m.content,
            "created_at": m.created_at,
            "sender_role": sender_role
        })
        
    user = (await db.execute(select(User).filter(User.id == ticket.user_id))).scalars().first()
    
    return {
        "ticket": {
            "id": ticket.id, 
            "status": ticket.status.value, 
            "category": ticket.category, 
            "created_at": ticket.created_at, 
            "chat_history": ticket.chat_history,
            "user_id": user.id if user else None,
            "user_name": f"{user.first_name} {user.last_name}" if user else "Unknown",
            "user_role": user.role.value if user else "None",
            "user_suspended": user.is_suspended if user else False
        },
        "messages": res_messages
    }

class TicketReply(BaseModel):
    content: str
    
@router.post("/tickets/{ticket_id}/reply", dependencies=[Depends(verify_csrf)])
async def reply_to_ticket(ticket_id: int, reply: TicketReply, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = (await db.execute(select(SupportTicket).filter(SupportTicket.id == ticket_id))).scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if current_user.role not in [UserRole.NO_ONE, UserRole.ADMIN] and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        is_bot=0,
        content=reply.content
    )
    db.add(msg)
    
    # If admin replies, notify user
    if current_user.role in [UserRole.NO_ONE, UserRole.ADMIN] and current_user.id != ticket.user_id:
        notif = Notification(user_id=ticket.user_id, message=f"A Maester has replied to your Support Ticket #{ticket.id}.", destination_url=f"/?ticketID={ticket.id}")
        db.add(notif)
    else:
        # If user replies, change status back to OPEN so admins see it as unread
        ticket.status = TicketStatus.OPEN
        
    await db.commit()
    return {"message": "Reply sent."}

@router.post("/business-contact", status_code=status.HTTP_201_CREATED)
async def submit_business_contact(contact: BusinessContact, db: AsyncSession = Depends(get_db), current_user: Optional[User] = Depends(get_current_user_optional)):
    """Public endpoint for business contacts."""
    req = BusinessContactRequest(**contact.dict())
    if current_user:
        req.user_id = current_user.id
    db.add(req)
    await db.commit()
    return {"message": "Message sent! We will echo a raven to you shortly."}

@router.get("/business/pending")
async def get_pending_business(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_noOne)):
    """Only NoOne can view these."""
    reqs = (await db.execute(select(BusinessContactRequest).filter(BusinessContactRequest.status == "unread").order_by(BusinessContactRequest.created_at.desc()))).scalars().all()
    return reqs

@router.put("/business/{req_id}/approve", dependencies=[Depends(verify_csrf)])
async def approve_business_request(req_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_noOne)):
    req = (await db.execute(select(BusinessContactRequest).filter(BusinessContactRequest.id == req_id))).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Business request not found")
    req.status = "read"
    
    if req.user_id:
        notif = Notification(user_id=req.user_id, message="Your Business Inquiry was reviewed by the Small Council. We will contact you soon.", destination_url="/support/business-contact")
        db.add(notif)
        
    await db.commit()
    return {"message": "Business inquiry approved."}

@router.put("/business/{req_id}/reject", dependencies=[Depends(verify_csrf)])
async def reject_business_request(req_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(require_noOne)):
    req = (await db.execute(select(BusinessContactRequest).filter(BusinessContactRequest.id == req_id))).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Business request not found")
    req.status = "archived"
    
    if req.user_id:
        notif = Notification(user_id=req.user_id, message="Your Business Inquiry was declined by the Small Council.", destination_url="/support/business-contact")
        db.add(notif)
        
    await db.commit()
    return {"message": "Business inquiry rejected."}

