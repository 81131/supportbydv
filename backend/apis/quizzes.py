from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.quiz import Quiz, Question, AnswerOption, QuestionType
from models.attempts import QuizAttempt, QuestionAttempt
from models.notification import Notification
from schemas.quiz import QuizCreate, QuizSubmission
from models.user import User, UserRole
from security import get_current_user
from pydantic import BaseModel
from sqlalchemy import func


router = APIRouter(prefix="/quizzes", tags=["Quizzes"])

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_quiz(quiz_in: QuizCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_quiz = Quiz(
        title=quiz_in.title, 
        description=quiz_in.description, 
        module_id=quiz_in.module_id,
        created_user_id=current_user.id, 
        is_timed=quiz_in.is_timed, 
        time_limit_minutes=quiz_in.time_limit_minutes,
        is_recommended=False # Defaults to False. Only No One can change this later.
    )
    db.add(new_quiz)
    db.flush() 

    for q_data in quiz_in.questions:
        new_question = Question(
            quiz_id=new_quiz.id, text=q_data.text, type=q_data.type, marks=q_data.marks,
            negative_marks=q_data.negative_marks, image_url=q_data.image_url,
            correct_number=q_data.correct_number, correct_text=q_data.correct_text
        )
        db.add(new_question)
        db.flush() 
        if q_data.options:
            for opt_data in q_data.options:
                new_opt = AnswerOption(question_id=new_question.id, text=opt_data.text, is_correct=opt_data.is_correct)
                db.add(new_opt)

    db.commit()
    db.refresh(new_quiz)
    return {"message": "Scroll successfully forged!", "quiz_id": new_quiz.id}


@router.get("/me")
def get_my_quizzes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch all scrolls forged by the current scholar."""
    quizzes = db.query(Quiz).filter(Quiz.created_user_id == current_user.id).all()
    # Attach question count and attempt count for the dashboard
    result = []
    for q in quizzes:
        q_count = db.query(Question).filter(Question.quiz_id == q.id, Question.version == q.version).count()
        a_count = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == q.id).count()
        result.append({
            "id": q.id, "title": q.title, "description": q.description,
            "question_count": q_count, "attempt_count": a_count,
            "created_at": q.created_at
        })
    return result

@router.get("/module/{module_id}")
def get_quizzes_by_module(module_id: int, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).filter(Quiz.module_id == module_id, Quiz.is_deleted == False).offset(offset).limit(limit).all()
    
    result = []
    for q in quizzes:
        # 1. Fetch creator to extract the role securely
        creator = db.query(User).filter(User.id == q.created_user_id).first()
        
        # 2. Safely extract the role (Handling SQLAlchemy Enum weirdness)
        if creator and hasattr(creator.role, 'value'):
            creator_role = creator.role.value
        elif creator:
            creator_role = str(creator.role).replace('UserRole.', '')
        else:
            creator_role = "user"
        
        # 3. Append EVERYTHING to the result
        result.append({
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "module_id": q.module_id,
            "created_user_id": q.created_user_id,
            "creator_role": creator_role, # 👈 The missing piece!
            "is_recommended": q.is_recommended,
            "is_pinned": q.is_pinned,
            "is_timed": q.is_timed,
            "time_limit_minutes": q.time_limit_minutes
        })
        
    return result

@router.get("/{quiz_id}")
def get_single_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.is_deleted == False).first()
    if not quiz: 
        raise HTTPException(status_code=404, detail="Scroll not found.")
    
    creator = db.query(User).filter(User.id == quiz.created_user_id).first()
    creator_role = creator.role.value if creator else "user"
    
    questions_list = []
    # Filter questions by current quiz version
    current_questions = db.query(Question).filter(Question.quiz_id == quiz_id, Question.version == quiz.version).all()
    
    for q in current_questions:
        options_list = [{"text": opt.text, "is_correct": opt.is_correct} for opt in q.options]
        questions_list.append({
            "text": q.text, "type": q.type.value if hasattr(q.type, 'value') else q.type,
            "marks": q.marks, "negative_marks": q.negative_marks, "image_url": q.image_url,
            "correct_number": q.correct_number, "correct_text": q.correct_text, "options": options_list
        })
        
    return {
        "id": quiz.id, 
        "title": quiz.title, 
        "description": quiz.description, 
        "module_id": quiz.module_id,
        "created_user_id": quiz.created_user_id,
        "creator_role": creator_role,
        "is_recommended": quiz.is_recommended,
        "is_timed": quiz.is_timed, 
        "time_limit_minutes": quiz.time_limit_minutes, 
        "questions": questions_list
    }


@router.put("/{quiz_id}")
def update_quiz(quiz_id: int, quiz_in: QuizCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.is_deleted == False).first()
    if not quiz: 
        raise HTTPException(status_code=404, detail="Scroll not found.")
    if quiz.created_user_id != current_user.id: 
        raise HTTPException(status_code=403, detail="Unauthorized.")
    
    # 1. Increment total quiz version
    quiz.title = quiz_in.title
    quiz.description = quiz_in.description
    quiz.module_id = quiz_in.module_id
    quiz.is_timed = quiz_in.is_timed
    quiz.time_limit_minutes = quiz_in.time_limit_minutes
    quiz.version = quiz.version + 1  
    
    # 2. Add new versions of these questions (Protecting history)
    db.flush() 

    for q_data in quiz_in.questions:
        new_question = Question(
            quiz_id=quiz.id, 
            text=q_data.text, 
            type=q_data.type, 
            marks=q_data.marks, 
            negative_marks=q_data.negative_marks, 
            image_url=q_data.image_url, 
            correct_number=q_data.correct_number, 
            correct_text=q_data.correct_text,
            version=quiz.version # 👈 Link to this specific version!
        )
        db.add(new_question)
        db.flush() 
        if q_data.options:
            for opt_data in q_data.options:
                new_opt = AnswerOption(question_id=new_question.id, text=opt_data.text, is_correct=opt_data.is_correct)
                db.add(new_opt)
    
    db.commit()
    return {"message": "Scroll successfully revised! Old attempts remain valid for past versions."}


@router.delete("/{quiz_id}")
def delete_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.is_deleted == False).first()
    if not quiz: 
        raise HTTPException(status_code=404, detail="Scroll not found.")
    if not (quiz.created_user_id == current_user.id or current_user.role == UserRole.ADMIN or current_user.role == UserRole.NO_ONE):
        raise HTTPException(status_code=403, detail="Unauthorized.")
    
    quiz.is_deleted = True
    db.commit()
    return {"message": "Scroll deleted."}


# ==========================================
# THE QUIZ ENGINE (SAFE FETCH & GRADING)
# ==========================================

@router.get("/{quiz_id}/take")
def get_safe_quiz_for_taking(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.is_deleted == False).first()
    if not quiz: 
        raise HTTPException(status_code=404, detail="Scroll not found.")
    
    creator = db.query(User).filter(User.id == quiz.created_user_id).first()
    creator_role = creator.role.value if creator else "user"
    
    safe_questions = []
    # Only fetch questions for the CURRENT version of the quiz
    current_questions = db.query(Question).filter(Question.quiz_id == quiz_id, Question.version == quiz.version).all()
    
    for q in current_questions:
        options_list = [{"id": opt.id, "text": opt.text} for opt in q.options] 
        safe_questions.append({
            "id": q.id, "text": q.text, "type": q.type.value if hasattr(q.type, 'value') else q.type,
            "marks": q.marks, "image_url": q.image_url, "options": options_list
        })

    return {
        "id": quiz.id, 
        "title": quiz.title, 
        "description": quiz.description,
        "creator_role": creator_role,
        "is_recommended": quiz.is_recommended,
        "is_timed": quiz.is_timed, 
        "time_limit_minutes": quiz.time_limit_minutes, 
        "questions": safe_questions
    }

@router.post("/{quiz_id}/submit")
def submit_and_grade_quiz(
    quiz_id: int, 
    submission: QuizSubmission, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.is_deleted == False).first()
    if not quiz: 
        raise HTTPException(status_code=404, detail="Scroll not found.")

    student_answers = {ans.question_id: ans for ans in submission.answers}
    
    total_score = 0.0
    # We grade against the version of the quiz that exists RIGHT NOW 
    # (unless we want to support taking old versions, but usually we take the latest)
    current_questions = db.query(Question).filter(Question.quiz_id == quiz_id, Question.version == quiz.version).all()
    max_score = sum([q.marks for q in current_questions])
    review_details = []

    past_attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == current_user.id).count()
    current_attempt_number = past_attempts + 1

    attempt = QuizAttempt(
        user_id=current_user.id, 
        quiz_id=quiz.id, 
        total_marks=0.0, 
        time_consumed_seconds=submission.time_consumed_seconds,
        attempt_number=current_attempt_number,
        quiz_version=quiz.version
    )
    db.add(attempt)
    db.flush()

    for q in current_questions:
        q_type = q.type.value if hasattr(q.type, 'value') else q.type
        ans_data = student_answers.get(q.id)
        marks_awarded = 0.0
        is_correct = False
        
        user_answer_display = "No answer provided"
        correct_answer_display = ""
        user_answer_db_string = ""
        needs_manual_review = False

        if ans_data:
            if q_type == "MCQ":
                correct_opt_ids = [opt.id for opt in q.options if opt.is_correct]
                correct_texts = [opt.text for opt in q.options if opt.is_correct]
                correct_answer_display = ", ".join(correct_texts)
                
                selected_opts = [opt.text for opt in q.options if opt.id in ans_data.selected_options]
                user_answer_display = ", ".join(selected_opts) if selected_opts else "None selected"
                user_answer_db_string = user_answer_display

                if set(ans_data.selected_options) == set(correct_opt_ids):
                    marks_awarded = q.marks
                    is_correct = True
                elif len(ans_data.selected_options) > 0 and q.negative_marks:
                    marks_awarded = -abs(q.negative_marks)
            
            elif q_type == "CHECKBOX":
                correct_opt_ids = [opt.id for opt in q.options if opt.is_correct]
                wrong_opt_ids = [opt.id for opt in q.options if not opt.is_correct]
                correct_texts = [opt.text for opt in q.options if opt.is_correct]
                correct_answer_display = ", ".join(correct_texts)
                
                selected_opts = [opt.text for opt in q.options if opt.id in ans_data.selected_options]
                user_answer_display = ", ".join(selected_opts) if selected_opts else "None selected"
                user_answer_db_string = user_answer_display

                num_correct_selected = len([opt for opt in ans_data.selected_options if opt in correct_opt_ids])
                num_wrong_selected = len([opt for opt in ans_data.selected_options if opt in wrong_opt_ids])
                
                num_total_correct = len(correct_opt_ids) or 1
                num_total_wrong = len(wrong_opt_ids) or 1
                
                pos_points_per_correct = q.marks / num_total_correct
                neg_points_per_wrong = q.marks / num_total_wrong
                
                marks_awarded = (pos_points_per_correct * num_correct_selected) - (neg_points_per_wrong * num_wrong_selected)
                if marks_awarded < 0:
                    marks_awarded = 0.0
                is_correct = (marks_awarded == q.marks)

            elif q_type == "NUMBER":
                correct_answer_display = str(q.correct_number)
                user_answer_display = str(ans_data.numeric_answer) if ans_data.numeric_answer is not None else "None"
                user_answer_db_string = user_answer_display
                
                if ans_data.numeric_answer == q.correct_number:
                    marks_awarded = q.marks
                    is_correct = True

            elif q_type == "SHORT_TEXT":
                correct_answer_display = q.correct_text
                user_answer_display = ans_data.text_answer or "None"
                user_answer_db_string = user_answer_display
                
                if user_answer_display.lower().strip() == correct_answer_display.lower().strip():
                    marks_awarded = q.marks
                    is_correct = True

            elif q_type == "ESSAY":
                correct_answer_display = "Manual review required. Rubric: " + (q.correct_text or "")
                user_answer_display = ans_data.text_answer or "None"
                user_answer_db_string = user_answer_display
                marks_awarded = 0.0 
                needs_manual_review = True

        total_score += marks_awarded

        q_attempt = QuestionAttempt(
            quiz_attempt_id=attempt.id, 
            question_id=q.id, 
            marks_awarded=marks_awarded,
            user_answer=user_answer_db_string,
            needs_manual_review=needs_manual_review
        )
        db.add(q_attempt)

        review_details.append({
            "question_text": q.text, "type": q_type, "marks_awarded": marks_awarded,
            "max_marks": q.marks, "is_correct": is_correct, "user_answer": user_answer_display,
            "correct_answer": correct_answer_display
        })

    attempt.total_marks = total_score
    db.commit()

    return {
        "message": "Trial complete.",
        "score": total_score,
        "max_score": max_score,
        "attempt_number": current_attempt_number,
        "review": review_details
    }


class GovernanceToggle(BaseModel):
    is_pinned: bool = None
    is_recommended: bool = None

@router.put("/{quiz_id}/governance")
def toggle_quiz_governance(
    quiz_id: int, 
    flags: GovernanceToggle, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "noOne":
        raise HTTPException(status_code=403, detail="Only No One possesses this power.")
        
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Scroll not found.")
        
    if flags.is_pinned is not None:
        quiz.is_pinned = flags.is_pinned
    if flags.is_recommended is not None:
        quiz.is_recommended = flags.is_recommended
        
    db.commit()
    return {"message": "The Citadel's archives have been updated."}

@router.get("/{quiz_id}/analytics")
def get_quiz_analytics(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz: raise HTTPException(status_code=404, detail="Scroll not found")
    if current_user.id != quiz.created_user_id and current_user.role not in [UserRole.ADMIN, UserRole.NO_ONE]:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).all()
    total_attempts = len(attempts)
    if total_attempts == 0:
        return {"total_attempts": 0, "pass_rate": 0, "highest_failure_question": None}
        
    max_marks = sum(q.marks for q in quiz.questions)
    passing_score = max_marks * 0.5
    
    passes = sum(1 for a in attempts if a.total_marks >= passing_score)
    pass_rate = (passes / total_attempts) * 100
    
    # Identify hardest question
    q_attempts = db.query(QuestionAttempt.question_id, func.avg(QuestionAttempt.marks_awarded).label("avg_marks")).join(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).group_by(QuestionAttempt.question_id).all()
    
    hardest_q_id = min(q_attempts, key=lambda x: x.avg_marks)[0] if q_attempts else None
    
    return {
        "total_attempts": total_attempts,
        "pass_rate": round(pass_rate, 2),
        "highest_failure_question_id": hardest_q_id
    }

class ReviewSubmission(BaseModel):
    question_attempt_id: int
    marks_awarded: float
    feedback: str = ""

@router.post("/review")
def review_essay_question(
    submission: ReviewSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q_attempt = db.query(QuestionAttempt).filter(QuestionAttempt.id == submission.question_attempt_id).first()
    if not q_attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
        
    attempt = db.query(QuizAttempt).filter(QuizAttempt.id == q_attempt.quiz_attempt_id).first()
    quiz = db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()
    
    if not quiz or (quiz.created_user_id != current_user.id and current_user.role.value != "noOne"):
        raise HTTPException(status_code=403, detail="Unauthorized to review")
        
    difference_in_marks = submission.marks_awarded - q_attempt.marks_awarded
    q_attempt.marks_awarded = submission.marks_awarded
    q_attempt.needs_manual_review = False
    attempt.total_marks += difference_in_marks
    
    msg = f"Your essay in '{quiz.title}' has been graded!"
    if submission.feedback:
        msg += f" Feedback: {submission.feedback}"
        
    notification = Notification(
        user_id=attempt.user_id,
        message=msg
    )
    db.add(notification)
    db.commit()
    
    return {"message": "The Raven has been sent to the student."}

@router.get("/{quiz_id}/review-tasks")
def get_review_tasks(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch essay questions that need manual grading for a specific quiz."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz: raise HTTPException(status_code=404, detail="Quiz not found.")
    if quiz.created_user_id != current_user.id and current_user.role.value != "noOne":
        raise HTTPException(status_code=403, detail="You did not forge this trial.")

    # Find all question attempts for essay questions that haven't been reviewed
    # We join Question to filter for ESSAY type
    tasks = db.query(QuestionAttempt).join(Question).filter(
        Question.quiz_id == quiz_id,
        Question.type == QuestionType.ESSAY,
        QuestionAttempt.needs_manual_review == True
    ).all()

    result = []
    for t in tasks:
        student = db.query(User).filter(User.id == t.quiz_attempt.user_id).first()
        result.append({
            "id": t.id,
            "question_text": t.question.text,
            "student_answer": t.user_answer,
            "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown Student",
            "marks_max": t.question.marks
        })
    return result