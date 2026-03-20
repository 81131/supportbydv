import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Question, QuestionType, AnswerOption } from '../types/quiz'; 
import api from '../api';
import { Trash2, PlusCircle, Save, ImagePlus, CheckCircle, FileText, Hash, CheckSquare, List, Scroll, Timer, TimerOff } from 'lucide-react';

const QuizMaker: React.FC = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const isEditMode = Boolean(id); 

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState(1); 
  
  // --- NEW TIMER STATE ---
  const [isTimed, setIsTimed] = useState(false);
  const [timeLimit, setTimeLimit] = useState<number | ''>('');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Fetch Data for Edit Mode ---
  useEffect(() => {
    if (isEditMode) {
      api.get(`/quizzes/${id}`)
        .then(res => {
          const q = res.data;
          setTitle(q.title);
          setDescription(q.description || '');
          setModuleId(q.module_id);
          
          // Load the timer settings
          setIsTimed(q.is_timed || false);
          setTimeLimit(q.time_limit_minutes || '');
          
          const loadedQuestions = (q.questions || []).map((bq: any) => ({
            text: bq.text,
            type: bq.type,
            marks: bq.marks,
            negativeMarks: bq.negative_marks,
            imageUrl: bq.image_url,
            correctNumber: bq.correct_number,
            correctText: bq.correct_text,
            options: (bq.options || []).map((bo: any) => ({
              text: bo.text,
              isCorrect: bo.is_correct
            }))
          }));
          
          setQuestions(loadedQuestions);
        })
        .catch(err => {
          console.error("Failed to fetch quiz", err);
          alert("Could not load the scroll.");
        });
    }
  }, [id, isEditMode]);

  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      text: '',
      type,
      marks: 1.0,
      negativeMarks: type === 'CHECKBOX' ? 0.5 : 0.0, 
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
    const question = updated[qIndex];

    if (question.options) {
      if (question.type === 'MCQ' && field === 'isCorrect' && value === true) {
        question.options = question.options.map((opt, idx) => ({
          ...opt,
          isCorrect: idx === optIndex 
        }));
      } else {
        question.options[optIndex] = { ...question.options[optIndex], [field]: value };
      }
    }
    setQuestions(updated);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      title,
      description,
      module_id: moduleId,
      is_timed: isTimed,
      time_limit_minutes: isTimed && timeLimit ? Number(timeLimit) : null,
      questions: questions.map(q => ({
        text: q.text,
        type: q.type,
        marks: q.marks,
        negative_marks: q.negativeMarks,
        image_url: q.imageUrl,
        correct_number: q.correctNumber,
        correct_text: q.correctText,
        options: q.options?.map(o => ({
          text: o.text,
          is_correct: o.isCorrect
        }))
      }))
    };

    try {
      if (isEditMode) {
        await api.put(`/quizzes/${id}`, payload);
        alert('Scroll Revised Successfully!');
      } else {
        await api.post('/quizzes/', payload);
        alert('Scroll Forged Successfully!');
      }
      navigate(-1); 
    } catch (error) {
      console.error('Submission failed', error);
      alert('Failed to save. Check the console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = { width: '100%', padding: '0.75rem', backgroundColor: 'rgba(15, 15, 15, 0.8)', color: 'var(--text-main)', border: '1px solid var(--border-dark)', borderRadius: '6px', marginBottom: '1rem', outline: 'none' };
  const labelStyle = { display: 'block', color: 'var(--accent-gold)', marginBottom: '0.4rem', fontWeight: 'bold', fontSize: '0.9rem' };

  return (
    <div style={{ padding: '3rem 1rem', maxWidth: '850px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <h1 className="brand-font" style={{ color: 'var(--accent-gold)', textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
        <Scroll size={36} /> {isEditMode ? 'Revise the Scroll' : 'Forge a New Scroll'}
      </h1>
      
      <form onSubmit={handleSubmit}>
        
        {/* --- 1. Basic Info Section --- */}
        <div style={{ backgroundColor: 'var(--bg-deep)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-dark)', marginBottom: '2rem' }}>
          <h3 className="brand-font" style={{ marginTop: 0, color: 'var(--text-main)', borderBottom: '1px solid var(--border-dark)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            Scroll Details
          </h3>
          
          <label style={labelStyle}>Quiz Title</label>
          <input 
            type="text" placeholder="e.g., Mid-Term Defenses" value={title} 
            onChange={e => setTitle(e.target.value)} required 
            style={inputStyle}
          />
          
          <label style={labelStyle}>Description / Instructions</label>
          <textarea 
            placeholder="What should the students know before starting?" value={description} 
            onChange={e => setDescription(e.target.value)} 
            style={{ ...inputStyle, minHeight: '80px' }}
          />

          <label style={labelStyle}>Target Module</label>
          <select 
            value={moduleId} 
            onChange={e => setModuleId(parseInt(e.target.value))} 
            style={inputStyle}
          >
            <option value={1}>OSSA (Operating System & System Administration)</option>
            <option value={2}>WMT (Web and Mobile Technologies)</option>
            <option value={3}>PS (Professional Skills)</option>
          </select>

          {/* --- NEW TIMER CONFIGURATION --- */}
          <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-dark)', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isTimed ? <Timer size={20} color="var(--accent-gold)" /> : <TimerOff size={20} color="var(--text-muted)" />} 
              Time Constraints
            </h4>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: isTimed ? '1rem' : '0' }}>
              <input 
                type="checkbox" 
                id="timerToggle"
                checked={isTimed} 
                onChange={(e) => setIsTimed(e.target.checked)} 
                style={{ transform: 'scale(1.5)', cursor: 'pointer', accentColor: 'var(--accent-gold)' }}
              />
              <label htmlFor="timerToggle" style={{ color: 'var(--text-main)', cursor: 'pointer' }}>Enforce a strict time limit for this scroll</label>
            </div>

            {isTimed && (
              <div>
                <label style={labelStyle}>Time Limit (in Minutes)</label>
                <input 
                  type="number" 
                  min="1"
                  placeholder="e.g. 30" 
                  value={timeLimit} 
                  onChange={e => setTimeLimit(e.target.value !== '' ? parseInt(e.target.value) : '')} 
                  required={isTimed}
                  style={{...inputStyle, marginBottom: 0, maxWidth: '200px'}}
                />
              </div>
            )}
          </div>

        </div>

        {/* --- 2. Dynamic Questions List --- */}
        {questions.map((q, qIndex) => (
          <div key={qIndex} style={{ backgroundColor: 'var(--bg-deep)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--accent-gold)', marginBottom: '2rem', position: 'relative' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-dark)', paddingBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ backgroundColor: 'var(--accent-gold)', color: '#000', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.9rem' }}>Q{qIndex + 1}</span> 
                  {q.type.replace('_', ' ')}
                </h4>
                <button type="button" onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Trash2 size={18} /> Remove
                </button>
            </div>

            <label style={labelStyle}>Question Text</label>
            <textarea 
              placeholder="Enter the question here..." value={q.text} 
              onChange={e => updateQuestion(qIndex, 'text', e.target.value)} required
              style={{ ...inputStyle, minHeight: '100px' }}
            />

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Reference Image (Optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', backgroundColor: 'var(--border-dark)', padding: '0.5rem 1rem', borderRadius: '4px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    <ImagePlus size={18} />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                        if (e.target.files?.[0]) handleImageUpload(qIndex, e.target.files[0]);
                    }} />
                  </label>
                  {q.imageUrl && <span style={{ color: '#4caf50', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CheckCircle size={16}/> Uploaded</span>}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '6px' }}>
                <div>
                  <label style={labelStyle}>Marks Awarded</label>
                  <input type="number" step="0.1" value={q.marks} onChange={e => updateQuestion(qIndex, 'marks', parseFloat(e.target.value))} style={{...inputStyle, marginBottom: 0}} />
                </div>
                {q.type === 'CHECKBOX' && (
                    <div>
                      <label style={labelStyle}>Negative Marks (Per wrong tick)</label>
                      <input type="number" step="0.1" value={q.negativeMarks} onChange={e => updateQuestion(qIndex, 'negativeMarks', parseFloat(e.target.value))} style={{...inputStyle, marginBottom: 0}} />
                    </div>
                )}
            </div>
            
            {(q.type === 'MCQ' || q.type === 'CHECKBOX') && (
              <div>
                <label style={labelStyle}>Answer Options (Tick the correct ones)</label>
                {q.options?.map((opt, oIndex) => (
                  <div key={oIndex} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <input 
                      type={q.type === 'MCQ' ? 'radio' : 'checkbox'} 
                      checked={opt.isCorrect} 
                      name={`q-${qIndex}-correct`} 
                      onChange={e => updateOption(qIndex, oIndex, 'isCorrect', e.target.checked)} 
                      style={{ transform: 'scale(1.5)', cursor: 'pointer', accentColor: 'var(--accent-gold)' }}
                    />
                    <input 
                      type="text" placeholder={`Option ${oIndex + 1}`} value={opt.text} 
                      onChange={e => updateOption(qIndex, oIndex, 'text', e.target.value)} required 
                      style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                    />
                  </div>
                ))}
                <button type="button" onClick={() => addOption(qIndex)} style={{ marginTop: '0.5rem', background: 'none', border: '1px dashed var(--accent-gold)', color: 'var(--accent-gold)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                  <PlusCircle size={18} /> Add Another Option
                </button>
              </div>
            )}

            {q.type === 'NUMBER' && (
              <div>
                <label style={labelStyle}>Exact Numeric Answer (Decimals allowed)</label>
                <input 
                  type="number" step="0.001" placeholder="e.g. 3.142" value={q.correctNumber || ''} 
                  onChange={e => updateQuestion(qIndex, 'correctNumber', parseFloat(e.target.value))} required 
                  style={inputStyle}
                />
              </div>
            )}

            {(q.type === 'SHORT_TEXT' || q.type === 'ESSAY') && (
              <div>
                <label style={labelStyle}>{q.type === 'SHORT_TEXT' ? 'Exact Expected Text' : 'Grading Rubric / Example Answer'}</label>
                <textarea 
                  placeholder={q.type === 'SHORT_TEXT' ? "e.g., Motherboard" : "Outline the key points the student must cover..."} 
                  value={q.correctText || ''} 
                  onChange={e => updateQuestion(qIndex, 'correctText', e.target.value)} required 
                  style={{ ...inputStyle, minHeight: q.type === 'ESSAY' ? '120px' : '60px' }}
                />
              </div>
            )}

          </div>
        ))}

        {/* --- 3. Add Question Controls --- */}
        <div style={{ backgroundColor: 'var(--bg-deep)', padding: '2rem', borderRadius: '8px', border: '1px dashed var(--border-dark)', marginBottom: '3rem', textAlign: 'center' }}>
          <h4 style={{ color: 'var(--text-muted)', margin: '0 0 1.5rem 0' }}>Add a Question</h4>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            
            <button type="button" className="btn-primary" onClick={() => addQuestion('MCQ')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'transparent', border: '1px solid var(--accent-gold)' }}>
              <CheckCircle size={18} /> MCQ
            </button>
            <button type="button" className="btn-primary" onClick={() => addQuestion('CHECKBOX')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'transparent', border: '1px solid var(--accent-gold)' }}>
              <CheckSquare size={18} /> Checkbox
            </button>
            <button type="button" className="btn-primary" onClick={() => addQuestion('NUMBER')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'transparent', border: '1px solid var(--accent-gold)' }}>
              <Hash size={18} /> Number
            </button>
            <button type="button" className="btn-primary" onClick={() => addQuestion('SHORT_TEXT')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'transparent', border: '1px solid var(--accent-gold)' }}>
              <List size={18} /> Short Text
            </button>
            <button type="button" className="btn-primary" onClick={() => addQuestion('ESSAY')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'transparent', border: '1px solid var(--accent-gold)' }}>
              <FileText size={18} /> Essay
            </button>

          </div>
        </div>

        {/* --- 4. Final Submit --- */}
        <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', opacity: isSubmitting ? 0.7 : 1 }}>
          <Save size={24} />
          {isSubmitting ? 'Updating...' : (isEditMode ? 'Update Scroll' : 'Save & Publish Scroll')}
        </button>

      </form>
    </div>
  );
};

export default QuizMaker;