import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, selectinload
from sqlalchemy import Column, Integer, ForeignKey

Base = declarative_base()

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(Integer, primary_key=True)
    question_attempts = relationship("QuestionAttempt", cascade="all, delete-orphan")

class QuestionAttempt(Base):
    __tablename__ = "question_attempts"
    id = Column(Integer, primary_key=True)
    quiz_attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"))

async def test():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as db:
        attempt = QuizAttempt()
        db.add(attempt)
        await db.commit()
        
        qa = QuestionAttempt(quiz_attempt_id=attempt.id)
        db.add(qa)
        await db.commit()

        # Eager load attempt
        from sqlalchemy import select
        att = (await db.execute(select(QuizAttempt).options(selectinload(QuizAttempt.question_attempts)))).scalars().first()
        
        # Delete manually
        existing = (await db.execute(select(QuestionAttempt))).scalars().all()
        for q in existing:
            await db.delete(q)
        await db.flush()
        
        # Add new
        new_qa = QuestionAttempt(quiz_attempt_id=att.id)
        db.add(new_qa)
        
        try:
            await db.commit()
            print("SUCCESS")
        except Exception as e:
            print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(test())
