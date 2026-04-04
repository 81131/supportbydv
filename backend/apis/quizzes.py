import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
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

QUIZ_RESOURCE_DIR = "uploads/quiz_resources"
os.makedirs(QUIZ_RESOURCE_DIR, exist_ok=True)

@router.post("/resources/upload")
async def upload_quiz_resource(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Uploads a resource file for a quiz. Returns the safe file path."""
    file_extension = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    
    # 10MB limit
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Resource size exceeds 10MB limit.")
        
    safe_filename = f"user_{current_user.id}_{file.filename}"
    file_path = os.path.join(QUIZ_RESOURCE_DIR, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"message": "Resource uploaded successfully.", "file_url": file_path}

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_quiz(quiz_in: QuizCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_quiz = Quiz(
        title=quiz_in.title, 
        description=quiz_in.description, 
        module_id=quiz_in.module_id,
        created_user_id=current_user.id, 
        is_timed=quiz_in.is_timed, 
        time_limit_minutes=quiz_in.time_limit_minutes,
        consent_text=quiz_in.consent_text,
        allowed_tools=quiz_in.allowed_tools,
        allowed_resources=quiz_in.allowed_resources,
        is_published=quiz_in.is_published,
        is_recommended=False
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
            "is_published": q.is_published,
            "created_at": q.created_at
        })
    return result

@router.get("/analytics/me")
def get_my_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch comprehensive performance matrices comparing student vs peers."""
    my_attempts = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id, QuizAttempt.status == "COMPLETED").all()
    
    analytics = []
    
    for attempt in my_attempts:
        quiz = db.query(Quiz).filter(Quiz.id == attempt.quiz_id).first()
        if not quiz: continue
        
        # 1. Fetch ALL completed attempts for THIS quiz to calculate peer averages
        all_attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id, QuizAttempt.status == "COMPLETED").all()
        
        total_peer_score = sum(a.total_marks for a in all_attempts)
        total_peer_time = sum(a.time_consumed_seconds for a in all_attempts)
        peer_count = len(all_attempts)
        
        avg_peer_score = round(total_peer_score / peer_count, 2) if peer_count > 0 else 0
        avg_peer_time = round(total_peer_time / peer_count, 2) if peer_count > 0 else 0
        
        # 2. Per-question time average for THIS specific attempt vs peers
        questions_stats = []
        for qa in attempt.question_attempts:
            # Find peer attempts for this specific question
            peer_q_attempts = db.query(QuestionAttempt).join(QuizAttempt).filter(
                QuestionAttempt.question_id == qa.question_id,
                QuizAttempt.status == "COMPLETED"
            ).all()
            
            p_q_time = sum(pqa.time_spent_seconds for pqa in peer_q_attempts)
            p_q_count = len(peer_q_attempts)
            avg_p_q_time = round(p_q_time / p_q_count, 1) if p_q_count > 0 else 0
            
            questions_stats.append({
                "question_id": qa.question_id,
                "marks_awarded": qa.marks_awarded,
                "time_spent_seconds": qa.time_spent_seconds,
                "peer_avg_time_seconds": avg_p_q_time
            })
            
        analytics.append({
            "attempt_id": attempt.id,
            "quiz_id": quiz.id,
            "quiz_title": quiz.title,
            "my_score": attempt.total_marks,
            "my_time_seconds": attempt.time_consumed_seconds,
            "peer_avg_score": avg_peer_score,
            "peer_avg_time_seconds": avg_peer_time,
            "attempt_date": attempt.created_at,
            "detailed_questions": questions_stats
        })
        
    return {"analytics": analytics}

