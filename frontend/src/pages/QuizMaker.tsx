import React, { useState } from 'react';
import type { Question, QuestionType, AnswerOption } from '../types/quiz'; 
import api from '../api';

const QuizMaker: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState(1); // ⚠️ Replace with a dropdown later!
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Dynamic Form Handlers --- 🛠️

  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      text: '',
      type,
      marks: 1.0,
      negativeMarks: type === 'CHECKBOX' ? 0.5 : 0.0, // Default negative for checkbox
      options: type === 'MCQ' || type === 'CHECKBOX' ? [{ text: '', isCorrect: false }] : [],
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options?.push({ text: '', isCorrect: false });
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, field: keyof AnswerOption, value: any) => {
    const updated = [...questions];
    if (updated[qIndex].options) {
      updated[qIndex].options![optIndex] = { ...updated[qIndex].options![optIndex], [field]: value };
    }
    setQuestions(updated);
  };

  // --- Image Upload Handler --- 🖼️

const handleImageUpload = async (qIndex: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/files/upload-image', formData);
      updateQuestion(qIndex, 'imageUrl', res.data.image_url);
    } catch (error) {
      console.error("Failed to upload image", error);
    }
  };

  // --- Submit Handler --- 🚀

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      title,
      description,
      module_id: moduleId,
      questions,
    };

    try {
      // 👈 Swapped to api.post! No need for manual headers or JSON.stringify!
      const res = await api.post('/quizzes/', payload);

      if (res.status === 201) {
        alert('Quiz Forged Successfully! ⚔️');
      }
    } catch (error) {
      console.error('Submission failed', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <h2>Forge a New Quiz 📜</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div style={{ marginBottom: '2rem' }}>
          <input 
            type="text" placeholder="Quiz Title" value={title} 
            onChange={e => setTitle(e.target.value)} required 
            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
          />
          <textarea 
            placeholder="Description..." value={description} 
            onChange={e => setDescription(e.target.value)} 
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>

        {/* Dynamic Questions List */}
        {questions.map((q, qIndex) => (
          <div key={qIndex} style={{ border: '1px solid var(--accent-gold)', padding: '1rem', marginBottom: '1rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4>Question {qIndex + 1} ({q.type})</h4>
                <button type="button" onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}>❌ Remove</button>
            </div>

            <textarea 
              placeholder="Question Text..." value={q.text} 
              onChange={e => updateQuestion(qIndex, 'text', e.target.value)} required
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
            />

            <input 
            type="number" placeholder="Module ID (e.g., 1)" value={moduleId} 
            onChange={e => setModuleId(parseInt(e.target.value) || 1)} required 
            style={{ width: '100%', padding: '0.5rem', marginTop: '1rem' }}
          />

            {/* Image Upload */}
            <div style={{ marginBottom: '1rem' }}>
                <input type="file" accept="image/*" onChange={(e) => {
                    if (e.target.files?.[0]) handleImageUpload(qIndex, e.target.files[0]);
                }} />
                {q.imageUrl && <p>✅ Image Attached!</p>}
            </div>

            {/* Marks Configuration */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <label>Marks: <input type="number" step="0.1" value={q.marks} onChange={e => updateQuestion(qIndex, 'marks', parseFloat(e.target.value))} /></label>
                {q.type === 'CHECKBOX' && (
                    <label>Negative Marks: <input type="number" step="0.1" value={q.negativeMarks} onChange={e => updateQuestion(qIndex, 'negativeMarks', parseFloat(e.target.value))} /></label>
                )}
            </div>

            {/* Conditional Rendering based on Question Type */}
            
            {(q.type === 'MCQ' || q.type === 'CHECKBOX') && (
              <div>
                {q.options?.map((opt, oIndex) => (
                  <div key={oIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input 
                      type={q.type === 'MCQ' ? 'radio' : 'checkbox'} 
                      checked={opt.isCorrect} 
                      name={`q-${qIndex}-correct`} // Important for MCQ radio grouping
                      onChange={e => updateOption(qIndex, oIndex, 'isCorrect', e.target.checked)} 
                    />
                    <input 
                      type="text" placeholder={`Option ${oIndex + 1}`} value={opt.text} 
                      onChange={e => updateOption(qIndex, oIndex, 'text', e.target.value)} required 
                    />
                  </div>
                ))}
                <button type="button" onClick={() => addOption(qIndex)}>➕ Add Option</button>
              </div>
            )}

            {q.type === 'NUMBER' && (
              <input 
                type="number" step="0.001" placeholder="Correct Answer (e.g. 3.142)" value={q.correctNumber || ''} 
                onChange={e => updateQuestion(qIndex, 'correctNumber', parseFloat(e.target.value))} required 
              />
            )}

            {(q.type === 'SHORT_TEXT' || q.type === 'ESSAY') && (
              <textarea 
                placeholder="Example/Expected Answer..." value={q.correctText || ''} 
                onChange={e => updateQuestion(qIndex, 'correctText', e.target.value)} required 
                style={{ width: '100%' }}
              />
            )}

          </div>
        ))}

        {/* Add Question Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => addQuestion('MCQ')}>+ MCQ</button>
          <button type="button" onClick={() => addQuestion('CHECKBOX')}>+ Checkbox</button>
          <button type="button" onClick={() => addQuestion('NUMBER')}>+ Number</button>
          <button type="button" onClick={() => addQuestion('SHORT_TEXT')}>+ Short Text</button>
          <button type="button" onClick={() => addQuestion('ESSAY')}>+ Essay</button>
        </div>

        <button type="submit" disabled={isSubmitting} style={{ padding: '1rem 2rem', fontSize: '1.2rem', cursor: 'pointer' }}>
          {isSubmitting ? 'Forging...' : '💾 Save Quiz'}
        </button>
      </form>
    </div>
  );
};

export default QuizMaker;