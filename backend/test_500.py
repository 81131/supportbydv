import asyncio
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from database import get_db, Base, engine
from models.user import User
from models.quiz import Quiz, Question, QuestionType
from models.attempts import QuizAttempt, QuestionAttempt

async def test():
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as db:
        # Create user, quiz, attempt
        user = User(username="test_500", email="test@test.com", password_hash="hash")
        db.add(user)
        await db.commit()
        await db.refresh(user)

        quiz = Quiz(title="test", created_user_id=user.id)
        db.add(quiz)
        await db.commit()
        await db.refresh(quiz)

        attempt = QuizAttempt(user_id=user.id, quiz_id=quiz.id, status="IN_PROGRESS")
        db.add(attempt)
        await db.commit()
        await db.refresh(attempt)
        
        qa = QuestionAttempt(quiz_attempt_id=attempt.id, question_id=1, marks_awarded=0.0)
        db.add(qa)
        await db.commit()

        print("Created attempt ID:", attempt.id)

if __name__ == "__main__":
    asyncio.run(test())
