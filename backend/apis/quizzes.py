# backend/apis/quizzes.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.quiz import Quiz, Question, AnswerOption
from schemas.quiz import QuizCreate
# from apis.auth import get_current_user # Uncomment when you have a get_current_user dependency

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_quiz(quiz_in: QuizCreate, db: Session = Depends(get_db)):
    
    # 1. Create the base Quiz record
    new_quiz = Quiz(
        title=quiz_in.title,
        description=quiz_in.description,
        module_id=quiz_in.module_id,
        created_user_id=1 # ⚠️ Replace '1' with current_user.id once auth dependency is added
    )
    db.add(new_quiz)
    db.flush() # Gets the ID without committing to DB yet

    # 2. Iterate and create Questions
    for q_data in quiz_in.questions:
        new_question = Question(
            quiz_id=new_quiz.id,
            text=q_data.text,
            type=q_data.type,
            marks=q_data.marks,
            negative_marks=q_data.negative_marks,
            image_url=q_data.image_url,
            correct_number=q_data.correct_number,
            correct_text=q_data.correct_text
        )
        db.add(new_question)
        db.flush() # Gets question ID

        # 3. Iterate and create Answer Options (for MCQ/Checkbox)
        if q_data.options:
            for opt_data in q_data.options:
                new_opt = AnswerOption(
                    question_id=new_question.id,
                    text=opt_data.text,
                    is_correct=opt_data.is_correct
                )
                db.add(new_opt)

    # 4. Save everything at once!
    db.commit()
    db.refresh(new_quiz)
    
    return {"message": "Quiz successfully forged in the Citadel!", "quiz_id": new_quiz.id}