import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models.quiz import Module, LectureUnit, LectureTopic, Question
from schemas.quiz import LectureUnitCreate, LectureTopicCreate
from models.user import User, UserRole
from security import get_current_user
import json

router = APIRouter(prefix="/modules", tags=["Modules"])

@router.get("")
def get_all_modules(db: Session = Depends(get_db)):
    return db.query(Module).all()

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_module(
    name: str = Form(...),
    code: str = Form(...),
    year: int = Form(...),
    semester: int = Form(...),
    module_phrase: str = Form(None),
    card_image: UploadFile = File(None),
    banner_image: UploadFile = File(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Only the Small Council can forge new modules.")
    
    existing = db.query(Module).filter(Module.code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail="A module with this code already exists in the archives.")
        
    card_url = None
    if card_image:
        safe_c_name = f"module_{code}_card_{card_image.filename}"
        c_path = os.path.join("uploads/modules", safe_c_name)
        with open(c_path, "wb") as buffer:
            shutil.copyfileobj(card_image.file, buffer)
        card_url = f"/static/modules/{safe_c_name}"

    banner_url = None
    if banner_image:
        safe_b_name = f"module_{code}_banner_{banner_image.filename}"
        b_path = os.path.join("uploads/modules", safe_b_name)
        with open(b_path, "wb") as buffer:
            shutil.copyfileobj(banner_image.file, buffer)
        banner_url = f"/static/modules/{safe_b_name}"
    
    new_module = Module(
        name=name, code=code, year=year, semester=semester, 
        card_image_url=card_url, banner_image_url=banner_url, module_phrase=module_phrase
    )
    db.add(new_module)
    db.commit()
    db.refresh(new_module)
    return new_module

@router.put("/{module_id}")
async def update_module(
    module_id: int,
    name: str = Form(...),
    code: str = Form(...),
    year: int = Form(...),
    semester: int = Form(...),
    module_phrase: str = Form(None),
    card_image: UploadFile = File(None),
    banner_image: UploadFile = File(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Only the Small Council can modify modules.")
        
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found.")
        
    if module.code != code:
        existing = db.query(Module).filter(Module.code == code).first()
        if existing:
            raise HTTPException(status_code=400, detail="A module with this code already exists in the archives.")
            
    module.name = name
    module.code = code
    module.year = year
    module.semester = semester
    if module_phrase is not None:
        module.module_phrase = module_phrase
    
    if card_image:
        safe_c_name = f"module_{code}_card_{card_image.filename}"
        c_path = os.path.join("uploads/modules", safe_c_name)
        with open(c_path, "wb") as buffer:
            shutil.copyfileobj(card_image.file, buffer)
        module.card_image_url = f"/static/modules/{safe_c_name}"
        
    if banner_image:
        safe_b_name = f"module_{code}_banner_{banner_image.filename}"
        b_path = os.path.join("uploads/modules", safe_b_name)
        with open(b_path, "wb") as buffer:
            shutil.copyfileobj(banner_image.file, buffer)
        module.banner_image_url = f"/static/modules/{safe_b_name}"
        
    db.commit()
    return module

@router.delete("/{module_id}")
async def delete_module(module_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module: raise HTTPException(status_code=404)
    db.delete(module)
    db.commit()
    return {"message": "Module deleted"}

# --- Lecture Units ---

@router.get("/{module_id}/units-with-topics")
def get_units_with_topics(module_id: int, db: Session = Depends(get_db)):
    units = db.query(LectureUnit).filter(LectureUnit.module_id == module_id).all()
    res = []
    for u in units:
        topics_list = [{"id": t.id, "name": t.name} for t in u.topics]
        res.append({
            "id": u.id,
            "unit_identifier": u.unit_identifier,
            "name": u.name,
            "topics": topics_list
        })
    return res

@router.post("/{module_id}/units")
def create_unit(module_id: int, unit_in: LectureUnitCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]: raise HTTPException(status_code=403)
    new_u = LectureUnit(module_id=module_id, unit_identifier=unit_in.unit_identifier, name=unit_in.name)
    db.add(new_u)
    db.commit()
    db.refresh(new_u)
    return new_u

@router.put("/units/{unit_id}")
def update_unit(unit_id: int, unit_in: LectureUnitCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]: raise HTTPException(status_code=403)
    unit = db.query(LectureUnit).filter(LectureUnit.id == unit_id).first()
    if not unit: raise HTTPException(status_code=404)
    unit.unit_identifier = unit_in.unit_identifier
    unit.name = unit_in.name
    db.commit()
    return unit

@router.delete("/units/{unit_id}")
def delete_unit(unit_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]: raise HTTPException(status_code=403)
    unit = db.query(LectureUnit).filter(LectureUnit.id == unit_id).first()
    if not unit: raise HTTPException(status_code=404)
    # Nullify unit_id in questions
    questions = db.query(Question).filter(Question.unit_id == unit_id).all()
    for q in questions: q.unit_id = None
    db.delete(unit)
    db.commit()
    return {"message": "Unit deleted"}

# --- Lecture Topics ---

@router.post("/units/{unit_id}/topics")
def create_topic(unit_id: int, topic_in: LectureTopicCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Any authenticated user can create a topic!
    new_t = LectureTopic(unit_id=unit_id, name=topic_in.name)
    db.add(new_t)
    db.commit()
    db.refresh(new_t)
    return new_t

@router.put("/topics/{topic_id}")
def update_topic(topic_id: int, topic_in: LectureTopicCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]: raise HTTPException(status_code=403)
    topic = db.query(LectureTopic).filter(LectureTopic.id == topic_id).first()
    if not topic: raise HTTPException(status_code=404)
    topic.name = topic_in.name
    db.commit()
    return topic

@router.delete("/topics/{topic_id}")
def delete_topic(topic_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]: raise HTTPException(status_code=403)
    topic = db.query(LectureTopic).filter(LectureTopic.id == topic_id).first()
    if not topic: raise HTTPException(status_code=404)
    
    # Safely remove this topic ID from all questions' topic_ids
    questions = db.query(Question).filter(Question.topic_ids.isnot(None)).all()
    for q in questions:
        try:
            t_ids = json.loads(q.topic_ids)
            if topic_id in t_ids:
                t_ids.remove(topic_id)
                q.topic_ids = json.dumps(t_ids) if len(t_ids) > 0 else None
        except:
            pass
            
    db.delete(topic)
    db.commit()
    return {"message": "Topic deleted securely"}

