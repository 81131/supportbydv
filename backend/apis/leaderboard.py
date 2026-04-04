# backend/apis/leaderboard.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.attempts import QuizAttempt
from models.user import User
from models.quiz import Quiz

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])

@router.get("")
def get_global_leaderboard(db: Session = Depends(get_db)):
    # Total points from all attempts
    points_subquery = db.query(
        QuizAttempt.user_id,
        func.sum(QuizAttempt.total_marks).label("total_score"),
        func.sum(QuizAttempt.time_consumed_seconds).label("total_time")
    ).group_by(QuizAttempt.user_id).subquery()

    # Total quizzes created
    created_subquery = db.query(
        Quiz.created_user_id.label("user_id"),
        func.count(Quiz.id).label("quizzes_created")
    ).filter(Quiz.is_deleted == False).group_by(Quiz.created_user_id).subquery()

    ranked_users = db.query(
        User.id,
        User.first_name,
        User.last_name,
        func.coalesce(points_subquery.c.total_score, 0).label("global_score"),
        func.coalesce(points_subquery.c.total_time, 0).label("global_time"),
        func.coalesce(created_subquery.c.quizzes_created, 0).label("quizzes_made")
    ).outerjoin(
        points_subquery, User.id == points_subquery.c.user_id
    ).outerjoin(
        created_subquery, User.id == created_subquery.c.user_id
    ).order_by(
        func.coalesce(points_subquery.c.total_score, 0).desc(),
        func.coalesce(created_subquery.c.quizzes_created, 0).desc()
    ).limit(100).all()

    leaderboard_data = []
    for rank, row in enumerate(ranked_users, start=1):
        # Omit users with 0 points and 0 quizzes
        if (row.global_score or 0) > 0 or (row.quizzes_made or 0) > 0:
            leaderboard_data.append({
                "rank": rank,
                "user_id": row.id,
                "name": f"{row.first_name} {row.last_name or ''}".strip(),
                "total_score": float(row.global_score or 0),
                "total_time": int(row.global_time or 0),
                "quizzes_created": int(row.quizzes_made or 0)
            })

    return leaderboard_data