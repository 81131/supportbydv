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
    
    # Quizzes
    if 'quizzes' not in hidden_sections:
        quizzes_query = db.query(Quiz).filter(
            Quiz.is_deleted == False,
            Quiz.is_published == True
        )
        if hidden_modules:
            quizzes_query = quizzes_query.filter(Quiz.module_id.notin_(hidden_modules))
        
        feed["quizzes"] = [
            {
                "id": q.id, "title": q.title, "module_id": q.module_id, 
                "is_premium": q.is_premium, "created_at": q.created_at
            }
            for q in quizzes_query.order_by(desc(Quiz.created_at)).limit(10).all()
        ]
    else:
        feed["quizzes"] = []
        
    # Notes
    if 'notes' not in hidden_sections:
        notes_query = db.query(Note)
        if hidden_modules:
            notes_query = notes_query.filter(Note.module_id.notin_(hidden_modules))
            
        feed["notes"] = [
            {
                "id": n.id, "title": n.title, "module_id": n.module_id,
                "file_type": n.file_type, "is_premium": n.is_premium, 
                "created_at": n.created_at
            }
            for n in notes_query.order_by(desc(Note.created_at)).limit(10).all()
        ]
    else:
        feed["notes"] = []
        
    # Collections
    if 'collections' not in hidden_sections:
        colls_query = db.query(Collection).filter(Collection.visibility == VisibilityEnum.PUBLIC)
        if hidden_modules:
            colls_query = colls_query.filter(Collection.module_id.notin_(hidden_modules))
            
        feed["collections"] = [
            {
                "id": c.id, "title": c.title, "module_id": c.module_id,
                "is_premium": c.is_premium, "created_at": c.created_at
            }
            for c in colls_query.order_by(desc(Collection.created_at)).limit(10).all()
        ]
    else:
        feed["collections"] = []
        
    return feed
