from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.quiz import Module
from models.user import User, UserRole
from security import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/modules", tags=["Modules"])

class ModuleCreate(BaseModel):
    name: str
    code: str
    year: int
    semester: int

@router.get("/")
def get_all_modules(db: Session = Depends(get_db)):
    return db.query(Module).all()

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_module(
    module_in: ModuleCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Only the Small Council can forge new modules.")
    
    existing = db.query(Module).filter(Module.code == module_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="A module with this code already exists in the archives.")
    
    new_module = Module(**module_in.dict())
    db.add(new_module)
    db.commit()
    db.refresh(new_module)
    return new_module
