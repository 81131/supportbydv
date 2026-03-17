# backend/models/quiz.py (and module)

from sqlalchemy import Column, Integer, String, Float, Enum, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from . import Base # Adjust based on your setup

class QuestionType(enum.Enum):
    MCQ = "MCQ"
    CHECKBOX = "CHECKBOX"
    NUMBER = "NUMBER"
    SHORT_TEXT = "SHORT_TEXT"
    ESSAY = "ESSAY"

class Module(Base):
    __tablename__ = "modules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    code = Column(String, unique=True, index=True)
    year = Column(Integer)
    semester = Column(Integer)
    
    quizzes = relationship("Quiz", back_populates="module")

class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    
    # New Relationships & Tracking
    module_id = Column(Integer, ForeignKey("modules.id"))
    created_user_id = Column(Integer, ForeignKey("users.id")) # Assuming your user table is 'users'
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    module = relationship("Module", back_populates="quizzes")
    # user = relationship("User", back_populates="quizzes") # Add this if you want bi-directional user lookup
    questions = relationship("Question", back_populates="quiz", cascade="all, delete-orphan")

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    text = Column(String)
    image_url = Column(String, nullable=True) 
    type = Column(Enum(QuestionType))
    
    # New Grading Fields
    marks = Column(Float, default=1.0)
    negative_marks = Column(Float, default=0.0) # Used for CHECKBOX
    
    correct_number = Column(Float, nullable=True) 
    correct_text = Column(String, nullable=True)  
    
    quiz = relationship("Quiz", back_populates="questions")
    options = relationship("AnswerOption", back_populates="question", cascade="all, delete-orphan")

class AnswerOption(Base):
    __tablename__ = "answer_options"
    
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"))
    text = Column(String)
    is_correct = Column(Boolean, default=False)
    
    question = relationship("Question", back_populates="options")