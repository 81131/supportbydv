import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models.quiz import Module
from models.user import User, UserRole
from security import get_current_user

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
