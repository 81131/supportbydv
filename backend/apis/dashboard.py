from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from models.user import User
from models.library import Note, Collection, VisibilityEnum
from models.quiz import Quiz
from security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard Feed"])

@router.get("/feed")
def get_dashboard_feed(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns curated collections, notes, and quizzes based on user year, semester, and preferences."""
    
    prefs = current_user.preferences or {}
    hidden_sections = prefs.get('hidden_sections', [])
    hidden_modules = prefs.get('hidden_modules', [])
    
    # We filter quizzes, notes, collections by year/sem
    # Currently modules have year/sem. So we filter by module's year/sem
    
    feed = {}
    
    # Prefetch all modules for fast lookups
    from models.quiz import Module
    modules_map = {m.id: m for m in db.query(Module).all()}
    
    # Quizzes
    if 'quizzes' not in hidden_sections:
        quizzes_query = db.query(Quiz).filter(
            Quiz.is_deleted == False,
            Quiz.is_published == True
        )
        if hidden_modules:
            quizzes_query = quizzes_query.filter(Quiz.module_id.notin_(hidden_modules))
        
        feed["quizzes"] = []
        for q in quizzes_query.order_by(desc(Quiz.created_at)).limit(10).all():
            mod = modules_map.get(q.module_id)
            feed["quizzes"].append({
                "id": q.id, "title": q.title, "module_id": q.module_id, 
                "is_premium": q.is_premium, "created_at": q.created_at,
                "module_code": mod.code if mod else "Global",
                "module_name": mod.name if mod else "",
                "card_image_url": mod.card_image_url if mod else None,
                "module_phrase": mod.module_phrase if mod else None
            })
    else:
        feed["quizzes"] = []
        
    # Notes
    if 'notes' not in hidden_sections:
        notes_query = db.query(Note)
        if hidden_modules:
            notes_query = notes_query.filter(Note.module_id.notin_(hidden_modules))
            
        feed["notes"] = []
        for n in notes_query.order_by(desc(Note.created_at)).limit(10).all():
            mod = modules_map.get(n.module_id)
            uploader_name = f"{n.uploader.first_name or ''} {n.uploader.last_name or ''}".strip()
            if not uploader_name: uploader_name = "Faceless Uploader"
            feed["notes"].append({
                "id": n.id, "title": n.title, "module_id": n.module_id,
                "file_type": n.file_type, "is_premium": n.is_premium, 
                "created_at": n.created_at,
                "uploader_name": uploader_name,
                "module_code": mod.code if mod else "Global",
                "module_name": mod.name if mod else "",
                "card_image_url": mod.card_image_url if mod else None,
                "module_phrase": mod.module_phrase if mod else None
            })
    else:
        feed["notes"] = []
        
    # Collections
    if 'collections' not in hidden_sections:
        colls_query = db.query(Collection).filter(Collection.visibility == VisibilityEnum.PUBLIC)
        if hidden_modules:
            colls_query = colls_query.filter(Collection.module_id.notin_(hidden_modules))
            
        feed["collections"] = []
        for c in colls_query.order_by(desc(Collection.created_at)).limit(10).all():
            mod = modules_map.get(c.module_id)
            feed["collections"].append({
                "id": c.id, "title": c.title, "module_id": c.module_id,
                "is_premium": c.is_premium, "created_at": c.created_at,
                "module_code": mod.code if mod else "Global",
                "module_name": mod.name if mod else "",
                "card_image_url": mod.card_image_url if mod else None,
                "module_phrase": mod.module_phrase if mod else None
            })
    else:
        feed["collections"] = []
        
    return feed
