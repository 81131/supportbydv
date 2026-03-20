# backend/schemas/quiz.py

from pydantic import BaseModel
from typing import List, Optional
from models.quiz import QuestionType

# --- Answer Options ---
class AnswerOptionCreate(BaseModel):
    text: str
    is_correct: bool = False

# --- Questions ---
class QuestionCreate(BaseModel):
    text: str
    type: QuestionType
    marks: float = 1.0
    negative_marks: float = 0.0
    image_url: Optional[str] = None
    correct_number: Optional[float] = None
    correct_text: Optional[str] = None
    
    # Nested options list
    options: Optional[List[AnswerOptionCreate]] = []

# --- Quiz ---
class QuizCreate(BaseModel):
    title: str
    description: Optional[str] = None
    module_id: int

    is_timed: bool = False
    time_limit_minutes: Optional[int] = None
    
    # Nested questions list
    questions: List[QuestionCreate]

class StudentAnswer(BaseModel):
    question_id: int
    selected_options: List[int] = [] 
    numeric_answer: Optional[float] = None
    text_answer: Optional[str] = None

class QuizSubmission(BaseModel):
    answers: List[StudentAnswer]
    time_consumed_seconds: int = 0