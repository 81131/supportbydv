from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.quiz import Quiz, Question, AnswerOption
from models.attempts import QuizAttempt, QuestionAttempt
from schemas.quiz import QuizCreate, QuizSubmission
from models.user import User, UserRole
from security import get_current_user

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


@router.get("/module/{module_id}")
def get_quizzes_by_module(module_id: int, db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).filter(Quiz.module_id == module_id, Quiz.is_deleted == False).all()
    
    result = []
    for q in quizzes:
        # Fetch creator to extract the role securely
        creator = db.query(User).filter(User.id == q.created_user_id).first()
        creator_role = creator.role.value if creator else "user"
        
        result.append({
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "module_id": q.module_id,
            "created_user_id": q.created_user_id,
            "creator_role": creator_role,
            "is_recommended": q.is_recommended,
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
    for q in quiz.questions:
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
    
    quiz.title = quiz_in.title
    quiz.description = quiz_in.description
    quiz.module_id = quiz_in.module_id
    quiz.is_timed = quiz_in.is_timed
    quiz.time_limit_minutes = quiz_in.time_limit_minutes
    
    attempt_ids = [a.id for a in db.query(QuizAttempt.id).filter(QuizAttempt.quiz_id == quiz_id).all()]
    if attempt_ids:
        db.query(QuestionAttempt).filter(QuestionAttempt.quiz_attempt_id.in_(attempt_ids)).delete(synchronize_session=False)
        db.query(QuizAttempt).filter(QuizAttempt.id.in_(attempt_ids)).delete(synchronize_session=False)
    
    question_ids = [q.id for q in db.query(Question.id).filter(Question.quiz_id == quiz_id).all()]
    if question_ids: 
        db.query(AnswerOption).filter(AnswerOption.question_id.in_(question_ids)).delete(synchronize_session=False)
    
    db.query(Question).filter(Question.quiz_id == quiz_id).delete(synchronize_session=False)
    db.flush() 

    for q_data in quiz_in.questions:
        new_question = Question(
            quiz_id=quiz.id, text=q_data.text, type=q_data.type, marks=q_data.marks, negative_marks=q_data.negative_marks, 
            image_url=q_data.image_url, correct_number=q_data.correct_number, correct_text=q_data.correct_text
        )
        db.add(new_question)
        db.flush() 
        if q_data.options:
            for opt_data in q_data.options:
                new_opt = AnswerOption(question_id=new_question.id, text=opt_data.text, is_correct=opt_data.is_correct)
                db.add(new_opt)
    db.commit()
    return {"message": "Scroll successfully revised! Previous attempts have been cleared to ensure fairness."}


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
    for q in quiz.questions:
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
    max_score = sum([q.marks for q in quiz.questions])
    review_details = []

    past_attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == current_user.id).count()
    current_attempt_number = past_attempts + 1

    attempt = QuizAttempt(
        user_id=current_user.id, 
        quiz_id=quiz.id, 
        total_marks=0.0, 
        time_consumed_seconds=submission.time_consumed_seconds,
        attempt_number=current_attempt_number
    )
    db.add(attempt)
    db.flush()

    for q in quiz.questions:
        q_type = q.type.value if hasattr(q.type, 'value') else q.type
        ans_data = student_answers.get(q.id)
        marks_awarded = 0.0
        is_correct = False
        
        user_answer_display = "No answer provided"
        correct_answer_display = ""
        user_answer_db_string = ""

        if ans_data:
            if q_type == "MCQ" or q_type == "CHECKBOX":
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

        total_score += marks_awarded

        q_attempt = QuestionAttempt(
            quiz_attempt_id=attempt.id, 
            question_id=q.id, 
            marks_awarded=marks_awarded,
            user_answer=user_answer_db_string
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