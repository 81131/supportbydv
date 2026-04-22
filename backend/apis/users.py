from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from database import get_db
from models.user import User, UserAchievement
from models.attempts import QuizAttempt
from models.quiz import Quiz
from security import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["Users"])


# ── Shared helpers ─────────────────────────────────────────────────────────

from sqlalchemy.orm import joinedload

async def _get_ordered_achievements(user_id: int, db: AsyncSession):
    return (await db.execute(
        select(UserAchievement)
        .options(joinedload(UserAchievement.achievement))
        .filter(
            UserAchievement.user_id == user_id,
            UserAchievement.is_valid == True
        ).order_by(
            case(
                (UserAchievement.priority == 0, 99999),
                else_=UserAchievement.priority
            ).asc(),
            UserAchievement.achieved_at.desc()
        )
    )).scalars().all()


def _serialize_achievements(achievements_db):
    out = []
    for ua in achievements_db:
        out.append({
            "ua_id": ua.id,
            "name": ua.achievement.name,
            "description": ua.achievement.description,
            "badge_image_url": ua.achievement.badge_image_url,
            "frame_name": ua.achievement.frame_name,
            "condition": ua.achievement.condition,
            "achieved_at": ua.achieved_at,
            "priority": ua.priority,
        })
    return out


# ── Public profile endpoint ─────────────────────────────────────────────────

@router.get("/{user_id}/public")
async def get_public_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).filter(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Per-user score stats
    score_row = (await db.execute(
        select(
            func.sum(QuizAttempt.total_marks).label("total_score"),
            func.sum(QuizAttempt.time_consumed_seconds).label("total_time"),
        )
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(QuizAttempt.user_id == user_id, Quiz.is_deleted == False)
    )).first()

    quiz_count_row = (await db.execute(
        select(func.count(Quiz.id).label("quizzes_created"))
        .filter(Quiz.created_user_id == user_id, Quiz.is_deleted == False)
    )).first()

    total_score = float(score_row.total_score if score_row and score_row.total_score else 0)
    total_time = int(score_row.total_time if score_row and score_row.total_time else 0)
    quizzes_made = int(quiz_count_row.quizzes_created if quiz_count_row and quiz_count_row.quizzes_created else 0)

    # Global ranking
    all_points_sub = (
        select(QuizAttempt.user_id, func.sum(QuizAttempt.total_marks).label("total_score"))
        .join(Quiz, Quiz.id == QuizAttempt.quiz_id)
        .filter(Quiz.is_deleted == False)
        .group_by(QuizAttempt.user_id)
        .subquery()
    )
    all_created_sub = (
        select(Quiz.created_user_id.label("user_id"), func.count(Quiz.id).label("quizzes_created"))
        .filter(Quiz.is_deleted == False)
        .group_by(Quiz.created_user_id)
        .subquery()
    )

    ranked_stmt = (
        select(
            User.id,
            func.coalesce(all_points_sub.c.total_score, 0).label("global_score"),
        )
        .outerjoin(all_points_sub, User.id == all_points_sub.c.user_id)
        .outerjoin(all_created_sub, User.id == all_created_sub.c.user_id)
        .order_by(
            func.coalesce(all_points_sub.c.total_score, 0).desc(),
            func.coalesce(all_created_sub.c.quizzes_created, 0).desc(),
        )
    )
    ranked_users = (await db.execute(ranked_stmt)).all()

    global_rank = 0
    for idx, row in enumerate(ranked_users, start=1):
        if row.id == user_id:
            global_rank = idx
            break

    achievements_out = _serialize_achievements(await _get_ordered_achievements(user_id, db))

    return {
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "picture": user.picture,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "bio": user.bio,
            "linkedin_url": user.linkedin_url,
            "github_url": user.github_url,
            "instagram_url": user.instagram_url,
            "facebook_url": user.facebook_url,
            "public_email": user.public_email,
            "created_at": user.created_at,
        },
        "stats": {
            "global_rank": global_rank,
            "total_score": total_score,
            "total_time": total_time,
            "quizzes_created": quizzes_made,
        },
        "achievements": achievements_out,
    }


# ── My Achievements endpoints (authenticated) ───────────────────────────────

@router.get("/me/achievements")
async def get_my_achievements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the authenticated user's own achievements (ordered by priority)."""
    return _serialize_achievements(await _get_ordered_achievements(current_user.id, db))


class PriorityUpdate(BaseModel):
    priority: int  # 0 = lowest (displayed last), 1–10 = ascending importance


@router.patch("/me/achievements/{ua_id}/priority")
async def update_achievement_priority(
    ua_id: int,
    payload: PriorityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update display priority for one of the current user's achievements."""
    ua = (await db.execute(
        select(UserAchievement).filter(
            UserAchievement.id == ua_id,
            UserAchievement.user_id == current_user.id,
        )
    )).scalars().first()
    if not ua:
        raise HTTPException(status_code=404, detail="Achievement not found")
    if not (0 <= payload.priority <= 10):
        raise HTTPException(status_code=422, detail="Priority must be between 0 and 10")
    ua.priority = payload.priority
    await db.commit()
    return {"ua_id": ua_id, "priority": ua.priority}
