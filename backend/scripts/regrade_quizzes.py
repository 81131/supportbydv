import asyncio
import sys
import os
import json

# Add backend directory to sys.path to import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database import SessionLocal
from models.quiz import Question
from models.attempts import QuizAttempt, QuestionAttempt

async def regrade_attempts():
    async with SessionLocal() as db:
        print("Fetching attempts...")
        attempts = (await db.execute(select(QuizAttempt).options(selectinload(QuizAttempt.question_attempts)))).scalars().all()
        
        updated_attempts_count = 0
        
        for attempt in attempts:
            attempt_changed = False
            new_total_score = 0.0
            
            for qa in attempt.question_attempts:
                question = (await db.execute(select(Question).options(selectinload(Question.options)).filter(Question.id == qa.question_id))).scalars().first()
                if not question:
                    new_total_score += qa.marks_awarded
                    continue
                
                q_type = question.type.value if hasattr(question.type, 'value') else question.type
                
                if q_type in ["FILL_BLANK", "DRAG_DROP"]:
                    # Regrade this question
                    correct_words = [opt.text for opt in question.options if opt.is_correct]
                    
                    user_words = []
                    if qa.user_answer_db_string:
                        try:
                            ans_data = json.loads(qa.user_answer_db_string)
                            if q_type == "FILL_BLANK":
                                user_words = ans_data.get("fill_blank_answer", [])
                            else:
                                user_words = ans_data.get("drag_drop_answer", [])
                        except Exception as e:
                            pass
                    
                    user_words = [str(w) if w is not None else "" for w in user_words]
                    
                    num_blanks = question.text.count("___")
                    if num_blanks == 0:
                        num_blanks = 1
                        
                    available_correct = [c.lower().strip() for c in correct_words]
                    correct_count = 0
                    
                    for u in user_words:
                        u_clean = u.lower().strip()
                        if u_clean and u_clean in available_correct:
                            correct_count += 1
                            available_correct.remove(u_clean)
                    
                    marks_awarded = (correct_count / num_blanks) * question.marks
                    if marks_awarded > question.marks:
                        marks_awarded = question.marks
                        
                    is_correct = (correct_count == num_blanks)
                    
                    if abs(marks_awarded - qa.marks_awarded) > 0.001 or is_correct != qa.is_correct:
                        print(f"Regrading attempt {attempt.id}, question {qa.question_id}: {qa.marks_awarded} -> {marks_awarded}")
                        qa.marks_awarded = marks_awarded
                        qa.is_correct = is_correct
                        attempt_changed = True
                
                new_total_score += qa.marks_awarded
                
            if attempt_changed or abs(new_total_score - attempt.score) > 0.001:
                attempt.score = new_total_score
                updated_attempts_count += 1
                
        if updated_attempts_count > 0:
            print(f"Committing changes for {updated_attempts_count} attempts...")
            await db.commit()
            print("Done!")
        else:
            print("All attempts are already graded correctly. No changes needed.")

if __name__ == "__main__":
    asyncio.run(regrade_attempts())
