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
        
    return {"message": "Resource uploaded successfully.", "file_url": f"/static/quiz_resources/{safe_filename}"}

@router.post("", status_code=status.HTTP_201_CREATED)
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
        import json
        new_question = Question(
            quiz_id=new_quiz.id, text=q_data.text, type=q_data.type, marks=q_data.marks,
            negative_marks=q_data.negative_marks, image_url=q_data.image_url,
            correct_number=q_data.correct_number, correct_text=q_data.correct_text,
            unit_id=q_data.unit_id,
            topic_ids=json.dumps(q_data.topic_ids) if q_data.topic_ids else None
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

from datetime import datetime, timedelta

@router.get("/analytics/me")
def get_my_analytics(
    timeframe: str = 'all',
    peer_group: str = 'batch',
    module_id: str = 'all',
    difficulty: str = 'all',
    attempt_type: str = 'all',
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Fetch V3 Performance Matrices comparing student vs dynamically calculated cohort peers with deep filtering."""
    
    # 1. Base Query for ALL Completed Attempts globally to figure out question difficulties and top users globally
    all_completed = db.query(QuizAttempt).filter(QuizAttempt.status == "COMPLETED").all()
    
    # 1a. Figure out global question difficulties
    # difficulty_map: question_id -> 'easy'|'medium'|'hard'
    question_stats = {} # q_id -> { "correct": 0, "total": 0 }
    user_scores = {} # user_id -> { "earned": 0.0, "max": 0.0 }
    
    # We must scan all attempts
    for a in all_completed:
        if a.user_id not in user_scores: user_scores[a.user_id] = {"earned": 0.0, "max": 0.0}
        user_scores[a.user_id]["earned"] += a.total_marks
        qs = db.query(Question).filter(Question.quiz_id == a.quiz_id, Question.version == a.quiz_version).all()
        q_dict = { q.id: q.marks for q in qs }
        user_scores[a.user_id]["max"] += sum(q_dict.values())
        
        for qa in a.question_attempts:
            if qa.question_id not in question_stats: question_stats[qa.question_id] = {"correct": 0, "total": 0}
            question_stats[qa.question_id]["total"] += 1
            max_m = q_dict.get(qa.question_id, 1.0)
            if qa.marks_awarded >= max_m and max_m > 0:
                question_stats[qa.question_id]["correct"] += 1
                
    difficulty_map = {}
    for q_id, stats in question_stats.items():
        if stats["total"] == 0: difficulty_map[q_id] = 'medium'
        else:
            perc = stats["correct"] / stats["total"]
            if perc > 0.7: difficulty_map[q_id] = 'easy'
            elif perc < 0.3: difficulty_map[q_id] = 'hard'
            else: difficulty_map[q_id] = 'medium'
            
    # 1b. Figure out user percentile rankings to determine subsets for 'top25' and 'top10'
    user_percentages = []
    for uid, data in user_scores.items():
        if data["max"] > 0:
            user_percentages.append((uid, data["earned"] / data["max"]))
    user_percentages.sort(key=lambda x: x[1], reverse=True) # highest to lowest
    
    eligible_peer_ids = set([u[0] for u in user_percentages])
    if peer_group == 'top10':
        cutoff = max(1, int(len(user_percentages) * 0.10))
        eligible_peer_ids = set([u[0] for u in user_percentages[:cutoff]])
    elif peer_group == 'top25':
        cutoff = max(1, int(len(user_percentages) * 0.25))
        eligible_peer_ids = set([u[0] for u in user_percentages[:cutoff]])
        
    my_percentile = 0
    if len(user_percentages) > 1:
        my_perc = user_scores.get(current_user.id, {"earned":0, "max":1})
        if my_perc["max"] > 0:
            my_v = my_perc["earned"]/my_perc["max"]
            lower_than_me = [u for u in user_percentages if u[1] < my_v and u[0] != current_user.id]
            my_percentile = int((len(lower_than_me) / (len(user_percentages) - 1)) * 100)
    elif len(user_percentages) <= 1:
        my_percentile = 100
        
    # 2. Filter My Attempts based on timeframe, module_id, attempt_type
    query = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id, QuizAttempt.status == "COMPLETED")
    
    now = datetime.utcnow()
    if timeframe == '7d': query = query.filter(QuizAttempt.created_at >= now - timedelta(days=7))
    elif timeframe == '30d': query = query.filter(QuizAttempt.created_at >= now - timedelta(days=30))
    elif timeframe == 'semester': query = query.filter(QuizAttempt.created_at >= now - timedelta(days=120))
    
    my_attempts = query.order_by(QuizAttempt.created_at.asc()).all()
    
    # 3. Calculate Comeback Rate (longitudinally over all my_attempts)
    comeback_opportunities = 0
    comeback_successes = 0
    question_history = {} # q_id -> bool (was_fail)
    
    for a in my_attempts:
        qs = db.query(Question).filter(Question.quiz_id == a.quiz_id, Question.version == a.quiz_version).all()
        q_dict = { q.id: q.marks for q in qs }
        for qa in a.question_attempts:
            max_m = q_dict.get(qa.question_id, 1.0)
            is_fail = qa.marks_awarded < max_m
            was_fail_before = question_history.get(qa.question_id, False)
            
            if was_fail_before:
                comeback_opportunities += 1
                if not is_fail:
                    comeback_successes += 1
            
            question_history[qa.question_id] = is_fail

    # Now deeply filter my_attempts
    filtered_my_attempts = []
    for a in my_attempts:
        quiz = db.query(Quiz).filter(Quiz.id == a.quiz_id).first()
        if not quiz: continue
        if module_id != 'all' and str(quiz.module_id) != str(module_id): continue
        if attempt_type == 'first' and a.attempt_number > 1: continue
        if attempt_type == 'retakes' and a.attempt_number == 1: continue
        filtered_my_attempts.append((a, quiz))
        
    analytics = []
    total_my_marks = 0.0
    total_max_marks = 0.0
    total_my_time = 0
    total_qs_answered = 0
    unique_dates = set()
    
    module_scores_acc = {}
    topic_scores_acc = {}
    
    peer_attempts_pool = [a for a in all_completed if a.user_id in eligible_peer_ids]
    
    for a, quiz in filtered_my_attempts:
        if a.created_at: unique_dates.add(a.created_at.date())
        
        current_questions = db.query(Question).filter(Question.quiz_id == quiz.id, Question.version == a.quiz_version).all()
        q_dict = { q.id: q for q in current_questions }
        
        if difficulty != 'all':
            valid_q_ids = [q.id for q in current_questions if difficulty_map.get(q.id, 'medium') == difficulty]
        else:
            valid_q_ids = [q.id for q in current_questions]
            
        if not valid_q_ids: continue # Skipped if no questions match difficulty
            
        attempt_max_score = sum([q.marks for q in current_questions if q.id in valid_q_ids])
        
        my_qas = [qa for qa in a.question_attempts if qa.question_id in valid_q_ids]
        my_attempt_score = sum([qa.marks_awarded for qa in my_qas])
        my_attempt_time = sum([qa.time_spent_seconds for qa in my_qas])
        
        total_my_marks += my_attempt_score
        total_max_marks += attempt_max_score
        
        # Radar
        if quiz.module_id not in module_scores_acc:
            module_scores_acc[quiz.module_id] = {"earned": 0.0, "max": 0.0, "name": quiz.module.name}
        module_scores_acc[quiz.module_id]["earned"] += my_attempt_score
        module_scores_acc[quiz.module_id]["max"] += attempt_max_score
        
        peer_quiz_attempts = [pa for pa in peer_attempts_pool if pa.quiz_id == quiz.id]
        total_peer_score = 0
        total_peer_time = 0
        for pa in peer_quiz_attempts:
            p_qas = [pqa for pqa in pa.question_attempts if pqa.question_id in valid_q_ids]
            total_peer_score += sum([pqa.marks_awarded for pqa in p_qas])
            total_peer_time += sum([pqa.time_spent_seconds for pqa in p_qas])
            
        avg_peer_score = round(total_peer_score / len(peer_quiz_attempts), 2) if peer_quiz_attempts else 0
        avg_peer_time = round(total_peer_time / len(peer_quiz_attempts), 2) if peer_quiz_attempts else 0
        
        questions_stats = []
        for qa in my_qas:
            total_my_time += qa.time_spent_seconds
            total_qs_answered += 1
            
            p_q_time = 0
            p_q_count = 0
            for pa in peer_quiz_attempts:
                for pqa in pa.question_attempts:
                    if pqa.question_id == qa.question_id:
                        p_q_time += pqa.time_spent_seconds
                        p_q_count += 1
            avg_p_q_time = round(p_q_time / p_q_count, 1) if p_q_count > 0 else 0
            
            q_obj = q_dict[qa.question_id]
            if q_obj.topic_ids:
                import json
                try:
                    t_ids = json.loads(q_obj.topic_ids)
                    for t_id in t_ids:
                        from models.quiz import LectureTopic
                        if t_id not in topic_scores_acc:
                            lt = db.query(LectureTopic).filter(LectureTopic.id == t_id).first()
                            topic_scores_acc[t_id] = {"earned": 0.0, "max": 0.0, "name": lt.name if lt else f"Topic {t_id}"}
                        topic_scores_acc[t_id]["earned"] += qa.marks_awarded
                        topic_scores_acc[t_id]["max"] += q_obj.marks
                except: pass
                
            questions_stats.append({
                "question_id": qa.question_id,
                "marks_awarded": qa.marks_awarded,
                "time_spent_seconds": qa.time_spent_seconds,
                "peer_avg_time_seconds": avg_p_q_time,
                "question_text": q_obj.text,
                "topic_ids": q_obj.topic_ids,
                "unit_id": q_obj.unit_id
            })
            
        analytics.append({
            "attempt_id": a.id,
            "quiz_id": quiz.id,
            "quiz_title": quiz.title,
            "module_id": quiz.module_id,
            "my_score": my_attempt_score,
            "my_max_score": attempt_max_score,
            "my_time_seconds": my_attempt_time,
            "peer_avg_score": avg_peer_score,
            "peer_avg_time_seconds": avg_peer_time,
            "attempt_date": a.created_at,
            "detailed_questions": questions_stats
        })
        
    streak = 0
    if unique_dates:
        sorted_dates = sorted(list(unique_dates), reverse=True)
        today = datetime.utcnow().date()
        current_date = today
        if sorted_dates[0] == today or sorted_dates[0] == today - timedelta(days=1):
            current_date = sorted_dates[0]
            for d in sorted_dates:
                if d == current_date:
                    streak += 1
                    current_date -= timedelta(days=1)
                else: break
                
    radar_module = [{"subject": v["name"], "score": int((v["earned"]/v["max"])*100)} for k, v in module_scores_acc.items() if v["max"] > 0]
    radar_topic = [{"subject": v["name"], "score": int((v["earned"]/v["max"])*100)} for k, v in topic_scores_acc.items() if v["max"] > 0]
    
    kpis = {
        "total_accuracy_percentage": round((total_my_marks / total_max_marks * 100), 1) if total_max_marks > 0 else 0,
        "avg_speed_per_question_seconds": round((total_my_time / total_qs_answered), 1) if total_qs_answered > 0 else 0,
        "peer_percentile": my_percentile,
        "consistency_streak_days": streak,
        "comeback_rate_percentage": round((comeback_successes / comeback_opportunities * 100), 1) if comeback_opportunities > 0 else 0,
        "peer_group": peer_group
    }

    # Global Baseline metrics
    total_peer_marks_global = 0
    total_peer_max_global = 0
    total_peer_time_global = 0
    total_peer_qs_global = 0
    peer_module_acc = {}
    peer_topic_acc = {}
    
    for a, quiz in filtered_my_attempts:
        current_questions = db.query(Question).filter(Question.quiz_id == quiz.id, Question.version == a.quiz_version).all()
        q_dict = { q.id: q for q in current_questions }
        if difficulty != 'all':
            valid_q_ids = [q.id for q in current_questions if difficulty_map.get(q.id, 'medium') == difficulty]
        else:
            valid_q_ids = [q.id for q in current_questions]
            
        attempt_max_score = sum([q.marks for q in current_questions if q.id in valid_q_ids])
        peer_quiz_attempts = [pa for pa in peer_attempts_pool if pa.quiz_id == quiz.id]
        for pa in peer_quiz_attempts:
            p_qas = [pqa for pqa in pa.question_attempts if pqa.question_id in valid_q_ids]
            total_peer_marks_global += sum([pqa.marks_awarded for pqa in p_qas])
            total_peer_max_global += attempt_max_score
            total_peer_time_global += sum([pqa.time_spent_seconds for pqa in p_qas])
            total_peer_qs_global += len(p_qas)
            
            for pqa in p_qas:
                q_obj = q_dict[pqa.question_id]
                if quiz.module_id not in peer_module_acc:
                    peer_module_acc[quiz.module_id] = {"earned": 0.0, "max": 0.0, "name": quiz.module.name}
                peer_module_acc[quiz.module_id]["earned"] += pqa.marks_awarded
                peer_module_acc[quiz.module_id]["max"] += q_obj.marks
                
                if q_obj.topic_ids:
                    import json
                    try:
                        t_ids = json.loads(q_obj.topic_ids)
                        for t_id in t_ids:
                            if t_id not in peer_topic_acc:
                                from models.quiz import LectureTopic
                                lt = db.query(LectureTopic).filter(LectureTopic.id == t_id).first()
                                peer_topic_acc[t_id] = {"earned": 0.0, "max": 0.0, "name": lt.name if lt else f"Topic {t_id}"}
                            peer_topic_acc[t_id]["earned"] += pqa.marks_awarded
                            peer_topic_acc[t_id]["max"] += q_obj.marks
                    except: pass
                    
    peer_radar_module = [{"subject": v["name"], "peer_score": int((v["earned"]/v["max"])*100)} for k, v in peer_module_acc.items() if v["max"] > 0]
    peer_radar_topic = [{"subject": v["name"], "peer_score": int((v["earned"]/v["max"])*100)} for k, v in peer_topic_acc.items() if v["max"] > 0]
    
    merged_radar_module = []
    for r in radar_module:
        pr = next((p for p in peer_radar_module if p["subject"] == r["subject"]), None)
        r["peer_score"] = pr["peer_score"] if pr else 0
        merged_radar_module.append(r)
        
    merged_radar_topic = []
    for r in radar_topic:
        pr = next((p for p in peer_radar_topic if p["subject"] == r["subject"]), None)
        r["peer_score"] = pr["peer_score"] if pr else 0
        merged_radar_topic.append(r)

    baseline_kpis = {
        "peer_accuracy_percentage": round((total_peer_marks_global / total_peer_max_global * 100), 1) if total_peer_max_global > 0 else 0,
        "peer_avg_speed_per_question_seconds": round((total_peer_time_global / total_peer_qs_global), 1) if total_peer_qs_global > 0 else 0
    }
    
    return {
        "kpis": kpis,
        "baseline_kpis": baseline_kpis,
        "radar_stats_module": merged_radar_module,
        "radar_stats_topic": merged_radar_topic,
        "analytics": analytics
    }

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
        creator_name = f"{creator.first_name} {creator.last_name}" if creator else "Unknown Scholar"
        result.append({
            "id": q.id,
            "title": q.title,
            "description": q.description,
            "module_id": q.module_id,
            "created_user_id": q.created_user_id,
            "creator_role": creator_role, 
            "creator_name": creator_name.strip(),
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
        import json
        parsed_topics = []
        if q.topic_ids:
            try:
                parsed_topics = json.loads(q.topic_ids)
            except:
                pass
        
        questions_list.append({
            "text": q.text, "type": q.type.value if hasattr(q.type, 'value') else q.type,
            "marks": q.marks, "negative_marks": q.negative_marks, "image_url": q.image_url,
            "correct_number": q.correct_number, "correct_text": q.correct_text, 
            "unit_id": q.unit_id, "topic_ids": parsed_topics,
            "options": options_list
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
        import json
        new_question = Question(
            quiz_id=quiz.id, 
            text=q_data.text, 
            type=q_data.type, 
            marks=q_data.marks, 
            negative_marks=q_data.negative_marks, 
            image_url=q_data.image_url, 
            correct_number=q_data.correct_number, 
            correct_text=q_data.correct_text,
            unit_id=q_data.unit_id,
            topic_ids=json.dumps(q_data.topic_ids) if q_data.topic_ids else None,
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
    attempt_created_at = None
    
    if attempt:
        time_consumed = attempt.time_consumed_seconds
        attempt_created_at = attempt.created_at.isoformat() if attempt.created_at else None
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
        "allowed_resources": quiz.allowed_resources,
        "questions": safe_questions,
        "draft": draft_answers,
        "time_consumed": time_consumed,
        "attempt_created_at": attempt_created_at
    }

@router.post("/{quiz_id}/start")
def start_quiz_attempt(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.is_deleted == False).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Scroll not found.")
        
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
            time_consumed_seconds=0,
            attempt_number=past_attempts + 1,
            quiz_version=quiz.version,
            status="IN_PROGRESS"
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)
        
    return {
        "message": "Attempt started.",
        "attempt_created_at": attempt.created_at.isoformat()
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

    import datetime
    from datetime import timezone
    server_now = datetime.datetime.now(timezone.utc)
    server_time_consumed = submission.time_consumed_seconds
    
    if not attempt:
        raise HTTPException(status_code=400, detail="Attempt has not been started yet.")
    else:
        if attempt.created_at:
            time_diff = (server_now - attempt.created_at.replace(tzinfo=timezone.utc)).total_seconds()
            server_time_consumed = int(time_diff)
            
            # Stop cheating: Enforce time limit on backend (with a 60s grace period for network lag)
            if quiz.is_timed and quiz.time_limit_minutes and not submission.is_draft:
                max_seconds = quiz.time_limit_minutes * 60 + 60
                if time_diff > max_seconds:
                    server_time_consumed = max_seconds # Cap at max
        
        attempt.time_consumed_seconds = server_time_consumed
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