@router.get("/module/{module_id}")
def get_quizzes_by_module(module_id: int, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).filter(Quiz.module_id == module_id, Quiz.is_deleted == False, Quiz.is_published == True).offset(offset).limit(limit).all()
    
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
            "time_limit_minutes": q.time_limit_minutes,
            "is_published": q.is_published
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
        "consent_text": quiz.consent_text,
        "allowed_tools": quiz.allowed_tools,
        "allowed_resources": quiz.allowed_resources,
        "is_published": quiz.is_published,
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
    quiz.consent_text = quiz_in.consent_text
    quiz.allowed_tools = quiz_in.allowed_tools
    quiz.allowed_resources = quiz_in.allowed_resources
    quiz.is_published = quiz_in.is_published
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

    # Fetch Draft Attempt
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id, 
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.status == "IN_PROGRESS"
    ).first()
    
    draft_answers = {}
    time_consumed = 0
    if attempt:
        time_consumed = attempt.time_consumed_seconds
        for qa in attempt.question_attempts:
            # Simple parse mechanism for UI
            import json
            try:
                parsed = json.loads(qa.user_answer) if qa.user_answer else {}
            except:
                parsed = {"text": qa.user_answer}
                
            draft_answers[qa.question_id] = {
                "user_answer": qa.user_answer,
                "is_flagged": qa.is_flagged,
                "parsed": parsed
            }

    return {
        "id": quiz.id, 
        "title": quiz.title, 
        "description": quiz.description,
        "creator_role": creator_role,
        "is_recommended": quiz.is_recommended,
        "is_timed": quiz.is_timed, 
        "time_limit_minutes": quiz.time_limit_minutes,
        "consent_text": quiz.consent_text,
        "allowed_tools": quiz.allowed_tools,
        "questions": safe_questions,
        "draft": draft_answers,
        "time_consumed": time_consumed
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
    
    # Check for existing IN_PROGRESS attempt
    attempt = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id, 
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.status == "IN_PROGRESS"
    ).first()

    if not attempt:
        past_attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == current_user.id, QuizAttempt.status == "COMPLETED").count()
        attempt = QuizAttempt(
            user_id=current_user.id, 
            quiz_id=quiz.id, 
            total_marks=0.0, 
            time_consumed_seconds=submission.time_consumed_seconds,
            attempt_number=past_attempts + 1,
            quiz_version=quiz.version,
            status="IN_PROGRESS"
        )
        db.add(attempt)
        db.flush()
    else:
        attempt.time_consumed_seconds = submission.time_consumed_seconds
        # Remove old question attempts for this draft to replace them cleanly
        db.query(QuestionAttempt).filter(QuestionAttempt.quiz_attempt_id == attempt.id).delete()
        db.flush()

    total_score = 0.0
    current_questions = db.query(Question).filter(Question.quiz_id == quiz_id, Question.version == quiz.version).all()
    max_score = sum([q.marks for q in current_questions])
    review_details = []

    for q in current_questions:
        q_type = q.type.value if hasattr(q.type, 'value') else q.type
        ans_data = student_answers.get(q.id)
        marks_awarded = 0.0
        is_correct = False
        
        user_answer_display = "No answer provided"
        correct_answer_display = ""
        user_answer_db_string = ""
        needs_manual_review = False
        is_flagged = False

        if ans_data:
            is_flagged = ans_data.is_flagged
            
            import json
            if q_type == "MCQ":
                correct_opt_ids = [opt.id for opt in q.options if opt.is_correct]
                correct_texts = [opt.text for opt in q.options if opt.is_correct]
                correct_answer_display = ", ".join(correct_texts)
                
                selected_opts = [opt.text for opt in q.options if opt.id in ans_data.selected_options]
                user_answer_display = ", ".join(selected_opts) if selected_opts else "None selected"
                user_answer_db_string = json.dumps({"selected_options": ans_data.selected_options})

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
                user_answer_db_string = json.dumps({"selected_options": ans_data.selected_options})

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
                user_answer_db_string = json.dumps({"numeric_answer": ans_data.numeric_answer})
                
                if ans_data.numeric_answer == q.correct_number:
                    marks_awarded = q.marks
                    is_correct = True

            elif q_type == "SHORT_TEXT":
                correct_answer_display = q.correct_text
                user_answer_display = ans_data.text_answer or "None"
                user_answer_db_string = json.dumps({"text_answer": ans_data.text_answer})
                
                if user_answer_display.lower().strip() == correct_answer_display.lower().strip():
                    marks_awarded = q.marks
                    is_correct = True

            elif q_type == "FILL_BLANK":
                # Correct words stored in options with is_correct=True, in order
                correct_words = [opt.text for opt in q.options if opt.is_correct]
                correct_answer_display = " / ".join(correct_words)
                user_words = ans_data.fill_blank_answer or []
                user_answer_display = " / ".join(user_words) if user_words else "None"
                user_answer_db_string = json.dumps({"fill_blank_answer": user_words})
                
                if len(user_words) == len(correct_words) and correct_words:
                    if all(u.lower().strip() == c.lower().strip() for u, c in zip(user_words, correct_words)):
                        marks_awarded = q.marks
                        is_correct = True

            elif q_type == "ESSAY":
                correct_answer_display = "Manual review required. Rubric: " + (q.correct_text or "")
                user_answer_display = ans_data.text_answer or "None"
                user_answer_db_string = json.dumps({"text_answer": ans_data.text_answer})
                marks_awarded = 0.0 
                needs_manual_review = True
                
            elif q_type == "DRAG_DROP":
                correct_order = [opt.text for opt in q.options if opt.is_correct]
                correct_answer_display = " -> ".join(correct_order)
                user_answer_display = " -> ".join(ans_data.drag_drop_answer) if ans_data.drag_drop_answer else "None sorted"
                user_answer_db_string = json.dumps({"drag_drop_answer": ans_data.drag_drop_answer or []})
                
                if ans_data.drag_drop_answer == correct_order:
                    marks_awarded = q.marks
                    is_correct = True

        total_score += marks_awarded

        q_attempt = QuestionAttempt(
            quiz_attempt_id=attempt.id, 
            question_id=q.id, 
            marks_awarded=marks_awarded if not submission.is_draft else 0.0,
            user_answer=user_answer_db_string,
            needs_manual_review=needs_manual_review if not submission.is_draft else False,
            is_flagged=is_flagged,
            time_spent_seconds=getattr(ans_data, 'time_spent_seconds', 0) if ans_data else 0
        )
        db.add(q_attempt)

        review_details.append({
            "question_text": q.text, "type": q_type, "marks_awarded": marks_awarded,
            "max_marks": q.marks, "is_correct": is_correct, "user_answer": user_answer_display,
            "correct_answer": correct_answer_display
        })

    if submission.is_draft:
        db.commit()
        return {"message": "Draft saved."}

    attempt.total_marks = total_score
    attempt.status = "COMPLETED"
    
    # Send essay review notification to quiz creator if any essay questions exist
    has_essays = any(rev["type"] == "ESSAY" for rev in review_details)
    if has_essays:
        creator = db.query(User).filter(User.id == quiz.created_user_id).first()
        if creator and creator.id != current_user.id:
            essay_notification = Notification(
                user_id=quiz.created_user_id,
                message=f"A student submitted an essay in '{quiz.title}' — review required."
            )
            db.add(essay_notification)
    
    db.commit()

    return {
        "message": "Trial complete.",
        "score": total_score,
        "max_score": max_score,
        "attempt_number": attempt.attempt_number,
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