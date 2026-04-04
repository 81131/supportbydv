import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, CheckCircle2, GripVertical, AlertCircle, Clock, BookOpen, CheckSquare, FileText, Save, ListOrdered, Edit3, Settings, Upload, LayoutGrid, XCircle } from 'lucide-react';
import type { Question, QuestionType, AnswerOption } from '../types/quiz';
import api from '../api';

const QuizMaker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillModuleId = searchParams.get('moduleId') ? parseInt(searchParams.get('moduleId')!) : '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState<number | ''>(prefillModuleId as number | '');
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [consentText, setConsentText] = useState('');
  const [allowedTools, setAllowedTools] = useState<string[]>([]);
  const [allowedResources, setAllowedResources] = useState<string[]>([]);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [availableModules, setAvailableModules] = useState<any[]>([]);

  const [showDrawer, setShowDrawer] = useState(false);

  // Drag state for the Scroll Layout pill reordering
  const dragPillIndex = useRef<number | null>(null);
  const [dragOverPillIndex, setDragOverPillIndex] = useState<number | null>(null);

  useEffect(() => {
    api.get('/modules').then(res => setAvailableModules(res.data)).catch(console.error);
    if (id) {
      api.get(`/quizzes/${id}`).then((res) => {
        const quiz = res.data;
        setTitle(quiz.title); 
        setDescription(quiz.description);
        setModuleId(quiz.module_id);
        if (quiz.time_limit_minutes) { setHasTimeLimit(true); setTimeLimitMinutes(quiz.time_limit_minutes); }
        if (quiz.consent_text) setConsentText(quiz.consent_text);
        if (quiz.allowed_tools) {
          try { setAllowedTools(JSON.parse(quiz.allowed_tools)); } catch(e){}
        }
        if (quiz.allowed_resources) {
          try { setAllowedResources(JSON.parse(quiz.allowed_resources)); } catch(e){}
        }
        
        const mappedQs: Question[] = quiz.questions.map((q: any) => {
          const type = (q.type || '').toUpperCase() as QuestionType;
          let options: AnswerOption[] | undefined = undefined;
          
          if (type === 'MCQ' || type === 'CHECKBOX') {
            options = q.options?.map((opt: any) => ({ text: opt.text, isCorrect: opt.is_correct })) || [];
          } else if (type === 'DRAG_DROP' || type === 'FILL_BLANK') {
            options = q.options?.map((opt: any) => ({ text: opt.text, isCorrect: true })) || [];
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
      options: ['MCQ', 'CHECKBOX', 'DRAG_DROP', 'FILL_BLANK'].includes(type) ? [{ text: '', isCorrect: !['MCQ', 'CHECKBOX'].includes(type) }, { text: '', isCorrect: false }] : undefined,
      correctNumber: undefined,
      correctText: ''
    };
    setQuestions([...questions, newQuestion]);
  };

  // --- Drag-to-reorder on MAIN QUESTION CARDS ---
  const handleDropQuestion = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData('text/plain'));
    if (dragIndex === dropIndex) return;
    const reorder = [...questions];
    const [removed] = reorder.splice(dragIndex, 1);
    reorder.splice(dropIndex, 0, removed);
    setQuestions(reorder);
  };

  // --- Drag-to-reorder on SCROLL LAYOUT PILLS ---
  const handlePillDragStart = (e: React.DragEvent, index: number) => {
    dragPillIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePillDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPillIndex(index);
  };

  const handlePillDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = dragPillIndex.current;
    if (fromIndex === null || fromIndex === dropIndex) { setDragOverPillIndex(null); return; }
    const reorder = [...questions];
    const [removed] = reorder.splice(fromIndex, 1);
    reorder.splice(dropIndex, 0, removed);
    setQuestions(reorder);
    dragPillIndex.current = null;
    setDragOverPillIndex(null);
  };

  const handlePillDragEnd = () => {
    dragPillIndex.current = null;
    setDragOverPillIndex(null);
  };

  const uploadResource = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("The Maesters cannot permit files over 10MB as resources.");
      return;
    }
    setIsSaving(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/quizzes/resources/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAllowedResources([...allowedResources, res.data.file_url]);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Upload failed.");
    } finally {
      setIsSaving(false);
    }
    e.target.value = '';
  };

  const saveQuiz = async (publish: boolean) => {
    if (!title || !moduleId || questions.length === 0) { alert('Please fill in required fields and add questions.'); return; }

    for (let i = 0; i < questions.length; i++) {
       const q = questions[i];
       if (!q.text.trim()) { alert(`Question ${i + 1} needs text.`); return; }
       if (q.type === 'MCQ' || q.type === 'CHECKBOX' || q.type === 'DRAG_DROP') {
           if ((q.type === 'MCQ' || q.type === 'CHECKBOX') && !q.options?.some(o => o.isCorrect)) { alert(`Question ${i + 1} needs at least one correct option.`); return; }
           if (q.options?.some(o => !o.text.trim())) { alert(`Question ${i + 1} has empty action items.`); return; }
           if (q.type === 'DRAG_DROP' && q.options && q.options.length < 2) { alert(`Drag & Drop Question ${i + 1} needs at least 2 items to sort.`); return; }
       }
       if (q.type === 'NUMBER' && q.correctNumber === undefined) { alert(`Question ${i + 1} needs a required numeric answer.`); return; }
       if (q.type === 'SHORT_TEXT' && !q.correctText?.trim()) { alert(`Question ${i + 1} needs a strict correct string to match.`); return; }
    }

    setIsSaving(true);

    const payloadQuestions = questions.map(q => {
      let mappedOptions = undefined;
      if (['MCQ', 'CHECKBOX', 'DRAG_DROP', 'FILL_BLANK'].includes(q.type)) {
         mappedOptions = q.options?.map(o => ({
             text: o.text,
             is_correct: ['FILL_BLANK'].includes(q.type) ? true : o.isCorrect
         }));
      }
      return {
        text: q.text,
        type: q.type,
        marks: q.marks,
        negative_marks: q.negativeMarks || 0,
        options: mappedOptions,
        correct_number: q.type === 'NUMBER' ? q.correctNumber : null,
        correct_text: (q.type === 'SHORT_TEXT' || q.type === 'ESSAY') ? q.correctText : null
      };
    });

    const quizData = { 
      title, description, module_id: moduleId, 
      is_timed: hasTimeLimit,
      time_limit_minutes: hasTimeLimit ? timeLimitMinutes : null,
      consent_text: consentText,
      allowed_tools: JSON.stringify(allowedTools),
      allowed_resources: JSON.stringify(allowedResources),
      is_published: publish,
      questions: payloadQuestions 
    };
    
    try {
      if (id) await api.put(`/quizzes/${id}`, quizData);
      else await api.post('/quizzes', quizData);
      navigate('/my-quizzes');
    } catch (error: any) { 
      console.error('Failed to save quiz', error.response?.data || error); 
      alert("Failed to save scroll. Check the console for details.");
    } finally { setIsSaving(false); }
  };

  return (
    <div className="quiz-layout-wrapper">

      {/* ── MOBILE DRAWER TOGGLE ── */}
      <div className="mobile-only" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
        <button className="btn-solid-gold" style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0, justifyContent: 'center' }} onClick={() => setShowDrawer(!showDrawer)}>
          <LayoutGrid size={24} />
        </button>
      </div>

      {/* ══════════════════════════════
          LEFT PANEL: Actions + Advanced
          ══════════════════════════════ */}
      <div className="quiz-panel-left">

        {/* Actions */}
        <p className="panel-heading">Actions</p>
        <button
          onClick={() => saveQuiz(false)}
          disabled={isSaving || questions.length === 0}
          className="btn-ghost"
          style={{ width: '100%', marginBottom: '0.5rem', justifyContent: 'center' }}
        >
          <Save size={16} style={{ marginRight: '0.4rem' }} />
          {isSaving ? 'Forging…' : 'Save Draft'}
        </button>
        <button
          onClick={() => saveQuiz(true)}
          disabled={isSaving || questions.length === 0}
          className="btn-solid-gold"
          style={{ width: '100%', justifyContent: 'center', opacity: (isSaving || questions.length === 0) ? 0.5 : 1 }}
        >
          <BookOpen size={16} style={{ marginRight: '0.4rem' }} /> Publish Scroll
        </button>

        <div className="panel-divider" />

        {/* Advanced Options */}
        <p className="panel-heading">Advanced Options</p>

        {/* Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <Clock size={14} color="var(--accent-gold)" />
          <span className="text-desc" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Time Limit</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.82rem', marginBottom: '0.6rem' }}>
          <input type="checkbox" checked={hasTimeLimit} onChange={(e) => setHasTimeLimit(e.target.checked)} style={{ accentColor: 'var(--accent-gold)' }} />
          Enforce limit
        </label>
        {hasTimeLimit && (
          <div style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="number" className="auth-input" style={{ width: '70px', margin: 0, padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(Number(e.target.value))} min="1" />
            <span className="text-desc" style={{ fontSize: '0.8rem' }}>mins</span>
          </div>
        )}

        {/* Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <Settings size={14} color="var(--accent-gold)" />
          <span className="text-desc" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Allowed Tools</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.82rem', marginBottom: '0.8rem' }}>
          <input type="checkbox" checked={allowedTools.includes("sci_calculator")} onChange={(e) => {
            if (e.target.checked) setAllowedTools([...allowedTools, "sci_calculator"]);
            else setAllowedTools(allowedTools.filter((t: string) => t !== "sci_calculator"));
          }} style={{ accentColor: 'var(--accent-gold)' }} />
          Sci Calculator
        </label>

        {/* Resources */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
          <FileText size={14} color="var(--accent-gold)" />
          <span className="text-desc" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Resources</span>
        </div>
        {allowedResources.map((_url, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-deep)', padding: '0.2rem 0.5rem', borderRadius: '4px', marginBottom: '0.4rem', fontSize: '0.78rem' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>Attachment {i + 1}</span>
            <button onClick={() => setAllowedResources(allowedResources.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: 0 }}><Trash2 size={12} /></button>
          </div>
        ))}
        <label className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.35rem', justifyContent: 'center', cursor: 'pointer', display: 'flex' }}>
          <Upload size={13} style={{ marginRight: '0.3rem' }} /> Upload (Max 10MB)
          <input type="file" style={{ display: 'none' }} onChange={uploadResource} />
        </label>
      </div>

      {/* ══════════════════════════════
          CENTRE: Main Builder
          ══════════════════════════════ */}
      <div className="quiz-main-content">
        <h1 className="brand-font" style={{ textAlign: 'center', color: 'var(--accent-gold)', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          {id ? 'Reforge the Scroll' : 'Forge a New Scroll'}
        </h1>

        {/* Scroll Details */}
        <div className="module-section" style={{ marginBottom: '2rem' }}>
          <h2 className="text-title" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-dark)', paddingBottom: '0.5rem' }}>Scroll Details</h2>
          
          <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Quiz Title</label>
          <input type="text" className="auth-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Mid-Term Defenses" />

          <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description / Instructions</label>
          <textarea className="auth-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should the students know before starting?" style={{ minHeight: '100px', resize: 'vertical' }} />

          <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Target Module</label>
          <select className="auth-input" value={moduleId} onChange={(e) => setModuleId(Number(e.target.value))}>
            <option value="" disabled>Select Module</option>
            {availableModules.map(m => (
              <option key={m.id} value={m.id}>{m.code} ({m.name})</option>
            ))}
          </select>
          
          <label className="text-desc" style={{ display: 'block', marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Consent Screen <span style={{ fontWeight: 400 }}>(Optional — shown before test begins)</span></label>
          <textarea className="auth-input" value={consentText} onChange={(e) => setConsentText(e.target.value)} placeholder="Terms or extra instructions the student must accept before the timer starts..." style={{ minHeight: '80px', resize: 'vertical' }} />
        </div>

        {/* Question Cards */}
        {questions.map((q, qIndex) => (
          <div
            key={q.id}
            id={`question-${qIndex}`}
            className="module-section"
            style={{ position: 'relative', scrollMarginTop: '2rem', marginBottom: '2rem' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDropQuestion(e, qIndex)}
          >
            {/* Grip handle for card reordering */}
            <div
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', qIndex.toString())}
              style={{ position: 'absolute', left: '-10px', top: '20px', color: 'var(--text-muted)', cursor: 'grab' }}
            >
              <GripVertical />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span className="text-stat" style={{ padding: '0.2rem 0.8rem', backgroundColor: 'var(--bg-deep)', borderRadius: '12px', border: '1px solid var(--border-dark)' }}>
                Question {qIndex + 1} ({q.type})
              </span>
              <button onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} className="btn-ghost-danger"><Trash2 size={16} /></button>
            </div>

            <textarea className="auth-input" value={q.text} onChange={(e) => {
              const newQs = [...questions]; newQs[qIndex].text = e.target.value; setQuestions(newQs);
            }} placeholder="Enter question text here..." style={{ minHeight: '80px', fontSize: '1.1rem' }} />

            {['MCQ', 'CHECKBOX', 'DRAG_DROP', 'FILL_BLANK'].includes(q.type) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                {q.type === 'DRAG_DROP' && <p className="text-desc" style={{ color: 'var(--text-muted)' }}>List items that will constitute the Word Bank. The question text MUST contain <b>___</b> to indicate missing words sequentially.</p>}
                {q.type === 'FILL_BLANK' && <p className="text-desc" style={{ color: 'var(--text-muted)' }}>List the words/phrases to fill in the blanks sequentially. Use <b>___</b> in the text as blank markers.</p>}
                {q.options?.map((opt, oIndex) => (
                  <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-deep)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-dark)' }}>
                    {q.type !== 'FILL_BLANK' && (
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
                        }} style={{ accentColor: 'var(--accent-gold)', width: '18px', height: '18px' }} title="Is Correct?" />
                    )}
                    {q.type === 'DRAG_DROP' && <span className="text-desc" style={{ fontSize: '0.75rem', color: opt.isCorrect ? '#4caf50' : 'var(--accent-red)' }}>{opt.isCorrect ? 'Correct blank in sequence' : 'Decoy'}</span>}
                    {q.type === 'FILL_BLANK' && <span className="text-desc" style={{ background: 'var(--accent-gold)', color: 'black', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold' }}>{oIndex + 1}</span>}
                    <input type="text" className="auth-input" style={{ margin: 0, padding: '0.5rem', flex: 1, background: 'transparent', border: 'none' }} value={opt.text} placeholder={['DRAG_DROP', 'FILL_BLANK'].includes(q.type) ? `Item ${oIndex + 1}` : `Option ${oIndex + 1}`} onChange={(e) => {
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
                  newQs[qIndex].options?.push({ text: '', isCorrect: ['DRAG_DROP', 'FILL_BLANK'].includes(q.type) ? true : false });
                  setQuestions(newQs);
                }} className="btn-ghost" style={{ alignSelf: 'flex-start' }}><Plus size={16} /> Add {['DRAG_DROP', 'FILL_BLANK'].includes(q.type) ? 'Item' : 'Option'}</button>
              </div>
            )}

            {(q.type === 'NUMBER' || q.type === 'SHORT_TEXT' || q.type === 'ESSAY') && (
              <div style={{ marginTop: '1rem' }}>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  {q.type === 'ESSAY' ? 'Sample Answer / Evaluation Rubric (Hidden from students)' : 'Correct Answer (Required for Auto-Marking)'}
                </label>
                {q.type === 'ESSAY' ? (
                  <textarea className="auth-input" value={q.correctText || ''} onChange={(e) => {
                    const newQs = [...questions]; newQs[qIndex].correctText = e.target.value; setQuestions(newQs);
                  }} placeholder="Guideline for the reviewer..." style={{ minHeight: '60px' }} />
                ) : (
                  <input type={q.type === 'NUMBER' ? 'number' : 'text'} className="auth-input" value={q.type === 'NUMBER' ? (q.correctNumber || '') : (q.correctText || '')} onChange={(e) => {
                    const newQs = [...questions];
                    if (q.type === 'NUMBER') newQs[qIndex].correctNumber = Number(e.target.value);
                    else newQs[qIndex].correctText = e.target.value;
                    setQuestions(newQs);
                  }} placeholder="Enter the exact correct answer..." />
                )}
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

        {/* Add Question */}
        <div className="module-section" style={{ borderStyle: 'dashed', textAlign: 'center', marginBottom: '2rem' }}>
          <p className="text-title" style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>Add a Question</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => addQuestion('MCQ')} className="btn-ghost-gold"><CheckCircle2 size={18} /> MCQ</button>
            <button onClick={() => addQuestion('CHECKBOX')} className="btn-ghost-gold"><CheckSquare size={18} /> Checkbox</button>
            <button onClick={() => addQuestion('NUMBER')} className="btn-ghost-gold"><AlertCircle size={18} /> Number</button>
            <button onClick={() => addQuestion('SHORT_TEXT')} className="btn-ghost-gold"><BookOpen size={18} /> Short Text</button>
            <button onClick={() => addQuestion('ESSAY')} className="btn-ghost-gold"><FileText size={18} /> Essay</button>
            <button onClick={() => addQuestion('DRAG_DROP')} className="btn-ghost-gold"><ListOrdered size={18} /> Drag &amp; Drop</button>
            <button onClick={() => addQuestion('FILL_BLANK')} className="btn-ghost-gold"><Edit3 size={18} /> Fill in the Blank</button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════
          RIGHT PANEL: Scroll Layout
          ══════════════════════════════ */}
      <div className={`quiz-panel-right ${showDrawer ? 'mobile-drawer-open' : 'mobile-drawer-hidden'}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p className="panel-heading" style={{ marginBottom: 0 }}>Scroll Layout</p>
          <button onClick={() => setShowDrawer(false)} className="close-btn mobile-only" style={{ position: 'static' }}><XCircle size={18} /></button>
        </div>

        {questions.length === 0 && (
          <p className="text-desc" style={{ fontStyle: 'italic', marginBottom: '1rem' }}>No questions yet. Add one below.</p>
        )}

        {/* Draggable pill list */}
        <div>
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={`scroll-pill${dragOverPillIndex === i ? ' drag-over' : ''}`}
              draggable
              onDragStart={(e) => handlePillDragStart(e, i)}
              onDragOver={(e) => handlePillDragOver(e, i)}
              onDrop={(e) => handlePillDrop(e, i)}
              onDragEnd={handlePillDragEnd}
              onClick={() => {
                const target = document.getElementById(`question-${i}`);
                if (target) target.scrollIntoView({ behavior: 'smooth' });
                setShowDrawer(false);
              }}
              title="Drag to reorder · Click to jump"
            >
              <GripVertical size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ flex: 1, marginLeft: '0.4rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 700, marginRight: '0.4rem' }}>Q{i + 1}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{q.type}</span>
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: '0.5rem', flexShrink: 0 }}>
                {q.text ? q.text.slice(0, 14) + (q.text.length > 14 ? '…' : '') : <em>empty</em>}
              </span>
            </div>
          ))}
        </div>

        {questions.length > 0 && (
          <>
            <div className="panel-divider" />
            <p className="text-desc" style={{ fontSize: '0.75rem' }}>
              Drag pills to reorder · Click to jump to question
            </p>
          </>
        )}

        <div className="mobile-only" style={{ marginTop: '2rem' }}>
          <div className="panel-divider" />
          <p className="panel-heading" style={{ marginBottom: '1rem' }}>Actions</p>
          <button onClick={() => saveQuiz(false)} disabled={isSaving || questions.length === 0} className="btn-ghost" style={{ width: '100%', marginBottom: '0.5rem', justifyContent: 'center' }}>
            <Save size={16} style={{ marginRight: '0.4rem' }} /> {isSaving ? 'Forging…' : 'Save Draft'}
          </button>
          <button onClick={() => saveQuiz(true)} disabled={isSaving || questions.length === 0} className="btn-solid-gold" style={{ width: '100%', justifyContent: 'center', opacity: (isSaving || questions.length === 0) ? 0.5 : 1 }}>
            <BookOpen size={16} style={{ marginRight: '0.4rem' }} /> Publish Scroll
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizMaker;