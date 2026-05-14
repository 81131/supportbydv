# backend/apis/files.py

import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.user import User
from models.library import Note
from security import get_current_user
from storage import get_s3_client, R2_BUCKET_NAME

router = APIRouter(prefix="/files", tags=["Files"])


async def _upload_to_r2(file_bytes: bytes, key: str, content_type: str):
    """Async helper to upload bytes to Cloudflare R2 via aioboto3."""
    async with get_s3_client() as client:
        try:
            await client.put_object(
                Bucket=R2_BUCKET_NAME,
                Key=key,
                Body=file_bytes,
                ContentType=content_type
            )
            print(f"Successfully uploaded {key} to R2")
        except Exception as e:
            print(f"Failed to upload {key} to R2: {e}")
            raise e


@router.post("/upload-image")
async def upload_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only images are allowed in the Citadel!"
        )

    file_extension = file.filename.split(".")[-1]
    unique_filename = f"images/{uuid.uuid4()}.{file_extension}"

    try:
        file_bytes = await file.read()
        background_tasks.add_task(_upload_to_r2, file_bytes, unique_filename, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue upload: {str(e)}")

    return {"image_url": unique_filename}


@router.post("/upload-note")
async def upload_note(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    module_id: int = Form(...),
    description: str = Form(None),
    db: AsyncSession = Depends(get_db),
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
        file_bytes = await file.read()
        background_tasks.add_task(_upload_to_r2, file_bytes, unique_filename, file.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue upload: {str(e)}")

    new_note = Note(
        title=title,
        description=description,
        file_url=unique_filename,
        file_type=file_extension,
        module_id=module_id,
        uploader_id=current_user.id
    )
    db.add(new_note)
    await db.commit()
    await db.refresh(new_note)

    return {"message": "Document secured in the vault.", "note_id": new_note.id, "file_key": unique_filename}