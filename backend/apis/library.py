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
from pydantic import BaseModel
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
def download_collection_as_zip(collection_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    
    # Check if they are downloading their "Favorites"
    if collection_id == 'favorites':
        linked_notes = db.query(Note).join(FavoriteNote).filter(FavoriteNote.user_id == current_user.id).all()
        collection_title = "Liked_Scrolls"
    else:
        # Otherwise, handle a normal collection
        col_id_int = int(collection_id)
        collection = db.query(Collection).filter(Collection.id == col_id_int).first()
        if not collection: raise HTTPException(status_code=404, detail="Collection not found.")
        
        if collection.visibility == VisibilityEnum.PRIVATE and collection.creator_id != current_user.id and current_user.role.value != "noOne":
            raise HTTPException(status_code=403, detail="This archive is sealed.")
            
        linked_notes = db.query(Note).join(CollectionNote).filter(CollectionNote.collection_id == col_id_int).all()
        collection_title = collection.title

    if not linked_notes: raise HTTPException(status_code=400, detail="This collection is empty.")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for note in linked_notes:
            if os.path.exists(note.file_url):
                zip_file.write(note.file_url, arcname=f"{note.title}.{note.file_type}")

    zip_buffer.seek(0)
    return StreamingResponse(
        iter([zip_buffer.getvalue()]), 
        media_type="application/x-zip-compressed", 
        headers={"Content-Disposition": f"attachment; filename={collection_title.replace(' ', '_')}_Archive.zip"}
    )

# 👇 Ensure you are passing current_user in!
@router.get("/notes/module/{module_id}")
def get_notes_by_module(module_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notes = db.query(Note).filter(Note.module_id == module_id).all()
    
    result = []
    for n in notes:
        uploader = db.query(User).filter(User.id == n.uploader_id).first()
        
        if uploader and hasattr(uploader.role, 'value'): creator_role = uploader.role.value
        elif uploader: creator_role = str(uploader.role).replace('UserRole.', '')
        else: creator_role = "user"
        
        # 👇 NEW: Check if the current user has favorited this scroll!
        is_fav = db.query(FavoriteNote).filter(
            FavoriteNote.note_id == n.id, 
            FavoriteNote.user_id == current_user.id
        ).first() is not None
            
        result.append({
            "id": n.id, "title": n.title, "description": n.description,
            "file_type": n.file_type, "uploader_id": n.uploader_id,
            "creator_role": creator_role, "is_recommended": n.is_recommended, 
            "is_pinned": n.is_pinned,
            "is_favorited": is_fav # 👈 Ship it to React!
        })
    return result

@router.get("/collections")
def get_all_collections(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Inject the "Virtual" Favorites Collection
    fav_count = db.query(FavoriteNote).filter(FavoriteNote.user_id == current_user.id).count()
    result = [{
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
    }]

    # 2. Fetch Public + User's Private Collections
    cols = db.query(Collection).filter(
        (Collection.visibility == VisibilityEnum.PUBLIC) | 
        (Collection.creator_id == current_user.id)
    ).all()

    for c in cols:
        creator = db.query(User).filter(User.id == c.creator_id).first()
        creator_role = creator.role.value if creator and hasattr(creator.role, 'value') else "user"
        note_count = db.query(CollectionNote).filter(CollectionNote.collection_id == c.id).count()
        
        result.append({
            "id": c.id, "title": c.title, "description": c.description,
            "creator_id": c.creator_id,
            "creator_name": f"{creator.first_name}" if creator else "Unknown",
            "creator_role": creator_role,
            "visibility": c.visibility.value,
            "is_special": False,
            "is_recommended": c.is_recommended, "is_pinned": c.is_pinned,
            "note_count": note_count
        })
    return result

class GovernanceToggle(BaseModel):
    is_pinned: bool = None
    is_recommended: bool = None

@router.put("/notes/{note_id}/governance")
def toggle_note_governance(
    note_id: int, flags: GovernanceToggle, 
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "noOne":
        raise HTTPException(status_code=403, detail="Only No One possesses this power.")
    note = db.query(Note).filter(Note.id == note_id).first()
    if flags.is_pinned is not None: note.is_pinned = flags.is_pinned
    if flags.is_recommended is not None: note.is_recommended = flags.is_recommended
    db.commit()
    return {"message": "Scroll governance updated."}

@router.put("/collections/{collection_id}/governance")
def toggle_collection_governance(
    collection_id: int, flags: GovernanceToggle, 
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "noOne":
        raise HTTPException(status_code=403, detail="Only No One possesses this power.")
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if flags.is_pinned is not None: collection.is_pinned = flags.is_pinned
    if flags.is_recommended is not None: collection.is_recommended = flags.is_recommended
    db.commit()
    return {"message": "Archive governance updated."}


class CollectionCreate(BaseModel):
    title: str
    description: str = None
    visibility: str = "private" # "public" or "private"

@router.post("/notes/{note_id}/favorite")
def toggle_favorite(note_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Toggles the heart icon."""
    existing = db.query(FavoriteNote).filter(FavoriteNote.note_id == note_id, FavoriteNote.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"message": "Removed from favorites.", "is_favorited": False}
    
    new_fav = FavoriteNote(note_id=note_id, user_id=current_user.id)
    db.add(new_fav)
    db.commit()
    return {"message": "Added to favorites.", "is_favorited": True}

@router.get("/collections/me")
def get_my_collections(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetches the user's personal vaults."""
    cols = db.query(Collection).filter(Collection.creator_id == current_user.id).all()
    return [{"id": c.id, "title": c.title, "visibility": c.visibility.value} for c in cols]

@router.post("/collections")
def create_collection(data: CollectionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Forges a new archive."""
    vis = VisibilityEnum.PUBLIC if data.visibility == "public" else VisibilityEnum.PRIVATE
    new_col = Collection(title=data.title, description=data.description, visibility=vis, creator_id=current_user.id)
    db.add(new_col)
    db.commit()
    db.refresh(new_col)
    return {"id": new_col.id, "title": new_col.title, "visibility": new_col.visibility.value}

@router.post("/collections/{collection_id}/notes/{note_id}")
def add_note_to_collection(collection_id: int, note_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Links a scroll to a specific archive."""
    col = db.query(Collection).filter(Collection.id == collection_id, Collection.creator_id == current_user.id).first()
    if not col: raise HTTPException(status_code=403, detail="Not your archive.")
        
    exists = db.query(CollectionNote).filter_by(collection_id=collection_id, note_id=note_id).first()
    if not exists:
        db.add(CollectionNote(collection_id=collection_id, note_id=note_id))
        db.commit()
    return {"message": "Scroll safely stored in your archive."}

@router.get("/notes/favorites/me")
def get_my_favorite_notes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetches all scrolls the user has favorited."""
    # Join Note with FavoriteNote where user_id matches
    fav_notes = db.query(Note).join(FavoriteNote).filter(FavoriteNote.user_id == current_user.id).all()
    
    result = []
    for n in fav_notes:
        uploader = db.query(User).filter(User.id == n.uploader_id).first()
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

@router.get("/collections/{collection_id}/notes")
def get_notes_in_collection(collection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetches all scrolls stored inside a specific archive."""
    # 1. Verify the collection exists and the user is allowed to see it
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Archive not found.")
        
    if collection.visibility == VisibilityEnum.PRIVATE and collection.creator_id != current_user.id and current_user.role.value != "noOne":
        raise HTTPException(status_code=403, detail="This archive is sealed.")

    # 2. Fetch the notes
    linked_notes = db.query(Note).join(CollectionNote).filter(CollectionNote.collection_id == collection_id).all()
    
    result = []
    for n in linked_notes:
        is_fav = db.query(FavoriteNote).filter(FavoriteNote.note_id == n.id, FavoriteNote.user_id == current_user.id).first() is not None
        result.append({
            "id": n.id, "title": n.title, "description": n.description,
            "file_type": n.file_type, "is_favorited": is_fav
        })
    return result

@router.get("/collections/me")
def get_my_collections(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetches the user's personal vaults AND injects the Virtual Favorites Archive."""
    
    # 1. Fetch physical collections
    cols = db.query(Collection).filter(Collection.creator_id == current_user.id).order_by(Collection.id.desc()).all()
    
    # 2. Count their favorites to show on the card
    fav_count = db.query(FavoriteNote).filter(FavoriteNote.user_id == current_user.id).count()

    # 3. Inject the "Virtual" Favorites Collection at the very top!
    result = [{
        "id": "favorites", # 👈 Special string ID so React knows it's the virtual one
        "title": "Liked Scrolls",
        "description": "All the scrolls you have favorited across the realm.",
        "visibility": "private",
        "is_special": True,
        "note_count": fav_count
    }]

    # 4. Append their real collections
    for c in cols:
        note_count = db.query(CollectionNote).filter(CollectionNote.collection_id == c.id).count()
        result.append({
            "id": c.id, 
            "title": c.title, 
            "description": c.description,
            "visibility": c.visibility.value,
            "is_special": False,
            "note_count": note_count
        })
        
    return result


class VisibilityUpdate(BaseModel):
    visibility: str

@router.put("/collections/{collection_id}/visibility")
def update_collection_visibility(
    collection_id: int, data: VisibilityUpdate, 
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    col = db.query(Collection).filter(Collection.id == collection_id).first()
    if not col: raise HTTPException(status_code=404, detail="Archive not found.")
    
    if col.creator_id != current_user.id and current_user.role.value not in ["admin", "noOne"]:
        raise HTTPException(status_code=403, detail="Not your archive.")
    
    col.visibility = VisibilityEnum.PUBLIC if data.visibility == 'public' else VisibilityEnum.PRIVATE
    db.commit()
    return {"message": "Visibility updated."}