# backend/apis/files.py

import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Form
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.library import Note
from security import get_current_user

router = APIRouter(prefix="/files", tags=["Files"])

# Ensure the upload directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    # 1. Validate file type (Optional but highly recommended!)
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Only images are allowed in the Citadel!"
        )

    # 2. Generate a unique filename
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # 3. Save the file to the disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 4. Return the URL path that the frontend will use to access the image
    return {"image_url": f"/static/{unique_filename}"}

@router.post("/upload-note")
async def upload_note(
    file: UploadFile = File(...),
    title: str = Form(...),
    module_id: int = Form(...),
    description: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in ["pdf", "docx", "zip", "png", "jpg", "jpeg", "txt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="File type not supported."
        )

    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"/static/{unique_filename}"
    
    new_note = Note(
        title=title,
        description=description,
        file_url=file_url,
        file_type=file_extension,
        module_id=module_id,
        uploader_id=current_user.id
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    return {"message": "Document secured in the vault.", "note_id": new_note.id, "file_url": file_url}