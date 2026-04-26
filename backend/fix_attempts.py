import asyncio
from database import get_db, SessionLocal
from sqlalchemy import select
from models.attempts import QuizAttempt, QuestionAttempt
from models.quiz import Question

async def fix_attempts():
    async with SessionLocal() as db:
        attempts = (await db.execute(select(QuizAttempt).filter(QuizAttempt.status == 'COMPLETED'))).scalars().all()
        for attempt in attempts:
            q_attempt = (await db.execute(select(QuestionAttempt).filter(QuestionAttempt.quiz_attempt_id == attempt.id))).scalars().first()
            if q_attempt:
                question = (await db.execute(select(Question).filter(Question.id == q_attempt.question_id))).scalars().first()
                if question and attempt.quiz_version != question.version:
                    print(f"Fixing attempt {attempt.id}: version {attempt.quiz_version} -> {question.version}")
                    attempt.quiz_version = question.version
        await db.commit()

if __name__ == "__main__":
    asyncio.run(fix_attempts())
