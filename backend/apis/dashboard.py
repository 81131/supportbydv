from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from database import get_db
from models.user import User
from models.library import Note, Collection, VisibilityEnum
from models.quiz import Quiz, Module
from security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard Feed"])


@router.get("/feed")
async def get_dashboard_feed(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns curated collections, notes, and quizzes based on user preferences."""
    prefs = current_user.preferences or {}
    hidden_sections = prefs.get("hidden_sections", [])
    hidden_modules = prefs.get("hidden_modules", [])

    feed = {}

    # Prefetch all modules for fast lookups
    modules = (await db.execute(select(Module))).scalars().all()
    modules_map = {m.id: m for m in modules}

    # Filter to only modules in the user's current year and semester
    user_year = current_user.current_year or 2
    user_sem = current_user.current_semester or 2
    allowed_module_ids = [m.id for m in modules if m.year == user_year and m.semester == user_sem]

    # If no modules exist for this semester, we can just return empty lists early
    if not allowed_module_ids:
        return {"quizzes": [], "notes": [], "collections": []}

    # ── Quizzes ───────────────────────────────────────────────────────────────
    if "quizzes" not in hidden_sections:
        stmt = select(Quiz).filter(Quiz.is_deleted == False, Quiz.is_published == True)
        stmt = stmt.filter(Quiz.module_id.in_(allowed_module_ids))
        if hidden_modules:
            stmt = stmt.filter(Quiz.module_id.notin_(hidden_modules))
        stmt = stmt.order_by(desc(Quiz.created_at)).limit(10)

        quizzes = (await db.execute(stmt)).scalars().all()
        feed["quizzes"] = []
        for q in quizzes:
            mod = modules_map.get(q.module_id)
            feed["quizzes"].append({
                "id": q.id, "title": q.title, "module_id": q.module_id,
                "is_premium": q.is_premium, "created_at": q.created_at,
                "module_code": mod.code if mod else "Global",
                "module_name": mod.name if mod else "",
                "card_image_url": mod.card_image_url if mod else None,
                "module_phrase": mod.module_phrase if mod else None,
            })
    else:
        feed["quizzes"] = []

    # ── Notes ─────────────────────────────────────────────────────────────────
    from sqlalchemy.orm import joinedload
    if "notes" not in hidden_sections:
        stmt = select(Note).options(joinedload(Note.uploader))
        stmt = stmt.filter(Note.module_id.in_(allowed_module_ids))
        if hidden_modules:
            stmt = stmt.filter(Note.module_id.notin_(hidden_modules))
        stmt = stmt.order_by(desc(Note.created_at)).limit(10)

        notes = (await db.execute(stmt)).scalars().all()
        feed["notes"] = []
        for n in notes:
            mod = modules_map.get(n.module_id)
            uploader_name = f"{n.uploader.first_name or ''} {n.uploader.last_name or ''}".strip()
            if not uploader_name:
                uploader_name = "Faceless Uploader"
            feed["notes"].append({
                "id": n.id, "title": n.title, "module_id": n.module_id,
                "file_type": n.file_type, "is_premium": n.is_premium,
                "created_at": n.created_at,
                "uploader_name": uploader_name,
                "module_code": mod.code if mod else "Global",
                "module_name": mod.name if mod else "",
                "card_image_url": mod.card_image_url if mod else None,
                "module_phrase": mod.module_phrase if mod else None,
            })
    else:
        feed["notes"] = []

    # ── Collections ───────────────────────────────────────────────────────────
    if "collections" not in hidden_sections:
        stmt = select(Collection).filter(Collection.visibility == VisibilityEnum.PUBLIC)
        stmt = stmt.filter(Collection.module_id.in_(allowed_module_ids))
        if hidden_modules:
            stmt = stmt.filter(Collection.module_id.notin_(hidden_modules))
        stmt = stmt.order_by(desc(Collection.created_at)).limit(10)

        colls = (await db.execute(stmt)).scalars().all()
        feed["collections"] = []
        for c in colls:
            mod = modules_map.get(c.module_id)
            feed["collections"].append({
                "id": c.id, "title": c.title, "module_id": c.module_id,
                "is_premium": c.is_premium, "created_at": c.created_at,
                "module_code": mod.code if mod else "Global",
                "module_name": mod.name if mod else "",
                "card_image_url": mod.card_image_url if mod else None,
                "module_phrase": mod.module_phrase if mod else None,
            })
    else:
        feed["collections"] = []

    return feed
