import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from database import get_db
from models.quiz import Module, LectureUnit, LectureTopic, Question
from schemas.quiz import LectureUnitCreate, LectureTopicCreate, UnitBulkCreate
from models.user import User, UserRole
from models.user import User, UserRole
from models.library import Note, Video
from security import get_current_user
import json

router = APIRouter(prefix="/modules", tags=["Modules"])

@router.get("")
async def get_all_modules(db: AsyncSession = Depends(get_db)):
    return (await db.execute(select(Module))).scalars().all()

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_module(
    name: str = Form(...),
    code: str = Form(...),
    year: int = Form(...),
    semester: int = Form(...),
    module_phrase: str = Form(None),
    card_image: UploadFile = File(None),
    banner_image: UploadFile = File(None),
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Only the Small Council can forge new modules.")
    
    existing = (await db.execute(select(Module).filter(Module.code == code))).scalars().first()
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
    await db.commit()
    await db.refresh(new_module)
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
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Only the Small Council can modify modules.")
        
    module = (await db.execute(select(Module).filter(Module.id == module_id))).scalars().first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found.")
        
    if module.code != code:
        existing = (await db.execute(select(Module).filter(Module.code == code))).scalars().first()
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
        
    await db.commit()
    return module

@router.delete("/{module_id}")
async def delete_module(module_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    module = (await db.execute(select(Module).filter(Module.id == module_id))).scalars().first()
    if not module: raise HTTPException(status_code=404)
    await db.delete(module)
    await db.commit()
    return {"message": "Module deleted"}

# --- Lecture Units ---

@router.get("/{module_id}/units-with-topics")
async def get_units_with_topics(module_id: int, db: AsyncSession = Depends(get_db)):
    units = (await db.execute(
        select(LectureUnit)
        .options(selectinload(LectureUnit.topics))
        .filter(LectureUnit.module_id == module_id)
    )).scalars().all()
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
async def create_unit(module_id: int, unit_in: LectureUnitCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]: raise HTTPException(status_code=403)
    new_u = LectureUnit(module_id=module_id, unit_identifier=unit_in.unit_identifier, name=unit_in.name)
    db.add(new_u)
    await db.commit()
    await db.refresh(new_u)
    return new_u

@router.post("/{module_id}/units/bulk", status_code=status.HTTP_201_CREATED)
async def bulk_create_units(module_id: int, units_in: list[UnitBulkCreate], db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]: raise HTTPException(status_code=403)
    
    # Verify module exists
    mod = (await db.execute(select(Module).filter(Module.id == module_id))).scalars().first()
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found.")
        
    for u_in in units_in:
        new_u = LectureUnit(module_id=module_id, unit_identifier=u_in.unit_identifier, name=u_in.name)
        db.add(new_u)
        await db.flush() # flush to get unit id
        if u_in.topics:
            for t_in in u_in.topics:
                new_t = LectureTopic(unit_id=new_u.id, name=t_in.name)
                db.add(new_t)
                
    await db.commit()
    return {"message": f"{len(units_in)} units forged successfully."}

@router.put("/units/{unit_id}")
async def update_unit(unit_id: int, unit_in: LectureUnitCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]: raise HTTPException(status_code=403)
    unit = (await db.execute(select(LectureUnit).filter(LectureUnit.id == unit_id))).scalars().first()
    if not unit: raise HTTPException(status_code=404)
    unit.unit_identifier = unit_in.unit_identifier
    unit.name = unit_in.name
    await db.commit()
    return unit

@router.delete("/units/{unit_id}")
async def delete_unit(unit_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]: raise HTTPException(status_code=403)
    unit = (await db.execute(
        select(LectureUnit)
        .options(selectinload(LectureUnit.topics))
        .filter(LectureUnit.id == unit_id)
    )).scalars().first()
    if not unit: raise HTTPException(status_code=404)
    # Nullify unit_id in questions, notes, and videos to prevent IntegrityErrors
    questions = (await db.execute(select(Question).filter(Question.unit_id == unit_id))).scalars().all()
    for q in questions: q.unit_id = None
    
    notes = (await db.execute(select(Note).filter(Note.unit_id == unit_id))).scalars().all()
    for n in notes: n.unit_id = None
    
    videos = (await db.execute(select(Video).filter(Video.unit_id == unit_id))).scalars().all()
    for v in videos: v.unit_id = None
    
    await db.delete(unit)
    await db.commit()
    return {"message": "Unit deleted"}

# --- Lecture Topics ---

@router.post("/units/{unit_id}/topics")
async def create_topic(unit_id: int, topic_in: LectureTopicCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Any authenticated user can create a topic!
    new_t = LectureTopic(unit_id=unit_id, name=topic_in.name)
    db.add(new_t)
    await db.commit()
    await db.refresh(new_t)
    return new_t

@router.put("/topics/{topic_id}")
async def update_topic(topic_id: int, topic_in: LectureTopicCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]: raise HTTPException(status_code=403)
    topic = (await db.execute(select(LectureTopic).filter(LectureTopic.id == topic_id))).scalars().first()
    if not topic: raise HTTPException(status_code=404)
    topic.name = topic_in.name
    await db.commit()
    return topic

@router.delete("/topics/{topic_id}")
async def delete_topic(topic_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]: raise HTTPException(status_code=403)
    topic = (await db.execute(select(LectureTopic).filter(LectureTopic.id == topic_id))).scalars().first()
    if not topic: raise HTTPException(status_code=404)
    
    # Safely remove this topic ID from all questions' topic_ids
    questions = (await db.execute(select(Question).filter(Question.topic_ids.isnot(None)))).scalars().all()
    for q in questions:
        try:
            t_ids = json.loads(q.topic_ids)
            if topic_id in t_ids:
                t_ids.remove(topic_id)
                q.topic_ids = json.dumps(t_ids) if len(t_ids) > 0 else None
        except:
            pass
            
    await db.delete(topic)
    await db.commit()
    return {"message": "Topic deleted securely"}

