# backend/apis/leaderboard.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models.attempts import QuizAttempt
from models.user import User

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])

@router.get("/")
def get_global_leaderboard(db: Session = Depends(get_db)):
    # Step 1: Subquery to find the MAX score a user got on EACH specific quiz
    # We also take the minimum time they spent achieving that max score
    best_attempts_subquery = db.query(
        QuizAttempt.user_id,
        QuizAttempt.quiz_id,
        func.max(QuizAttempt.total_marks).label("best_score"),
        func.min(QuizAttempt.time_consumed_seconds).label("best_time")
    ).group_by(QuizAttempt.user_id, QuizAttempt.quiz_id).subquery()

    # Step 2: Sum up those "best scores" for each user to get their global rank
    ranked_users = db.query(
        User.id,
        User.first_name,
        User.last_name,
        func.sum(best_attempts_subquery.c.best_score).label("global_score"),
        func.sum(best_attempts_subquery.c.best_time).label("global_time")
    ).join(
        best_attempts_subquery, User.id == best_attempts_subquery.c.user_id
    ).group_by(
        User.id, User.first_name, User.last_name
    ).order_by(
        func.sum(best_attempts_subquery.c.best_score).desc(), # Highest score first
        func.sum(best_attempts_subquery.c.best_time).asc()    # Lowest time breaks ties
    ).limit(100).all() # Top 100 scholars

    # Step 3: Format the response
    leaderboard_data = []
    for rank, row in enumerate(ranked_users, start=1):
        leaderboard_data.append({
            "rank": rank,
            "user_id": row.id,
            "name": f"{row.first_name} {row.last_name or ''}".strip(),
            "total_score": float(row.global_score or 0),
            "total_time": int(row.global_time or 0)
        })

    return leaderboard_data