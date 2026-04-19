import botocore
from sqlalchemy import select
from database import SessionLocal
from storage import get_s3_client, R2_BUCKET_NAME
from models.library import Note
from models.quiz import Question

async def cleanup_orphaned_files_task():
    """
    Asynchronously delete uploaded files that have no corresponding database record.
    """
    async with SessionLocal() as db:
        try:
            deleted = 0
            
            # ── Gather Valid Links ────────────────────────────────────────────────
            res_notes = await db.execute(select(Note.file_url))
            valid_note_urls = {url for url, in res_notes if url}
            
            res_questions = await db.execute(select(Question.image_url))
            valid_res_urls = {url for url, in res_questions if url}

            # ── Helper to Sweep a Prefix ──────────────────────────────────────────
            async def sweep_prefix(prefix: str, valid_keys: set):
                nonlocal deleted
                async with get_s3_client() as client:
                    paginator = client.get_paginator('list_objects_v2')
                    try:
                        async for page in paginator.paginate(Bucket=R2_BUCKET_NAME, Prefix=prefix):
                            if 'Contents' in page:
                                for obj in page['Contents']:
                                    key = obj['Key']
                                    # A folder object or valid key is skipped
                                    if key.endswith('/') or key in valid_keys:
                                        continue
                                    
                                    # Burn the orphan
                                    await client.delete_object(Bucket=R2_BUCKET_NAME, Key=key)
                                    deleted += 1
                                    print(f"Removed orphaned cloud object: {key}")
                    except Exception as err:
                        print(f"Cloud sweep error for {prefix}: {err}")

            # ── Execute Sweeps ────────────────────────────────────────────────────
            await sweep_prefix("notes/", valid_note_urls)
            await sweep_prefix("images/", valid_res_urls)

            if deleted == 0:
                print("Citadel archives are clean — no orphaned files found in Cloudflare R2.")
            else:
                print(f"Citadel cloud cleanup complete — {deleted} orphaned object(s) removed.")

        except Exception as e:
            print(f"Cloud orphan cleanup warning: {e}")
