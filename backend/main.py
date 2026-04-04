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

os.makedirs("uploads/modules", exist_ok=True)
os.makedirs("uploads/notes", exist_ok=True)

# Importing the models package triggers your __init__.py loop, 
# registering ALL tables with SQLAlchemy automatically.
import models
from models.quiz import Module 
from database import engine, SessionLocal, Base 

# Import your API routers
from apis.auth import router as auth_router

# --- IMPROVED: Retry loop to wait for PostgreSQL ---
def wait_for_db():
    import sys
    print("⏳ Connecting to database...")
    max_retries = 20
    for i in range(max_retries):
        try:
            # Build the database tables
            models.Base.metadata.create_all(bind=engine)
            print("✅ Database connected and tables created!")
            return
        except OperationalError as e:
            print(f"❌ Database not ready, waiting 2 seconds... (Attempt {i+1}/{max_retries})")
            if i == max_retries - 1:
                print(f"FATAL: Could not connect to database after {max_retries} attempts.")
                print(f"Error: {e}")
                sys.exit(3) # Exit with code 3 so Docker can restart it if needed
            time.sleep(2)

wait_for_db()
# ---------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_modules()
    print("⚔️ The Citadel's modules have been forged in the database!")
    yield

app = FastAPI(title="Support By DV API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="uploads"), name="static")

def initialize_modules():
    db = SessionLocal()
    try:
        default_modules = [
            {"id": 1, "name": "Operating System & System Administration", "code": "OSSA", "year": 2, "semester": 2},
            {"id": 2, "name": "Web and Mobile Technologies", "code": "WMT", "year": 2, "semester": 2},
            {"id": 3, "name": "Professional Skills", "code": "PS", "year": 2, "semester": 2},
        ]

        for mod_data in default_modules:
            # Check if it already exists by code
            existing = db.query(Module).filter(Module.code == mod_data["code"]).first()
            if not existing:
                new_module = Module(**mod_data)
                db.add(new_module)
        
        db.commit()
    finally:
        db.close()

# Connect the routers to the main app
app.include_router(auth_router)
app.include_router(files.router, dependencies=[Depends(verify_csrf)]) # Protected file uploads
app.include_router(quizzes.router, dependencies=[Depends(verify_csrf)]) # Protected changes
app.include_router(leaderboard.router)
app.include_router(admin.router, dependencies=[Depends(verify_csrf)])
app.include_router(library.router, dependencies=[Depends(verify_csrf)])
app.include_router(notifications_router, dependencies=[Depends(verify_csrf)])
app.include_router(modules_router)

@app.get("/")
def read_root():
    return {"message": "Valar Dohaeris. The API is running."}