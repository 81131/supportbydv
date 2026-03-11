import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from security import get_current_user
from models.user import User

router = APIRouter(prefix="/archive", tags=["Secure Archives"])

# Added current_user dependency to lock the endpoint
@router.get("/{semester}/{course}/{filename}")
def get_protected_file(
    semester: str, 
    course: str, 
    filename: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # <--- The Gatekeeper
):
    file_path = f"archive/{semester}/{course}/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="File not found."
        )
    
    return FileResponse(path=file_path, media_type='application/pdf')