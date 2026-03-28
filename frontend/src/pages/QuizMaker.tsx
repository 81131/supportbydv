import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, CheckCircle2, GripVertical, AlertCircle, Clock, BookOpen, CheckSquare, FileText, Save } from 'lucide-react';
import type { Question, QuestionType, AnswerOption } from '../types/quiz';
import api from '../api';

const QuizMaker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState<number | ''>('');
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      api.get(`/quizzes/${id}`).then((res) => {
        const quiz = res.data;
        setTitle(quiz.title); 
        setDescription(quiz.description);
        setModuleId(quiz.module_id);
        if (quiz.time_limit_minutes) { setHasTimeLimit(true); setTimeLimitMinutes(quiz.time_limit_minutes); }
        
        // Map Backend Schema -> Frontend Interface
        const mappedQs: Question[] = quiz.questions.map((q: any) => {
          const type = (q.type || '').toUpperCase() as QuestionType;
          let options: AnswerOption[] | undefined = undefined;
          
          if (type === 'MCQ' || type === 'CHECKBOX') {
            options = q.options?.map((opt: any) => ({ text: opt.text, isCorrect: opt.is_correct })) || [];
          }

          return {
            id: q.id,
            type,
            text: q.text,
            marks: q.marks || 1,
            negativeMarks: q.negative_marks || 0,
            options,
            correctNumber: type === 'NUMBER' ? Number(q.correct_number) : undefined,
            correctText: (type === 'SHORT_TEXT' || type === 'ESSAY') ? String(q.correct_text || '') : undefined
          };
        });
        setQuestions(mappedQs);
      });
    }
  }, [id]);

  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: Date.now(), type, text: '', marks: 1, negativeMarks: 0,
      options: type === 'MCQ' || type === 'CHECKBOX' ? [{ text: 'Option 1', isCorrect: false }, { text: 'Option 2', isCorrect: false }] : undefined,
      correctNumber: undefined,
      correctText: ''
    };
    setQuestions([...questions, newQuestion]);
  };

  const saveQuiz = async () => {
    if (!title || !moduleId || questions.length === 0) { alert('Please fill in required fields and add questions.'); return; }
    setIsSaving(true);

    // 👇 THE FIX: Map Frontend Interface EXACTLY to the Backend Pydantic Schema
    const payloadQuestions = questions.map(q => {
      let mappedOptions = undefined;
      
      if (q.type === 'MCQ' || q.type === 'CHECKBOX') {
         mappedOptions = q.options?.map(o => ({
             text: o.text,
             is_correct: o.isCorrect
         }));
      }

      return {
        text: q.text,
        type: q.type, // Send exact Enum string ('MCQ', 'CHECKBOX', etc)
        marks: q.marks,
        negative_marks: q.negativeMarks || 0,
        options: mappedOptions,
        correct_number: q.type === 'NUMBER' ? q.correctNumber : null,
        correct_text: (q.type === 'SHORT_TEXT' || q.type === 'ESSAY') ? q.correctText : null
      };
    });

    const quizData = { 
      title, 
      description, 
      module_id: moduleId, 
      is_timed: hasTimeLimit,
      time_limit_minutes: hasTimeLimit ? timeLimitMinutes : null, 
      questions: payloadQuestions 
    };
    
    try {
      if (id) await api.put(`/quizzes/${id}`, quizData);
      else await api.post('/quizzes', quizData);
      navigate('/');
    } catch (error: any) { 
      console.error('Failed to save quiz', error.response?.data || error); 
      alert("Failed to save scroll. Check the console for details.");
    } 
    finally { setIsSaving(false); }
  };

  return (
    <div className="page-container">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 className="brand-font" style={{ textAlign: 'center', color: 'var(--accent-gold)', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <BookOpen size={32} /> {id ? 'Reforge the Scroll' : 'Forge a New Scroll'}
        </h1>

        <div className="module-section" style={{ marginBottom: '2rem' }}>
          <h2 className="text-title" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-dark)', paddingBottom: '0.5rem' }}>Scroll Details</h2>
          
          <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Quiz Title</label>
          <input type="text" className="auth-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Mid-Term Defenses" />

          <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description / Instructions</label>
          <textarea className="auth-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should the students know before starting?" style={{ minHeight: '100px', resize: 'vertical' }} />

          <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Target Module</label>
          <select className="auth-input" value={moduleId} onChange={(e) => setModuleId(Number(e.target.value))}>
            <option value="" disabled>Select Module</option>
            <option value={1}>OSSA (Operating System & System Administration)</option>
            <option value={2}>WMT (Web and Mobile Technologies)</option>
            <option value={3}>PS (Professional Skills)</option>
          </select>

          <div style={{ backgroundColor: 'var(--bg-deep)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-dark)', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Clock size={20} color="var(--accent-gold)" />
              <h3 className="text-title" style={{ margin: 0 }}>Time Constraints</h3>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)' }}>
              <input type="checkbox" checked={hasTimeLimit} onChange={(e) => setHasTimeLimit(e.target.checked)} style={{ accentColor: 'var(--accent-gold)', width: '18px', height: '18px' }} />
              Enforce a strict time limit for this scroll
            </label>
            {hasTimeLimit && (
              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input type="number" className="auth-input" style={{ width: '100px', margin: 0 }} value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(Number(e.target.value))} min="1" />
                <span className="text-desc">Minutes</span>
              </div>
            )}
          </div>
        </div>

        <div className="module-section" style={{ borderStyle: 'dashed', textAlign: 'center', marginBottom: '2rem' }}>
          <p className="text-title" style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Add a Question</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => addQuestion('MCQ')} className="btn-ghost-gold"><CheckCircle2 size={18} /> MCQ</button>
            <button onClick={() => addQuestion('CHECKBOX')} className="btn-ghost-gold"><CheckSquare size={18} /> Checkbox</button>
            <button onClick={() => addQuestion('NUMBER')} className="btn-ghost-gold"><AlertCircle size={18} /> Number</button>
            <button onClick={() => addQuestion('SHORT_TEXT')} className="btn-ghost-gold"><BookOpen size={18} /> Short Text</button>
            <button onClick={() => addQuestion('ESSAY')} className="btn-ghost-gold"><FileText size={18} /> Essay</button>
          </div>
        </div>

        {questions.map((q, qIndex) => (
          <div key={q.id} className="module-section" style={{ position: 'relative', marginBottom: '2rem' }}>
            <div style={{ position: 'absolute', left: '-10px', top: '20px', color: 'var(--text-muted)', cursor: 'grab' }}><GripVertical /></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span className="text-stat" style={{ padding: '0.2rem 0.8rem', backgroundColor: 'var(--bg-deep)', borderRadius: '12px', border: '1px solid var(--border-dark)' }}>
                Question {qIndex + 1} ({q.type})
              </span>
              <button onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} className="btn-ghost-danger"><Trash2 size={16} /></button>
            </div>

            <textarea className="auth-input" value={q.text} onChange={(e) => {
                const newQs = [...questions]; newQs[qIndex].text = e.target.value; setQuestions(newQs);
              }} placeholder="Enter question text here..." style={{ minHeight: '80px', fontSize: '1.1rem' }} />

            {(q.type === 'MCQ' || q.type === 'CHECKBOX') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                {q.options?.map((opt, oIndex) => (
                  <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-deep)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-dark)' }}>
                    <input type={q.type === 'MCQ' ? 'radio' : 'checkbox'} name={`q-${q.id}`} 
                      checked={opt.isCorrect}
                      onChange={(e) => {
                        const newQs = [...questions];
                        if (q.type === 'MCQ') {
                          newQs[qIndex].options?.forEach((o, i) => o.isCorrect = i === oIndex);
                        } else {
                          newQs[qIndex].options![oIndex].isCorrect = e.target.checked;
                        }
                        setQuestions(newQs);
                      }} style={{ accentColor: 'var(--accent-gold)', width: '18px', height: '18px' }} />
                    <input type="text" className="auth-input" style={{ margin: 0, padding: '0.5rem', flex: 1, background: 'transparent', border: 'none' }} value={opt.text} onChange={(e) => {
                        const newQs = [...questions];
                        newQs[qIndex].options![oIndex].text = e.target.value;
                        setQuestions(newQs);
                      }} />
                    <button onClick={() => {
                        const newQs = [...questions];
                        newQs[qIndex].options = newQs[qIndex].options?.filter((_, i) => i !== oIndex);
                        setQuestions(newQs);
                      }} className="btn-ghost" style={{ padding: '0.3rem' }}><Trash2 size={16} /></button>
                  </div>
                ))}
                <button onClick={() => {
                    const newQs = [...questions];
                    newQs[qIndex].options?.push({ text: `Option ${newQs[qIndex].options!.length + 1}`, isCorrect: false });
                    setQuestions(newQs);
                  }} className="btn-ghost" style={{ alignSelf: 'flex-start' }}><Plus size={16} /> Add Option</button>
              </div>
            )}

            {(q.type === 'NUMBER' || q.type === 'SHORT_TEXT') && (
              <div style={{ marginTop: '1rem' }}>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem' }}>Correct Answer (Required for Auto-Marking)</label>
                <input type={q.type === 'NUMBER' ? 'number' : 'text'} className="auth-input" value={q.type === 'NUMBER' ? (q.correctNumber || '') : (q.correctText || '')} onChange={(e) => {
                    const newQs = [...questions];
                    if (q.type === 'NUMBER') newQs[qIndex].correctNumber = Number(e.target.value);
                    else newQs[qIndex].correctText = e.target.value;
                    setQuestions(newQs);
                  }} placeholder="Enter the exact correct answer..." />
              </div>
            )}

            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
              <div style={{ flex: 1 }}>
                <label className="text-desc" style={{ color: '#4caf50', fontWeight: 'bold' }}>Points Earned</label>
                <input type="number" className="auth-input" value={q.marks} onChange={(e) => {
                    const newQs = [...questions]; newQs[qIndex].marks = Number(e.target.value); setQuestions(newQs);
                  }} min="0" step="0.5" style={{ marginTop: '0.5rem', marginBottom: 0 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="text-desc" style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>Negative Penalty</label>
                <input type="number" className="auth-input" value={q.negativeMarks || 0} onChange={(e) => {
                    const newQs = [...questions]; newQs[qIndex].negativeMarks = Number(e.target.value); setQuestions(newQs);
                  }} min="0" step="0.5" style={{ marginTop: '0.5rem', marginBottom: 0 }} placeholder="e.g. 0.25" />
              </div>
            </div>
          </div>
        ))}

        <button onClick={saveQuiz} disabled={isSaving || questions.length === 0} className="btn-solid-gold" style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', justifyContent: 'center', opacity: (isSaving || questions.length === 0) ? 0.5 : 1 }}>
          <Save size={24} /> {isSaving ? 'Forging...' : 'Save & Publish Scroll'}
        </button>
      </div>
    </div>
  );
};

export default QuizMaker;