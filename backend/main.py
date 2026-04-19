import os
import time
from contextlib import asynccontextmanager
from security import verify_csrf
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError
from apis import quizzes
from fastapi.staticfiles import StaticFiles 
from apis import auth, files, leaderboard
from apis import admin
from apis import library
from apis.notifications import router as notifications_router
from apis.modules import router as modules_router
from apis.users import router as users_router
from apis.subscription import router as subscription_router
from apis.ads import router as ads_router
from apis.dashboard import router as dashboard_router
from apis.support import router as support_router
from apis import videos
os.makedirs("uploads/modules", exist_ok=True)
os.makedirs("uploads/notes", exist_ok=True)
os.makedirs("uploads/badges", exist_ok=True)

# Importing the models package triggers your __init__.py loop, 
# registering ALL tables with SQLAlchemy automatically.
import models
from models.quiz import Module 
from models.user import Achievement, UserAchievement, User, UserRole
from database import engine, SessionLocal, Base 
from sqlalchemy import text

# Import your API routers
from apis.auth import router as auth_router

# Alembic handles migrations now, wait_for_db removed.

async def initialize_achievements():
    from sqlalchemy import select
    async with SessionLocal() as db:
        try:
            result = await db.execute(select(Achievement).filter(Achievement.name == "No One"))
            no_one_badge = result.scalars().first()
            if not no_one_badge:
                no_one_badge = Achievement(
                    name="No One",
                    description="Valar Morghulis. You are no one.",
                    badge_image_url="/static/badges/NoOne.png",
                    frame_name="frame-no-one",
                    condition="Awarded to the ultimate shadow of the Citadel."
                )
                db.add(no_one_badge)
                await db.commit()
                await db.refresh(no_one_badge)
                
            result = await db.execute(select(User).filter(User.role == UserRole.NO_ONE))
            no_one_users = result.scalars().all()
            for u in no_one_users:
                res = await db.execute(select(UserAchievement).filter(
                    UserAchievement.user_id == u.id,
                    UserAchievement.achievement_id == no_one_badge.id
                ))
                has_badge = res.scalars().first()
                if not has_badge:
                    ua = UserAchievement(
                        user_id=u.id,
                        achievement_id=no_one_badge.id,
                        priority=1,
                        is_valid=True
                    )
                    db.add(ua)
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"Achievement init error: {e}")

import asyncio
from tasks import cleanup_orphaned_files_task

@asynccontextmanager
async def lifespan(app: FastAPI):
    await initialize_modules()
    await initialize_achievements()
    asyncio.create_task(cleanup_orphaned_files_task())
    print("The Citadel's modules and badges have been forged in the database!")
    yield

app = FastAPI(title="Support By DV API", lifespan=lifespan)

# CORS is only needed during local Vite dev (port 5173).
# In production, nginx proxies /api/ so no cross-origin issue exists.
import os as _os
if _os.getenv("DEV_MODE") == "true":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.mount("/static", StaticFiles(directory="uploads"), name="static")

async def initialize_modules():
    from sqlalchemy import select, text
    async with SessionLocal() as db:
        try:
            default_modules = [
                {
                    "name": "Operating System & System Administration", "code": "OSSA", "year": 2, "semester": 2,
                    "card_image_url": "/static/modules/OSSA-bg.webp",
                    "banner_image_url": "/static/modules/Ned_Stark_OSSA-bg.jpg",
                    "module_phrase": "A LANister always pings his local network."
                },
                {
                    "name": "Web and Mobile Technologies", "code": "WMT", "year": 2, "semester": 2,
                    "card_image_url": "/static/modules/WMT-bg.webp",
                    "banner_image_url": "/static/modules/dragonglass_cave-WMT-bg.avif",
                    "module_phrase": "Ours is the Frontend."
                },
                {
                    "name": "Professional Skills", "code": "PS", "year": 2, "semester": 2,
                    "card_image_url": "/static/modules/PS-bg.webp",
                    "banner_image_url": "/static/modules/Tyrion_PS-bg.avif",
                    "module_phrase": "I drink and I manage projects."
                },
            ]

            for mod_data in default_modules:
                res = await db.execute(select(Module).filter(Module.code == mod_data["code"]))
                existing = res.scalars().first()
                if not existing:
                    new_module = Module(**mod_data)
                    db.add(new_module)
                else:
                    if existing.card_image_url is None:
                        existing.card_image_url = mod_data.get("card_image_url")
                    if existing.banner_image_url is None:
                        existing.banner_image_url = mod_data.get("banner_image_url")
                    if existing.module_phrase is None:
                        existing.module_phrase = mod_data.get("module_phrase")
            
            await db.commit()
            # Reset the PostgreSQL sequence to sync with actual max(id)
            await db.execute(text("SELECT setval('modules_id_seq', coalesce((SELECT MAX(id) FROM modules), 1))"))
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"Module init error: {e}")

# Connect the routers to the main app
app.include_router(auth_router)
app.include_router(files.router, dependencies=[Depends(verify_csrf)]) # Protected file uploads
app.include_router(quizzes.router, dependencies=[Depends(verify_csrf)]) # Protected changes
app.include_router(leaderboard.router)
app.include_router(admin.router, dependencies=[Depends(verify_csrf)])
app.include_router(library.router, dependencies=[Depends(verify_csrf)])
app.include_router(notifications_router, dependencies=[Depends(verify_csrf)])
app.include_router(modules_router)
app.include_router(users_router, dependencies=[Depends(verify_csrf)])
app.include_router(subscription_router, dependencies=[Depends(verify_csrf)])
app.include_router(ads_router)
app.include_router(dashboard_router)
app.include_router(support_router)
app.include_router(videos.router, dependencies=[Depends(verify_csrf)])

@app.get("/")
def read_root():
    return {"message": "Valar Dohaeris. The API is running."}