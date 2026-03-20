import os
import time
from security import verify_csrf
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError
from apis.files import router as files_router  
from apis import quizzes
from fastapi.staticfiles import StaticFiles 
from apis import auth, files, leaderboard


# Importing the models package triggers your __init__.py loop, 
# registering ALL tables with SQLAlchemy automatically.
import models
from models.quiz import Module 
from database import engine, SessionLocal, Base 

# Import your API routers
from apis.auth import router as auth_router

# --- NEW: Retry loop to wait for PostgreSQL ---
print("Connecting to database...")
for i in range(10): # Try 10 times
    try:
        # Build the database tables
        models.Base.metadata.create_all(bind=engine)
        print("Database connected and tables created!")
        break # If it works, break out of the loop
    except OperationalError:
        print(f"Database not ready, waiting 2 seconds... (Attempt {i+1}/10)")
        time.sleep(2)
# ---------------------------------------------

app = FastAPI(title="Support By DV API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:5173"], 
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

# 2. Trigger on Docker / FastAPI Startup
@app.on_event("startup")
def startup_event():
    # Ensure tables are created first!
    Base.metadata.create_all(bind=engine) 
    
    # Run our seeder
    initialize_modules()
    print("⚔️ The Citadel's modules have been forged in the database!")


# Connect the routers to the main app
app.include_router(auth_router)
app.include_router(files_router)  
app.include_router(auth_router)
app.include_router(quizzes.router)
app.include_router(files_router, dependencies=[Depends(verify_csrf)]) 
app.include_router(files.router)
app.include_router(leaderboard.router)

@app.get("/")
def read_root():
    return {"message": "Valar Dohaeris. The API is running."}