import os
import shutil
import io
import zipfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.library import Note, Collection, CollectionNote, FavoriteNote, VisibilityEnum
from security import get_current_user

router = APIRouter(prefix="/library", tags=["Grand Library"])

# Ensure the upload directory exists!
UPLOAD_DIR = "uploads/notes"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ==========================================
# 📜 NOTES: UPLOAD & HARD DELETE
# ==========================================

@router.post("/notes")
async def upload_note(
    title: str = Form(...),
    description: str = Form(None),
    module_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Saves the physical file and logs it in the database."""
    
    # 1. Generate a safe file path
    file_extension = file.filename.split(".")[-1]
    safe_filename = f"user_{current_user.id}_mod_{module_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # 2. Save the physical file to the server
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 3. Save the record to the database
    new_note = Note(
        title=title,
        description=description,
        file_url=file_path,
        file_type=file_extension,
        module_id=module_id,
        uploader_id=current_user.id
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    
    return {"message": "Scroll safely stored in the archives.", "note_id": new_note.id}

@router.delete("/notes/{note_id}")
def hard_delete_note(
    note_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """The Hard Delete: Destroys the DB record (cascading) AND the physical file."""
    note = db.query(Note).filter(Note.id == note_id).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Scroll not found.")
        
    if note.uploader_id != current_user.id and current_user.role.value not in ["admin", "noOne"]:
        raise HTTPException(status_code=403, detail="You do not have permission to burn this scroll.")

    # 1. Destroy the physical file
    if os.path.exists(note.file_url):
        os.remove(note.file_url)

    # 2. Destroy the DB record (SQLAlchemy will automatically cascade and delete favorites/collection links!)
    db.delete(note)
    db.commit()
    
    return {"message": "Scroll burned and erased from all collections."}

@router.get("/notes/download/{note_id}")
def download_single_note(note_id: int, db: Session = Depends(get_db)):
    """Serves the file to the user."""
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note or not os.path.exists(note.file_url):
        raise HTTPException(status_code=404, detail="Scroll has been lost to time.")
        
    return FileResponse(path=note.file_url, filename=f"{note.title}.{note.file_type}")

# ==========================================
# 🗂️ COLLECTIONS & DYNAMIC ZIP STREAMING
# ==========================================

@router.get("/collections/{collection_id}/zip")
def download_collection_as_zip(
    collection_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Packages all notes in a collection into a ZIP file on the fly!"""
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found.")
        
    # Security check for private collections
    if collection.visibility == VisibilityEnum.PRIVATE and collection.creator_id != current_user.id and current_user.role.value != "noOne":
        raise HTTPException(status_code=403, detail="This archive is sealed.")

    # Fetch all notes linked to this collection
    linked_notes = db.query(Note).join(CollectionNote).filter(CollectionNote.collection_id == collection_id).all()
    
    if not linked_notes:
        raise HTTPException(status_code=400, detail="This collection is empty.")

    # Create the ZIP file in memory (RAM) so we don't clog the server's hard drive!
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for note in linked_notes:
            if os.path.exists(note.file_url):
                # We rename the file inside the zip to match the Note's clean title
                zip_file.write(note.file_url, arcname=f"{note.title}.{note.file_type}")

    zip_buffer.seek(0) # Reset buffer pointer to the beginning

    # Stream the ZIP directly to the browser
    return StreamingResponse(
        iter([zip_buffer.getvalue()]), 
        media_type="application/x-zip-compressed", 
        headers={"Content-Disposition": f"attachment; filename={collection.title.replace(' ', '_')}_Archive.zip"}
    )

@router.get("/notes/module/{module_id}")
def get_notes_by_module(module_id: int, db: Session = Depends(get_db)):
    """Fetches all notes for a specific module."""
    notes = db.query(Note).filter(Note.module_id == module_id).all()
    
    result = []
    for n in notes:
        uploader = db.query(User).filter(User.id == n.uploader_id).first()
        
        # Safe Enum extraction
        if uploader and hasattr(uploader.role, 'value'):
            creator_role = uploader.role.value
        elif uploader:
            creator_role = str(uploader.role).replace('UserRole.', '')
        else:
            creator_role = "user"
            
        result.append({
            "id": n.id, "title": n.title, "description": n.description,
            "file_type": n.file_type, "uploader_id": n.uploader_id,
            "creator_role": creator_role, "is_recommended": n.is_recommended, 
            "is_pinned": n.is_pinned
        })
    return result

@router.get("/collections/public")
def get_public_collections(db: Session = Depends(get_db)):
    """Fetches all public collections for the Archives tab."""
    collections = db.query(Collection).filter(Collection.visibility == VisibilityEnum.PUBLIC).all()
    
    result = []
    for c in collections:
        creator = db.query(User).filter(User.id == c.creator_id).first()
        result.append({
            "id": c.id, "title": c.title, "description": c.description,
            "creator_name": f"{creator.first_name}" if creator else "Unknown",
            "is_recommended": c.is_recommended, "is_pinned": c.is_pinned
        })
    return result