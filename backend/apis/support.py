import google.generativeai as genai
import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from database import get_db
from models.user import User, UserRole
from models.reports import SupportTicket, TicketMessage, TicketStatus
from models.monetization import UserSubscription
from security import get_current_user

router = APIRouter(prefix="/support", tags=["Support"])

# Configure Gemini
api_key = os.getenv("VITE_GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    
model_instance = genai.GenerativeModel("gemini-2.5-flash")

SYSTEM_PROMPT = """You are the Citadel AI Raven, the official platform support assistant for SupportByDV.
Your sole purpose is to help users navigate the platform, resolve billing issues, clarify subscription tiers, and report bugs regarding features (Quizzes, Notes, Subscriptions).
STRICT RULES:
1. You MUST NOT answer any questions about academic content, coding, literature, or theoretical subjects.
2. If a user asks about an academic subject, kindly reply: 'I am the Citadel AI Raven, bound only to platform support. I cannot assist with your academic inquiries.'
3. If you cannot help them, advise them to click 'Escalate to Admin' down below.
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

@router.post("/chat")
def chat_with_raven(req: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
            
        chat = model_instance.start_chat(history=formatted_history)
        
        subs = db.query(UserSubscription).filter(UserSubscription.user_id == current_user.id).all()
        sub_desc = ", ".join([s.tier.value for s in subs]) if subs else "None"
        
        context = f"User Context:\nName: {current_user.first_name} {current_user.last_name}\nRole: {current_user.role.value}\nActive Subscriptions: {sub_desc}"
        response = chat.send_message(f"SYSTEM INSTRUCTION REMINDER: {SYSTEM_PROMPT}\n\n{context}\n\nUser: {req.message}")
        return {"reply": response.text}
    except Exception as e:
        return {"reply": f"The Raven dropped the scroll. Error: {str(e)}"}

@router.post("/escalate")
def escalate_to_admin(req: EscalateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = SupportTicket(
        user_id=current_user.id,
        category=req.category,
        chat_history=req.chat_history,
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    
    # Initialize first message
    msg = TicketMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        is_bot=0,
        content=req.description
    )
    db.add(msg)
    db.commit()
    return {"message": "Escalation request submitted. The Small Council will review it.", "ticket_id": ticket.id}

@router.get("/tickets/me")
def get_my_tickets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tickets = db.query(SupportTicket).filter(SupportTicket.user_id == current_user.id).order_by(SupportTicket.created_at.desc()).all()
    return [{"id": t.id, "status": t.status.value, "category": t.category, "created_at": t.created_at} for t in tickets]

@router.get("/tickets/all")
def get_all_tickets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.NO_ONE, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Forbidden")
    tickets = db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).all()
    return [{"id": t.id, "status": t.status.value, "category": t.category, "created_at": t.created_at} for t in tickets]
