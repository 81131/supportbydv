import os
import shutil
import io
import zipfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models.user import User, UserRole
from models.library import Note, Collection, CollectionNote, FavoriteNote, VisibilityEnum
from pydantic import BaseModel
from security import get_current_user, require_premium_access

from storage import get_s3_client, R2_BUCKET_NAME

router = APIRouter(prefix="/library", tags=["Grand Library"])

# ==========================================
# 📜 NOTES: UPLOAD & HARD DELETE
# ==========================================

ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "odt", "txt", "png", "jpg", "jpeg", "avif"}
MAX_FILE_SIZE = 50 * 1024 * 1024 # 50 MB
ALLOWED_CONTENT_TYPES = {
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.oasis.opendocument.text",
    "text/plain", "image/png", "image/jpeg", "image/avif", "image/webp"
}

@router.post("/notes")
async def upload_note(
    title: str = Form(...),
    description: str = Form(None),
    module_id: int = Form(...),
    unit_id: int = Form(None),
    topic_ids: str = Form(None),
    file: UploadFile = File(...),
    is_premium: bool = Form(False),
    convert_to_pdf: bool = Form(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Saves the physical file and logs it in the database."""
    
    if is_premium and current_user.role != UserRole.NO_ONE:
        raise HTTPException(status_code=403, detail="Only No One can create premium content.")
    
    # 1. Validate file extension
    file_extension = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"The Maesters do not accept this scroll format (.{file_extension}). Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # 2. Validate MIME content type (prevents exe/bat files disguised with allowed extensions)
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"File type '{file.content_type}' is not permitted.")
        
    # 3. Validate file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="This scroll is too heavy (Max 50MB).")

        
    # 3. Generate a safe object key
    safe_filename = f"notes/user_{current_user.id}_mod_{module_id}_{file.filename}"
    
    # 4. Read file content into memory
    file_bytes = await file.read()
    import io

    # Convert to PDF using LibreOffice if requested
    if convert_to_pdf and file_extension in ["doc", "docx"]:
        import tempfile
        import subprocess
        
        with tempfile.NamedTemporaryFile(suffix=f".{file_extension}", delete=False) as tmp_docx:
            tmp_docx.write(file_bytes)
            tmp_docx_path = tmp_docx.name
        
        tmp_out_dir = tempfile.mkdtemp()
        try:
            subprocess.run([
                "libreoffice", "--headless", "--convert-to", "pdf", 
                tmp_docx_path, "--outdir", tmp_out_dir
            ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            pdf_filename = os.path.basename(tmp_docx_path).replace(f".{file_extension}", ".pdf")
            pdf_path = os.path.join(tmp_out_dir, pdf_filename)
            
            if os.path.exists(pdf_path):
                with open(pdf_path, "rb") as pdf_file:
                    file_bytes = pdf_file.read()
                file_extension = "pdf"
                file.content_type = "application/pdf"
                base_name = file.filename.rsplit(".", 1)[0]
                safe_filename = f"notes/user_{current_user.id}_mod_{module_id}_{base_name}.pdf"
            else:
                raise Exception("PDF file was not created by LibreOffice.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to convert document to PDF: {str(e)}")
        finally:
            if os.path.exists(tmp_docx_path):
                os.unlink(tmp_docx_path)
            if os.path.exists(tmp_out_dir):
                shutil.rmtree(tmp_out_dir, ignore_errors=True)

    # 5. Upload to Cloudflare R2 without blocking the event loop
    try:
        async with get_s3_client() as client:
            await client.upload_fileobj(
                io.BytesIO(file_bytes),
                R2_BUCKET_NAME,
                safe_filename,
                ExtraArgs={'ContentType': file.content_type or 'application/octet-stream'}
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload to the clouds: {str(e)}")
        
    # 5. Save the record to the database
    new_note = Note(
        title=title,
        description=description,
        file_url=safe_filename,

        file_type=file_extension,
        module_id=module_id,
        uploader_id=current_user.id,
        unit_id=unit_id,
        topic_ids=topic_ids
    )
    db.add(new_note)
    await db.commit()
    await db.refresh(new_note)
    
    return {"message": "Scroll safely stored in the archives.", "note_id": new_note.id}

@router.delete("/notes/{note_id}")
async def hard_delete_note(
    note_id: int, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """The Hard Delete: Destroys the DB record (cascading) AND the physical file."""
    note = (await db.execute(select(Note).filter(Note.id == note_id))).scalars().first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Scroll not found.")
        
    if note.uploader_id != current_user.id and current_user.role.value not in ["admin", "noOne"]:
        raise HTTPException(status_code=403, detail="You do not have permission to burn this scroll.")

    # 1. Destroy the DB record first (so it disappears from UI immediately)
    await db.delete(note)
    await db.commit()

    # 2. Clean up the physical file in R2
    try:
        async with get_s3_client() as client:
            await client.delete_object(Bucket=R2_BUCKET_NAME, Key=note.file_url)
    except Exception as e:
        # We don't raise an error here because the record is already gone from DB
        print(f"R2 Cleanup Error for {note.file_url}: {e}")
    
    return {"message": "Scroll burned and erased from all collections."}

@router.get("/notes/download/{note_id}")
async def download_single_note(
    note_id: int, 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Serves the file to the user."""
    note = (await db.execute(select(Note).filter(Note.id == note_id))).scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Scroll has been lost to time.")
        
    if note.is_premium and current_user.role.value not in ["premium_user", "admin", "noOne"]:
        await require_premium_access(current_user, db)
        
    try:
        async with get_s3_client() as client:
            presigned_url = await client.generate_presigned_url(
                'get_object',
                Params={'Bucket': R2_BUCKET_NAME, 'Key': note.file_url},
                ExpiresIn=900
            )
        return {"url": presigned_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch scroll: {str(e)}")

@router.get("/notes/text/{note_id}")
async def extract_note_text(note_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Extracts and returns plain text from a PDF scroll for read-aloud."""
    from pypdf import PdfReader
    note = (await db.execute(select(Note).filter(Note.id == note_id))).scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Scroll has been lost to time.")
        
    if note.is_premium and current_user.role.value not in ["premium_user", "admin", "noOne"]:
        await require_premium_access(current_user, db)

    if note.file_type != "pdf":
        raise HTTPException(status_code=400, detail="Only PDF scrolls can be read aloud.")
    try:
        async with get_s3_client() as client:
            response = await client.get_object(Bucket=R2_BUCKET_NAME, Key=note.file_url)
            pdf_bytes = await response['Body'].read()
        pdf_stream = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_stream)
        pages_text = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                pages_text.append(text.strip())
        full_text = "\n\n".join(pages_text)
        if not full_text.strip():
            raise HTTPException(status_code=422, detail="This scroll contains no extractable text (it may be a scanned image).")
        return {"text": full_text, "page_count": len(reader.pages)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not read this scroll: {str(e)}")

# ─── Note metadata (for permalink page) ───────────────────────────────────────
@router.get("/notes/{note_id}/info")
async def get_note_info(note_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns public metadata for a single note — used by the NoteViewer permalink page."""
    note = (await db.execute(select(Note).filter(Note.id == note_id))).scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Scroll not found.")
    uploader = (await db.execute(select(User).filter(User.id == note.uploader_id))).scalars().first()
    uploader_name = f"{uploader.first_name} {uploader.last_name}".strip() if uploader else "Unknown Scholar"
    is_fav = (await db.execute(select(FavoriteNote).filter(
        FavoriteNote.note_id == note_id, FavoriteNote.user_id == current_user.id
    ))).scalars().first() is not None
    return {
        "id": note.id, "title": note.title, "description": note.description,
        "file_type": note.file_type, "uploader_id": note.uploader_id,
        "uploader_name": uploader_name, "module_id": note.module_id,
        "is_recommended": note.is_recommended, "is_pinned": note.is_pinned,
        "is_favorited": is_fav,
    }

# ─── Backend Text-to-Speech via Microsoft Edge Neural TTS ─────────────────────
ALLOWED_TTS_VOICES = {
    "en-US-JennyNeural", "en-US-GuyNeural", "en-US-AriaNeural",
    "en-GB-SoniaNeural", "en-GB-RyanNeural",
    "en-AU-NatashaNeural", "en-AU-WilliamNeural",
    "en-IN-NeerjaNeural", "en-IN-PrabhatNeural",
}
ALLOWED_TTS_RATES = {"-50%", "-25%", "+0%", "+25%", "+50%", "+75%", "+100%"}

@router.get("/notes/tts/{note_id}")
async def text_to_speech_note(
    note_id: int,
    voice: str = "en-US-JennyNeural",
    rate: str = "+0%",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generates an MP3 audio file for the note using Microsoft Edge Neural TTS."""
    import edge_tts, tempfile
    from starlette.background import BackgroundTask
    from pypdf import PdfReader

    # Sanitise params
    if voice not in ALLOWED_TTS_VOICES:
        voice = "en-US-JennyNeural"
    if rate not in ALLOWED_TTS_RATES:
        rate = "+0%"

    note = (await db.execute(select(Note).filter(Note.id == note_id))).scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Scroll not found.")
    if note.file_type != "pdf":
        raise HTTPException(status_code=400, detail="Only PDF scrolls support audio reading.")

    # Extract text from R2
    try:
        async with get_s3_client() as client:
            try:
                response = await client.get_object(Bucket=R2_BUCKET_NAME, Key=note.file_url)
                pdf_bytes = await response['Body'].read()
            except Exception as e:
                raise HTTPException(status_code=404, detail="Scroll file is missing in the clouds.")
        
        pdf_stream = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_stream)
        pages = [p.extract_text() or "" for p in reader.pages]
        text = "\n\n".join(pages).strip()
        if not text:
            raise HTTPException(status_code=422, detail="No extractable text in this scroll (may be a scanned image).")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {e}")

    # Generate TTS audio
    tmp_path = None
    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp_path = tmp.name
        await communicate.save(tmp_path)
    except Exception as e:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=f"Audio generation failed: {e}")

    def _cleanup():
        try:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
        except Exception:
            pass

    safe_title = note.title.replace('"', "'")
    return FileResponse(
        tmp_path,
        media_type="audio/mpeg",
        headers={"Content-Disposition": f'inline; filename="{safe_title}.mp3"'},
        background=BackgroundTask(_cleanup),
    )

# ==========================================
# 🗂️ COLLECTIONS & DYNAMIC ZIP STREAMING
# ==========================================
@router.get("/collections/{collection_id}/zip")
async def download_collection_as_zip(collection_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    
    # Check if they are downloading their "Favorites"
    if collection_id == 'favorites':
        fav_links = (await db.execute(select(FavoriteNote).filter(FavoriteNote.user_id == current_user.id))).scalars().all()
        note_ids = [f.note_id for f in fav_links]
        linked_notes = (await db.execute(select(Note).filter(Note.id.in_(note_ids)))).scalars().all()
        collection_title = "Liked_Scrolls"
    else:
        # Otherwise, handle a normal collection
        col_id_int = int(collection_id)
        collection = (await db.execute(select(Collection).filter(Collection.id == col_id_int))).scalars().first()
        if not collection: raise HTTPException(status_code=404, detail="Collection not found.")
        
        if collection.visibility == VisibilityEnum.PRIVATE and collection.creator_id != current_user.id and current_user.role.value != "noOne":
            raise HTTPException(status_code=403, detail="This archive is sealed.")
            
        coll_links = (await db.execute(select(CollectionNote).filter(CollectionNote.collection_id == col_id_int))).scalars().all()
        note_ids_c = [cl.note_id for cl in coll_links]
        linked_notes = (await db.execute(select(Note).filter(Note.id.in_(note_ids_c)))).scalars().all()
        collection_title = collection.title

    if not linked_notes: raise HTTPException(status_code=400, detail="This collection is empty.")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for note in linked_notes:
            try:
                async with get_s3_client() as client:
                    response = await client.get_object(Bucket=R2_BUCKET_NAME, Key=note.file_url)
                    file_bytes = await response['Body'].read()
                zip_file.writestr(f"{note.title}.{note.file_type}", file_bytes)
            except Exception:
                pass  # Skip files that got lost in the void

    zip_buffer.seek(0)
    return StreamingResponse(
        iter([zip_buffer.getvalue()]), 
        media_type="application/x-zip-compressed", 
        headers={"Content-Disposition": f"attachment; filename={collection_title.replace(' ', '_')}_Archive.zip"}
    )

# 👇 Ensure you are passing current_user in!
@router.get("/notes/module/{module_id}")
async def get_notes_by_module(
    module_id: int, 
    unitId: int = None,
    topicId: int = None,
    recommended: str = None,
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy.orm import joinedload
    stmt = select(Note).options(joinedload(Note.uploader)).filter(Note.module_id == module_id)
    if unitId:
        stmt = stmt.filter(Note.unit_id == unitId)
    if topicId:
        stmt = stmt.filter(Note.topic_ids.like(f"%{topicId}%"))
    if recommended == 'true':
        stmt = stmt.filter(Note.is_recommended == True)
    notes = (await db.execute(stmt)).scalars().all()
    
    result = []
    for n in notes:
        uploader = n.uploader
        
        if uploader and hasattr(uploader.role, 'value'): creator_role = uploader.role.value
        elif uploader: creator_role = str(uploader.role).replace('UserRole.', '')
        else: creator_role = "user"
        
        uploader_name = f"{uploader.first_name} {uploader.last_name}" if uploader else "Unknown Scholar"
        
        # 👇 NEW: Check if the current user has favorited this scroll!
        is_fav = (await db.execute(select(FavoriteNote).filter(
            FavoriteNote.note_id == n.id, 
            FavoriteNote.user_id == current_user.id
        ))).scalars().first() is not None
            
        result.append({
            "id": n.id, "title": n.title, "description": n.description,
            "file_type": n.file_type, "uploader_id": n.uploader_id,
            "uploader_name": uploader_name.strip(),
            "creator_role": creator_role, "is_recommended": n.is_recommended, 
            "is_pinned": n.is_pinned,
            "unit_id": n.unit_id,
            "topic_ids": n.topic_ids,
            "is_favorited": is_fav # 👈 Ship it to React!
        })
    return result

from typing import Optional

@router.get("/collections")
async def get_all_collections(module_id: Optional[int] = None, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = []
    
    # 1. Inject the "Virtual" Favorites Collection ONLY if not filtering by module
    if module_id is None:
        fav_count = (await db.execute(select(func.count(FavoriteNote.id)).filter(FavoriteNote.user_id == current_user.id))).scalar() or 0
        result.append({
            "id": "favorites", # 👈 String ID!
            "title": "Liked Scrolls",
            "description": "All the scrolls you have favorited across the realm.",
            "creator_id": current_user.id,
            "creator_name": current_user.first_name,
            "creator_role": "user",
            "visibility": "private",
            "is_special": True,
            "is_recommended": False,
            "is_pinned": False,
            "note_count": fav_count
        })

    # 2. Fetch Public + User's Private Collections
    is_admin = current_user.role.value in ["admin", "noOne"]
    
    from sqlalchemy.orm import joinedload
    stmt = select(Collection).options(joinedload(Collection.creator)).filter(
        (Collection.visibility == VisibilityEnum.PUBLIC) |
        (Collection.creator_id == current_user.id)
    )
    if not is_admin:
        stmt = stmt.filter(Collection.is_hidden == False)
    if module_id is not None:
        stmt = stmt.filter(Collection.module_id == module_id)
    stmt = stmt.order_by(Collection.id.desc())
    cols = (await db.execute(stmt)).scalars().all()

    for c in cols:
        creator = c.creator
        creator_role = creator.role.value if creator and hasattr(creator.role, 'value') else "user"
        note_count = (await db.execute(select(CollectionNote).filter(CollectionNote.collection_id == c.id))).scalar() or 0
        
        result.append({
            "id": c.id, "title": c.title, "description": c.description,
            "creator_id": c.creator_id,
            "creator_name": f"{creator.first_name}" if creator else "Unknown",
            "creator_role": creator_role,
            "visibility": c.visibility.value,
            "is_special": False,
            "is_recommended": c.is_recommended, "is_pinned": c.is_pinned,
            "is_hidden": c.is_hidden,
            "note_count": note_count
        })
    return result

class GovernanceToggle(BaseModel):
    is_pinned: bool = None
    is_recommended: bool = None
    is_premium: bool = None

@router.put("/notes/{note_id}/governance")
async def toggle_note_governance(
    note_id: int, flags: GovernanceToggle, 
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "noOne":
        raise HTTPException(status_code=403, detail="Only No One possesses this power.")
    note = (await db.execute(select(Note).filter(Note.id == note_id))).scalars().first()
    if flags.is_pinned is not None: note.is_pinned = flags.is_pinned
    if flags.is_recommended is not None: note.is_recommended = flags.is_recommended
    if flags.is_premium is not None: note.is_premium = flags.is_premium
    await db.commit()
    return {"message": "Scroll governance updated."}

@router.put("/collections/{collection_id}/governance")
async def toggle_collection_governance(
    collection_id: int, flags: GovernanceToggle, 
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "noOne":
        raise HTTPException(status_code=403, detail="Only No One possesses this power.")
    collection = (await db.execute(select(Collection).filter(Collection.id == collection_id))).scalars().first()
    if flags.is_pinned is not None: collection.is_pinned = flags.is_pinned
    if flags.is_recommended is not None: collection.is_recommended = flags.is_recommended
    await db.commit()
    return {"message": "Archive governance updated."}


class CollectionCreate(BaseModel):
    title: str
    description: str = None
    visibility: str = "private" # "public" or "private"
    year: int
    semester: int
    module_id: int = None
    is_premium: bool = False

@router.post("/notes/{note_id}/favorite")
async def toggle_favorite(note_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Toggles the heart icon."""
    existing = (await db.execute(select(FavoriteNote).filter(FavoriteNote.note_id == note_id, FavoriteNote.user_id == current_user.id))).scalars().first()
    if existing:
        await db.delete(existing)
        await db.commit()
        return {"message": "Removed from favorites.", "is_favorited": False}
    
    new_fav = FavoriteNote(note_id=note_id, user_id=current_user.id)
    db.add(new_fav)
    await db.commit()
    return {"message": "Added to favorites.", "is_favorited": True}

@router.post("/collections")
async def create_collection(data: CollectionCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Forges a new archive."""
    if data.is_premium and current_user.role != UserRole.NO_ONE:
        raise HTTPException(status_code=403, detail="Only No One can create premium content.")
        
    vis = VisibilityEnum.PUBLIC if data.visibility == "public" else VisibilityEnum.PRIVATE
    new_col = Collection(
        title=data.title, 
        description=data.description, 
        visibility=vis, 
        creator_id=current_user.id,
        year=data.year,
        semester=data.semester,
        module_id=data.module_id,
        is_premium=data.is_premium
    )
    db.add(new_col)
    await db.commit()
    await db.refresh(new_col)
    return {"id": new_col.id, "title": new_col.title, "visibility": new_col.visibility.value}

@router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Deletes an archive and its associated links."""
    col = (await db.execute(select(Collection).filter(Collection.id == collection_id))).scalars().first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
        
    if col.creator_id != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this collection")
        
    await db.delete(col)
    await db.commit()
    return {"message": "Archive successfully deleted."}

@router.post("/collections/{collection_id}/notes/{note_id}")
async def add_note_to_collection(collection_id: int, note_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Links a scroll to a specific archive."""
    col = (await db.execute(select(Collection).filter(Collection.id == collection_id, Collection.creator_id == current_user.id))).scalars().first()
    if not col: raise HTTPException(status_code=403, detail="Not your archive.")
        
    exists = (await db.execute(select(CollectionNote).filter(
        CollectionNote.collection_id == collection_id,
        CollectionNote.note_id == note_id
    ))).scalars().first()
    if not exists:
        db.add(CollectionNote(collection_id=collection_id, note_id=note_id))
        await db.commit()
    return {"message": "Scroll safely stored in your archive."}

@router.get("/notes/favorites/me")
async def get_my_favorite_notes(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetches all scrolls the user has favorited."""
    # Join Note with FavoriteNote where user_id matches
    fav_links = (await db.execute(select(FavoriteNote).filter(FavoriteNote.user_id == current_user.id))).scalars().all()
    fav_note_ids = [f.note_id for f in fav_links]
    fav_notes = (await db.execute(select(Note).filter(Note.id.in_(fav_note_ids)))).scalars().all()
    
    result = []
    for n in fav_notes:
        uploader = (await db.execute(select(User).filter(User.id == n.uploader_id))).scalars().first()
        if uploader and hasattr(uploader.role, 'value'): creator_role = uploader.role.value
        elif uploader: creator_role = str(uploader.role).replace('UserRole.', '')
        else: creator_role = "user"
            
        result.append({
            "id": n.id, "title": n.title, "description": n.description,
            "file_type": n.file_type, "uploader_id": n.uploader_id,
            "creator_role": creator_role, "is_recommended": n.is_recommended, 
            "is_pinned": n.is_pinned,
            "is_favorited": True # By definition, these are favorited!
        })
    return result

# ⚠️  IMPORTANT: /collections/me MUST be registered BEFORE /collections/{collection_id}
# otherwise FastAPI captures "me" as collection_id (int) → 422 Unprocessable Entity.
@router.get("/collections/me")
async def get_my_collections(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetches the user's personal vaults AND injects the Virtual Favorites Archive."""
    
    # 1. Fetch physical collections
    cols = (await db.execute(select(Collection).filter(Collection.creator_id == current_user.id).order_by(Collection.id.desc()))).scalars().all()
    
    # 2. Count their favorites to show on the card
    fav_count = (await db.execute(select(func.count(FavoriteNote.id)).filter(FavoriteNote.user_id == current_user.id))).scalar() or 0

    # 3. Inject the "Virtual" Favorites Collection at the very top!
    result = [{
        "id": "favorites",
        "title": "Liked Scrolls",
        "description": "All the scrolls you have favorited across the realm.",
        "visibility": "private",
        "is_special": True,
        "creator_id": current_user.id,
        "module_id": None,
        "year": None,
        "semester": None,
        "note_count": fav_count
    }]

    # 4. Append their real collections
    for c in cols:
        note_count = (await db.execute(select(func.count(CollectionNote.id)).filter(CollectionNote.collection_id == c.id))).scalar() or 0
        result.append({
            "id": c.id, 
            "title": c.title, 
            "description": c.description,
            "visibility": c.visibility.value,
            "is_special": False,
            "creator_id": c.creator_id,
            "module_id": c.module_id,
            "year": c.year,
            "semester": c.semester,
            "note_count": note_count
        })
        
    return result

@router.get("/collections/{collection_id}")
async def get_collection_detail(collection_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns metadata for a single collection, including creator info."""
    from sqlalchemy.orm import joinedload
    col = (await db.execute(select(Collection).options(joinedload(Collection.creator)).filter(Collection.id == collection_id))).scalars().first()
    if not col:
        raise HTTPException(status_code=404, detail="Archive not found.")
    if col.visibility == VisibilityEnum.PRIVATE and col.creator_id != current_user.id and current_user.role.value != "noOne":
        raise HTTPException(status_code=403, detail="This archive is sealed.")
    creator = col.creator
    note_count = (await db.execute(select(CollectionNote).filter(CollectionNote.collection_id == col.id))).scalar() or 0
    return {
        "id": col.id, "title": col.title, "description": col.description,
        "visibility": col.visibility.value,
        "is_special": False,
        "is_recommended": col.is_recommended, "is_pinned": col.is_pinned,
        "module_id": col.module_id, "year": col.year, "semester": col.semester,
        "note_count": note_count,
        "creator_id": col.creator_id,
        "creator_name": creator.first_name if creator else "Unknown",
    }

@router.get("/collections/{collection_id}/notes")
async def get_notes_in_collection(collection_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetches all scrolls stored inside a specific archive."""
    # 1. Verify the collection exists and the user is allowed to see it
    from sqlalchemy.orm import selectinload, joinedload
    links = (await db.execute(
        select(CollectionNote)
        .options(joinedload(CollectionNote.note).joinedload(Note.uploader))
        .filter(CollectionNote.collection_id == collection_id)
        .order_by(CollectionNote.sort_order.asc(), CollectionNote.id.asc())
    )).scalars().all()

    result = []
    for link in links:
        n = link.note
        if not n:
            continue
        is_fav = (await db.execute(select(FavoriteNote).filter(FavoriteNote.note_id == n.id, FavoriteNote.user_id == current_user.id))).scalars().first() is not None
        uploader = n.uploader
        creator_name = uploader.first_name if uploader else "Scholar"
        result.append({
            "id": n.id, "title": n.title, "description": n.description,
            "file_type": n.file_type, "is_favorited": is_fav,
            "uploader_id": n.uploader_id, "uploader_name": creator_name,
        })
    return result

@router.delete("/collections/{collection_id}/notes/{note_id}")
async def remove_note_from_collection(collection_id: int, note_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Removes a scroll from an archive (owner only)."""
    col = (await db.execute(select(Collection).filter(Collection.id == collection_id))).scalars().first()
    if not col:
        raise HTTPException(status_code=404, detail="Archive not found.")
    if col.creator_id != current_user.id and current_user.role.value != "noOne":
        raise HTTPException(status_code=403, detail="Not your archive.")
    link = (await db.execute(select(CollectionNote).filter(
        CollectionNote.collection_id == collection_id,
        CollectionNote.note_id == note_id
    ))).scalars().first()
    if not link:
        raise HTTPException(status_code=404, detail="Scroll not in this archive.")
    await db.delete(link)
    await db.commit()
    return {"message": "Scroll removed from archive."}

class NoteReorderRequest(BaseModel):
    note_ids: list[int]  # ordered list of note IDs, from first to last

@router.patch("/collections/{collection_id}/notes/reorder")
async def reorder_notes_in_collection(collection_id: int, data: NoteReorderRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Updates the sort_order for notes in a collection (owner only)."""
    col = (await db.execute(select(Collection).filter(Collection.id == collection_id))).scalars().first()
    if not col:
        raise HTTPException(status_code=404, detail="Archive not found.")
    if col.creator_id != current_user.id and current_user.role.value != "noOne":
        raise HTTPException(status_code=403, detail="Not your archive.")
    for idx, note_id in enumerate(data.note_ids):
        link = (await db.execute(select(CollectionNote).filter(
            CollectionNote.collection_id == collection_id,
            CollectionNote.note_id == note_id
        ))).scalars().first()
        if link:
            link.sort_order = idx
    await db.commit()
    return {"message": "Order saved."}


# /collections/me is now registered above /collections/{collection_id} — see line ~370


class VisibilityUpdate(BaseModel):
    visibility: str

@router.put("/collections/{collection_id}/visibility")
async def update_collection_visibility(
    collection_id: int, data: VisibilityUpdate, 
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    col = (await db.execute(select(Collection).filter(Collection.id == collection_id))).scalars().first()
    if not col: raise HTTPException(status_code=404, detail="Archive not found.")
    
    if col.creator_id != current_user.id and current_user.role.value not in ["admin", "noOne"]:
        raise HTTPException(status_code=403, detail="Not your archive.")
    
    col.visibility = VisibilityEnum.PUBLIC if data.visibility == 'public' else VisibilityEnum.PRIVATE
    await db.commit()
    return {"message": "Visibility updated."}

@router.put("/collections/{collection_id}/hide")
async def toggle_collection_hidden(
    collection_id: int, 
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ["admin", "noOne"]:
        raise HTTPException(status_code=403, detail="Only Admins can hide archives.")
    
    col = (await db.execute(select(Collection).filter(Collection.id == collection_id))).scalars().first()
    if not col: raise HTTPException(status_code=404, detail="Archive not found.")
    
    col.is_hidden = not col.is_hidden
    await db.commit()
    return {"message": "Archive hidden status toggled."}


class CollectionEditRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[str] = None
    module_id: Optional[int] = None
    year: Optional[int] = None
    semester: Optional[int] = None

@router.patch("/collections/{collection_id}/edit")
async def edit_collection(
    collection_id: int, data: CollectionEditRequest,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Update archive metadata (title, description, module, year, semester, visibility)."""
    col = (await db.execute(select(Collection).filter(Collection.id == collection_id))).scalars().first()
    if not col:
        raise HTTPException(status_code=404, detail="Archive not found.")
    if col.creator_id != current_user.id and current_user.role.value not in ["admin", "noOne"]:
        raise HTTPException(status_code=403, detail="Not your archive.")
    if data.title is not None and data.title.strip():
        col.title = data.title.strip()
    if data.description is not None:
        col.description = data.description.strip()
    if data.visibility is not None:
        col.visibility = VisibilityEnum.PUBLIC if data.visibility == 'public' else VisibilityEnum.PRIVATE
    # Allow setting module_id to None (cross-module) — use sentinel key check instead of None check
    col.module_id = data.module_id  # None is valid (means "all modules")
    if data.year is not None:
        col.year = data.year
    if data.semester is not None:
        col.semester = data.semester
    await db.commit()
    return {"message": "Archive updated successfully."}