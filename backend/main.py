import os
import time
from backend.security import verify_csrf
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError
from apis.files import router as files_router  

# Importing the models package triggers your __init__.py loop, 
# registering ALL tables with SQLAlchemy automatically.
import models
from database import engine

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

# Connect the routers to the main app
app.include_router(auth_router)
app.include_router(files_router)  
app.include_router(auth_router)
app.include_router(files_router, dependencies=[Depends(verify_csrf)]) # Protects all file routes

@app.get("/")
def read_root():
    return {"message": "Valar Dohaeris. The API is running."}