# backend/apis/leaderboard.py

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models.attempts import QuizAttempt
from models.user import User
from models.quiz import Quiz

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


@router.get("")
async def get_global_leaderboard(db: AsyncSession = Depends(get_db)):
    # Total points and time from all attempts per user
    points_sub = (
        select(
            QuizAttempt.user_id,
            func.sum(QuizAttempt.total_marks).label("total_score"),
            func.sum(QuizAttempt.time_consumed_seconds).label("total_time"),
        )
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(Quiz.is_deleted == False)
        .group_by(QuizAttempt.user_id)
        .subquery()
    )

    # Total quizzes created per user
    created_sub = (
        select(
            Quiz.created_user_id.label("user_id"),
            func.count(Quiz.id).label("quizzes_created"),
        )
        .filter(Quiz.is_deleted == False)
        .group_by(Quiz.created_user_id)
        .subquery()
    )

    stmt = (
        select(
            User.id,
            User.first_name,
            User.last_name,
            func.coalesce(points_sub.c.total_score, 0).label("global_score"),
            func.coalesce(points_sub.c.total_time, 0).label("global_time"),
            func.coalesce(created_sub.c.quizzes_created, 0).label("quizzes_made"),
        )
        .outerjoin(points_sub, User.id == points_sub.c.user_id)
        .outerjoin(created_sub, User.id == created_sub.c.user_id)
        .order_by(
            func.coalesce(points_sub.c.total_score, 0).desc(),
            func.coalesce(created_sub.c.quizzes_created, 0).desc(),
        )
        .limit(100)
    )

    result = await db.execute(stmt)
    ranked_users = result.all()

    leaderboard_data = []
    for rank, row in enumerate(ranked_users, start=1):
        if (row.global_score or 0) > 0 or (row.quizzes_made or 0) > 0:
            leaderboard_data.append({
                "rank": rank,
                "user_id": row.id,
                "name": f"{row.first_name} {row.last_name or ''}".strip(),
                "total_score": float(row.global_score or 0),
                "total_time": int(row.global_time or 0),
                "quizzes_created": int(row.quizzes_made or 0),
            })

    return leaderboard_data