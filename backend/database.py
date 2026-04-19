import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator

# Fetch the database URL from the environment and ensure it uses asyncpg
raw_url = os.environ["DATABASE_URL"]
if raw_url.startswith("postgresql://"):
    SQLALCHEMY_DATABASE_URL = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    SQLALCHEMY_DATABASE_URL = raw_url

# Create the async engine
engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=False)

# Create an async session maker
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

# Base class for our database models
Base = declarative_base()

# Dependency to get the database session in our routes
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as db:
        try:
            yield db
        finally:
            await db.close()