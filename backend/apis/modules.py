import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models.quiz import Module
from models.user import User, UserRole
from security import get_current_user

router = APIRouter(prefix="/modules", tags=["Modules"])

@router.get("/")
def get_all_modules(db: Session = Depends(get_db)):
    return db.query(Module).all()

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_module(
    name: str = Form(...),
    code: str = Form(...),
    year: int = Form(...),
    semester: int = Form(...),
    file: UploadFile = File(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Only the Small Council can forge new modules.")
    
    existing = db.query(Module).filter(Module.code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail="A module with this code already exists in the archives.")
        
    image_url = None
    if file:
        file_ext = file.filename.split(".")[-1].lower()
        safe_filename = f"module_{code}_{file.filename}"
        file_path = os.path.join("uploads/modules", safe_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        image_url = f"/static/modules/{safe_filename}"
    
    new_module = Module(name=name, code=code, year=year, semester=semester, image_url=image_url)
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
    file: UploadFile = File(None),
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
    
    if file:
        safe_filename = f"module_{code}_{file.filename}"
        file_path = os.path.join("uploads/modules", safe_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        module.image_url = f"/static/modules/{safe_filename}"
        
    db.commit()
    return module
