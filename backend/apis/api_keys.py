import os
import random
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from database import get_db
from models.api_keys import PersonalApiKey
from models.user import User
from security import get_current_user

# ── Fernet symmetric encryption for API keys ──────────────────────────────
from cryptography.fernet import Fernet, InvalidToken

def _get_fernet() -> Fernet:
    """
    Derive (or auto-generate) a stable Fernet encryption key from the app's
    SECRET_KEY env variable. We use the first 32 URL-safe base64 chars of the
    secret, padded if necessary, to form a valid Fernet key.
    """
    secret = os.environ.get("SECRET_KEY", "")
    # Fernet requires a 32-byte URL-safe base64-encoded key
    import base64, hashlib
    key_bytes = hashlib.sha256(secret.encode()).digest()           # 32 raw bytes
    fernet_key = base64.urlsafe_b64encode(key_bytes)               # 44-char base64
    return Fernet(fernet_key)


def encrypt_key(raw_key: str) -> str:
    return _get_fernet().encrypt(raw_key.encode()).decode()


def decrypt_key(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()


def mask_key(raw_key: str) -> str:
    """Return a masked hint: first 8 chars + ****"""
    if len(raw_key) <= 8:
        return "****"
    return raw_key[:8] + "****"


async def get_active_gemini_key(user_id: int, db: AsyncSession) -> Optional[str]:
    """
    Internal helper used by quiz submission & AI assistant.
    Returns a decrypted Gemini API key for the user, rotating randomly
    through all active keys. Returns None if no key is available.
    """
    keys = (await db.execute(
        select(PersonalApiKey)
        .filter(PersonalApiKey.user_id == user_id, PersonalApiKey.is_active == True)
    )).scalars().all()

    if not keys:
        return None

    # Random rotation — distributes rate-limit pressure across keys
    key_obj = random.choice(keys)
    try:
        return decrypt_key(key_obj.encrypted_key)
    except (InvalidToken, Exception):
        return None


# ── Router ────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/api-keys", tags=["API Keys"])


class ApiKeyCreate(BaseModel):
    raw_key: str
    label: Optional[str] = None


class ApiKeyUpdate(BaseModel):
    label: Optional[str] = None
    is_active: Optional[bool] = None


# GET /api-keys/me → list all keys (masked)
@router.get("/me")
async def list_my_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    keys = (await db.execute(
        select(PersonalApiKey)
        .filter(PersonalApiKey.user_id == current_user.id)
        .order_by(PersonalApiKey.created_at.asc())
    )).scalars().all()

    result = []
    for k in keys:
        try:
            raw = decrypt_key(k.encrypted_key)
            hint = mask_key(raw)
        except Exception:
            hint = "****"
        result.append({
            "id": k.id,
            "label": k.label,
            "key_hint": hint,
            "is_active": k.is_active,
            "created_at": k.created_at.isoformat() if k.created_at else None,
        })
    return result


# POST /api-keys/me → add a new key
@router.post("/me", status_code=201)
async def add_my_key(
    payload: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    raw = payload.raw_key.strip()
    if not raw.startswith("AIza") or len(raw) < 20:
        raise HTTPException(status_code=422, detail="That doesn't look like a valid Gemini API key.")

    # Limit to 5 keys per user to prevent abuse
    count = (await db.execute(
        select(PersonalApiKey).filter(PersonalApiKey.user_id == current_user.id)
    )).scalars().all()
    if len(count) >= 5:
        raise HTTPException(status_code=400, detail="You may store up to 5 API keys.")

    new_key = PersonalApiKey(
        user_id=current_user.id,
        encrypted_key=encrypt_key(raw),
        label=payload.label or f"Key {len(count) + 1}",
        is_active=True
    )
    db.add(new_key)
    await db.commit()
    await db.refresh(new_key)

    return {
        "id": new_key.id,
        "label": new_key.label,
        "key_hint": mask_key(raw),
        "is_active": new_key.is_active,
        "message": "API key saved securely."
    }


# PUT /api-keys/me/{key_id} → update label or toggle active
@router.put("/me/{key_id}")
async def update_my_key(
    key_id: int,
    payload: ApiKeyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    key_obj = (await db.execute(
        select(PersonalApiKey)
        .filter(PersonalApiKey.id == key_id, PersonalApiKey.user_id == current_user.id)
    )).scalars().first()

    if not key_obj:
        raise HTTPException(status_code=404, detail="Key not found.")

    if payload.label is not None:
        key_obj.label = payload.label
    if payload.is_active is not None:
        key_obj.is_active = payload.is_active

    await db.commit()
    return {"message": "Key updated."}


# DELETE /api-keys/me/{key_id} → delete a specific key
@router.delete("/me/{key_id}")
async def delete_my_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    key_obj = (await db.execute(
        select(PersonalApiKey)
        .filter(PersonalApiKey.id == key_id, PersonalApiKey.user_id == current_user.id)
    )).scalars().first()

    if not key_obj:
        raise HTTPException(status_code=404, detail="Key not found.")

    await db.delete(key_obj)
    await db.commit()
    return {"message": "Key removed from the Citadel's vault."}
