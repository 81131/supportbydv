"""
AI Study Assistant ("The Maester") endpoint.
Uses the student's personal Gemini API key (server-side only — never exposed to frontend).
Has access to a snapshot of the student's performance analytics as context.
"""
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from database import get_db
from models.user import User
from models.attempts import QuizAttempt, QuestionAttempt
from models.quiz import Quiz, Question
from security import get_current_user
from apis.api_keys import get_active_gemini_key

import google.generativeai as genai

router = APIRouter(prefix="/ai-assistant", tags=["AI Assistant"])


class ChatMessage(BaseModel):
    role: str        # "user" or "model"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


async def _build_performance_context(user_id: int, db: AsyncSession) -> str:
    """
    Build a concise performance summary for the system prompt.
    Includes overall accuracy, and which modules/topics have the lowest scores.
    """
    # Fetch attempts with related data
    stmt = (
        select(QuizAttempt)
        .options(selectinload(QuizAttempt.quiz), selectinload(QuizAttempt.question_attempts))
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(QuizAttempt.user_id == user_id, QuizAttempt.status == "COMPLETED", Quiz.is_deleted == False)
        .order_by(QuizAttempt.created_at.desc())
        .limit(20)
    )
    attempts = (await db.execute(stmt)).scalars().all()

    if not attempts:
        return "The student has not attempted any quizzes yet. Encourage them to try their first trial."

    total_earned = sum(a.total_marks for a in attempts)
    total_max = 0.0
    module_scores: dict = {}

    for attempt in attempts:
        quiz = attempt.quiz
        if not quiz:
            continue
        
        module_id = quiz.module_id
        if module_id not in module_scores:
            module_scores[module_id] = {"earned": 0.0, "max": 0.0, "title": f"Module {module_id}"}

        # Use the version stored in the attempt, or fallback to current quiz version
        target_version = getattr(attempt, "quiz_version", quiz.version)
        
        # Calculate max marks for this specific quiz version
        q_max_stmt = select(func.sum(Question.marks)).filter(
            Question.quiz_id == quiz.id, 
            Question.version == target_version
        )
        q_max = (await db.execute(q_max_stmt)).scalar() or 0.0
        
        total_max += q_max
        module_scores[module_id]["earned"] += attempt.total_marks
        module_scores[module_id]["max"] += q_max

    overall_pct = round((total_earned / total_max) * 100, 1) if total_max > 0 else 0

    lines = [f"Overall accuracy: {overall_pct}% across {len(attempts)} trials."]
    for mod_id, s in module_scores.items():
        pct = round((s['earned'] / s['max']) * 100, 1) if s['max'] > 0 else 0
        lines.append(f"  - Module {mod_id}: {pct}% ({s['earned']:.1f}/{s['max']:.1f} marks)")

    weak = [f"Module {mid}" for mid, s in module_scores.items()
            if s["max"] > 0 and (s["earned"] / s["max"]) < 0.5]
    if weak:
        lines.append(f"Weak areas (below 50%): {', '.join(weak)}")

    return "\n".join(lines)


SYSTEM_PROMPT_TEMPLATE = """You are "The Maester" — the personal AI study assistant for the Citadel learning platform.
You are wise, encouraging, and precise. You speak in a slightly medieval academic tone but remain clear and helpful.
You help students understand their weak spots, explain concepts, and suggest study strategies.

Here is a snapshot of this student's current performance:
{performance_context}

Rules:
- Never reveal raw exam answers unless the student already submitted that quiz.
- Keep responses concise and well-structured (use bullet points and headings where appropriate).
- If you don't have enough data, say so gracefully.
- Encourage and motivate — remind them that knowledge is power.
"""


@router.post("/chat")
async def chat_with_maester(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Chat endpoint for the personal AI assistant.
    Uses the student's own Gemini API key (fetched server-side).
    """
    api_key = await get_active_gemini_key(current_user.id, db)
    if not api_key:
        raise HTTPException(
            status_code=402,
            detail="No active Gemini API key found. Please add your API key in Settings to unlock The Maester."
        )

    # Build performance context
    try:
        perf_context = await _build_performance_context(current_user.id, db)
    except Exception:
        perf_context = "Performance data is currently unavailable."

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(performance_context=perf_context)

    # Configure Gemini with student's key (note: configure() is global state — safe under low concurrency)
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name="gemini-2.5-flash")

    # Build conversation history for Gemini
    history_for_gemini = []
    for msg in (request.history or []):
        history_for_gemini.append({
            "role": msg.role,
            "parts": [msg.content]  # ChatMessage.content, not .parts
        })

    chat = model.start_chat(history=history_for_gemini)

    try:
        # Prepend system instruction to the current message
        full_message = f"SYSTEM INSTRUCTION: {system_prompt}\n\nUser: {request.message}"
        response = chat.send_message(full_message)
        reply = response.text
    except Exception as e:
        err_str = str(e).lower()
        if "quota" in err_str or "rate" in err_str or "limit" in err_str or "429" in err_str:
            raise HTTPException(
                status_code=429,
                detail="Your Gemini API key has hit its rate limit. Try again shortly or add another key."
            )
        raise HTTPException(status_code=500, detail=f"The Maester could not respond: {str(e)}")

    return {"reply": reply}


@router.get("/scholar-standing")
async def get_scholar_standing(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns the student's overall accuracy and trial count for the Maester UI."""
    # DEBUG: Log which user is being queried
    print(f"DEBUG scholar-standing: current_user.id={current_user.id}, email={current_user.email}")

    # Fetch all completed attempts for this user
    attempts = (await db.execute(
        select(QuizAttempt)
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(QuizAttempt.user_id == current_user.id, QuizAttempt.status == "COMPLETED", Quiz.is_deleted == False)
    )).scalars().all()

    print(f"DEBUG scholar-standing: found {len(attempts)} attempts for user {current_user.id}")

    if not attempts:
        return {"accuracy": 0, "trials": 0}

    total_earned = sum(a.total_marks for a in attempts)
    total_max = 0.0

    quiz_versions = set((a.quiz_id, a.quiz_version) for a in attempts)
    max_marks_map = {}

    for q_id, v in quiz_versions:
        q_max = (await db.execute(
            select(func.sum(Question.marks))
            .filter(Question.quiz_id == q_id, Question.version == v)
        )).scalar() or 0.0
        max_marks_map[(q_id, v)] = q_max

    for a in attempts:
        total_max += max_marks_map.get((a.quiz_id, a.quiz_version), 0.0)

    accuracy = round((total_earned / total_max) * 100, 1) if total_max > 0 else 0
    print(f"DEBUG scholar-standing: accuracy={accuracy}, trials={len(attempts)}, total_max={total_max}")
    return {"accuracy": accuracy, "trials": len(attempts)}
