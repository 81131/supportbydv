// src/types/quiz.ts

export type QuestionType = 'MCQ' | 'CHECKBOX' | 'NUMBER' | 'SHORT_TEXT' | 'ESSAY';

export interface Module {
  id?: number;
  name: string;
  code: string;
  year: number;
  semester: number;
}

export interface AnswerOption {
  id?: number;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id?: number;
  text: string;
  imageUrl?: string | File; 
  type: QuestionType;
  marks: number;          // 👈 Added marks per question
  negativeMarks?: number; // 👈 Added negative marks (primarily for CHECKBOX)
  options?: AnswerOption[]; 
  correctNumber?: number;   
  correctText?: string;     
}

export interface Quiz {
  id?: number;
  title: string;
  description: string;
  moduleId: number;       // 👈 Link to Module
  createdUserId: number;  // 👈 Link to Creator
  createdAt?: string;     // 👈 Creation date
  updatedAt?: string;     // 👈 Last modified date
  questions: Question[];
}