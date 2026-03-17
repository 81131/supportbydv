# backend/models/attempts.py

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from . import Base # Adjust import if needed

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    
    # Overall Marks & Stats
    total_marks = Column(Float, default=0.0)
    time_consumed_seconds = Column(Integer, default=0)
    attempt_number = Column(Integer, default=1)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="attempts")
    quiz = relationship("Quiz") 
    question_attempts = relationship("QuestionAttempt", back_populates="quiz_attempt", cascade="all, delete-orphan")

class QuestionAttempt(Base):
    __tablename__ = "question_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    quiz_attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    
    # Granular Analytics
    marks_awarded = Column(Float, default=0.0)
    time_spent_seconds = Column(Integer, default=0) # 👈 Individual question time!
    
    # What the user actually submitted (Store as String or JSON)
    user_answer = Column(String, nullable=True) 
    
    # Relationships
    quiz_attempt = relationship("QuizAttempt", back_populates="question_attempts")
    question = relationship("Question")