# backend/apis/files.py

import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Form
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.library import Note
from security import get_current_user
from storage import s3_client, R2_BUCKET_NAME

router = APIRouter(prefix="/files", tags=["Files"])

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Only images are allowed in the Citadel!"
        )

    file_extension = file.filename.split(".")[-1]
    unique_filename = f"images/{uuid.uuid4()}.{file_extension}"

    try:
        s3_client.upload_fileobj(
            file.file, 
            R2_BUCKET_NAME, 
            unique_filename,
            ExtraArgs={'ContentType': file.content_type}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload to the clouds: {str(e)}")

    # We will generate a presigned URL on demand later, but for now we return the key.
    return {"image_url": unique_filename}

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

    unique_filename = f"notes/user_{current_user.id}_{uuid.uuid4()}.{file_extension}"

    try:
        s3_client.upload_fileobj(
            file.file, 
            R2_BUCKET_NAME, 
            unique_filename,
            ExtraArgs={'ContentType': file.content_type}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload to cloud: {str(e)}")
    
    new_note = Note(
        title=title,
        description=description,
        file_url=unique_filename,  # storing the R2 key
        file_type=file_extension,
        module_id=module_id,
        uploader_id=current_user.id
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    return {"message": "Document secured in the vault.", "note_id": new_note.id, "file_key": unique_filename}