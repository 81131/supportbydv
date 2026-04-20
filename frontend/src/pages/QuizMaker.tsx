import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, CheckCircle2, GripVertical, AlertCircle, Clock, BookOpen, CheckSquare, FileText, Save, ListOrdered, Edit3, Settings, Upload, LayoutGrid, XCircle, Image as ImageIcon } from 'lucide-react';
import type { Question, QuestionType, AnswerOption, LectureUnit } from '../types/quiz';
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
  const [moduleUnits, setModuleUnits] = useState<LectureUnit[]>([]);

  const [showDrawer, setShowDrawer] = useState(false);

  // Topic Modal State
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [topicModalUnitId, setTopicModalUnitId] = useState<number | null>(null);
  const [topicModalQuestionIndex, setTopicModalQuestionIndex] = useState<number | null>(null);

  // JSON Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');

  // Toast notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };
  // Drag state for the Scroll Layout pill reordering
  const dragPillIndex = useRef<number | null>(null);
  const [dragOverPillIndex, setDragOverPillIndex] = useState<number | null>(null);

  useEffect(() => {
    if (moduleId) {
      api.get(`/modules/${moduleId}/units-with-topics`).then(res => setModuleUnits(res.data)).catch(console.error);
    } else {
      setModuleUnits([]);
    }
  }, [moduleId]);

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
            imageUrl: q.image_url,
            options,
            correctNumber: type === 'NUMBER' ? Number(q.correct_number) : undefined,
            correctText: (type === 'SHORT_TEXT' || type === 'ESSAY') ? String(q.correct_text || '') : undefined,
            unitId: q.unit_id || null,
            topicIds: q.topic_ids || []
          };
        });
        setQuestions(mappedQs);
      });
    }
  }, [id]);

  const addQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: Date.now(), type, text: '', marks: 1, negativeMarks: 0,
      imageUrl: undefined,
      options: ['MCQ', 'CHECKBOX', 'DRAG_DROP', 'FILL_BLANK'].includes(type) ? [{ text: '', isCorrect: !['MCQ', 'CHECKBOX'].includes(type) }, { text: '', isCorrect: false }] : undefined,
      correctNumber: undefined,
      correctText: '',
      unitId: null,
      topicIds: []
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

  const handleImportJson = () => {
    setImportError('');
    try {
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) {
        setImportError("JSON must be an array of question objects. Example: [{...}, {...}]");
        return;
      }

      const newQuestions: Question[] = [];
      let errorList: string[] = [];

      parsed.forEach((item, index) => {
        const qn = index + 1;
        const qType = (item.type || item.Type || '').toUpperCase() as QuestionType;
        const qText = item.text || item.Text || item.question || item.Question || '';

        if (!qType || !['MCQ', 'CHECKBOX', 'NUMBER', 'SHORT_TEXT', 'ESSAY', 'DRAG_DROP', 'FILL_BLANK'].includes(qType)) {
          errorList.push(`Question ${qn}: Invalid or missing 'type'. Allowed: MCQ, CHECKBOX, NUMBER, SHORT_TEXT, ESSAY, DRAG_DROP, FILL_BLANK.`);
          return;
        }
        if (!qText.trim()) {
          errorList.push(`Question ${qn}: Missing 'text' / 'question'.`);
          return;
        }

        let newQ: Question = {
          id: Date.now() + Math.random(),
          type: qType,
          text: qText,
          marks: item.marks ? Number(item.marks) : 1,
          negativeMarks: item.negativeMarks ? Number(item.negativeMarks) : 0,
          unitId: null,
          topicIds: []
        };

        if (qType === 'MCQ' || qType === 'CHECKBOX') {
          const rawOptions = item.options || item.Options || [];
          if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
            // Support dynamic keys like "Answer 1", "Answer 2"
            const extractedOptions = Object.keys(item)
              .filter(k => k.toLowerCase().startsWith('answer ') || k.toLowerCase().startsWith('option '))
              .sort()
              .map(k => String(item[k]));
            
            if (extractedOptions.length === 0) {
              errorList.push(`Question ${qn} (${qType}): Missing 'options' array or 'Answer X' fields.`);
              return;
            }
            rawOptions.push(...extractedOptions);
          }
          
          const rawCorrect = item.correctOption || item.CorrectOption || item.correctOptions || item.CorrectAnswer || item.correctAnswer;
          
          let correctFlags = 0;
          const mappedOptions = rawOptions.map((optStr: any) => {
            const strOpt = String(optStr);
            let isCorrect = false;
            if (Array.isArray(rawCorrect)) {
              isCorrect = rawCorrect.map(String).includes(strOpt);
            } else if (rawCorrect !== undefined) {
              isCorrect = (String(rawCorrect) === strOpt);
            }
            if (isCorrect) correctFlags++;
            return { text: strOpt, isCorrect };
          });

          if (correctFlags === 0) {
             errorList.push(`Question ${qn} (${qType}): No option directly matches the correct answer ('${rawCorrect}'). Check quotes/capitalization.`);
             return;
          }

          newQ.options = mappedOptions;
        } else if (qType === 'NUMBER') {
           const cNum = item.correctNumber !== undefined ? item.correctNumber : item.correctAnswer;
           if (cNum === undefined || isNaN(Number(cNum))) {
              errorList.push(`Question ${qn} (NUMBER): Missing valid 'correctNumber' or 'correctAnswer'.`);
              return;
           }
           newQ.correctNumber = Number(cNum);
        } else if (qType === 'SHORT_TEXT' || qType === 'ESSAY') {
           newQ.correctText = item.correctText || item.correctAnswer || '';
           if (qType === 'SHORT_TEXT' && !newQ.correctText) {
              errorList.push(`Question ${qn} (SHORT_TEXT): Missing 'correctText' or 'correctAnswer'.`);
              return;
           }
        } else if (qType === 'DRAG_DROP' || qType === 'FILL_BLANK') {
           const rawOptions = item.options || item.Options || [];
           if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
              errorList.push(`Question ${qn} (${qType}): Missing 'options' array for items/blanks.`);
              return;
           }
           newQ.options = rawOptions.map(opt => ({text: String(opt), isCorrect: true}));
        }

        // --- Topic & Unit Association Logic ---
        let foundUnit = null;
        let missingTopicNames: string[] = [];

        if (item.unit_identifier) {
          foundUnit = moduleUnits.find(u => u.unit_identifier === item.unit_identifier);
          if (foundUnit) {
            newQ.unitId = foundUnit.id;
          } else {
            newQ.topicError = `Unit '${item.unit_identifier}' not found in this module.`;
          }
        }

        if (foundUnit && Array.isArray(item.topics)) {
          item.topics.forEach((t: any) => {
            const topicName = t.name || t;
            const matchedTopic = foundUnit!.topics.find(ft => ft.name === topicName);
            if (matchedTopic) {
              newQ.topicIds!.push(matchedTopic.id);
            } else {
              missingTopicNames.push(String(topicName));
            }
          });

          if (missingTopicNames.length > 0) {
            newQ.topicError = `Topics not found in Unit '${foundUnit.unit_identifier}': ${missingTopicNames.join(', ')}.`;
          }
        } else if (item.topics && !foundUnit) {
           newQ.topicError = `Cannot assign topics because unit_identifier is missing or invalid.`;
        }

        newQuestions.push(newQ);
      });

      if (errorList.length > 0) {
        setImportError("Abnormalities found:\n" + errorList.join('\n'));
        return;
      }

      setQuestions(prev => [...prev, ...newQuestions]);
      setShowImportModal(false);
      setImportJsonText('');
    } catch (err: any) {
      setImportError(`Invalid JSON format: ${err.message}`);
    }
  };

  const submitAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim() || topicModalUnitId === null || topicModalQuestionIndex === null) return;
    try {
        const res = await api.post(`/modules/units/${topicModalUnitId}/topics`, { name: newTopicName });
        setModuleUnits(prev => prev.map(u => u.id === topicModalUnitId ? { ...u, topics: [...u.topics, res.data] } : u));
        const newQs = [...questions];
        if (!newQs[topicModalQuestionIndex].topicIds) newQs[topicModalQuestionIndex].topicIds = [];
        newQs[topicModalQuestionIndex].topicIds!.push(res.data.id);
        setQuestions(newQs);
        setShowTopicModal(false);
    } catch(err) {
        alert("Failed to forge topic.");
    }
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
    if (publish && questions.some(q => q.topicError)) {
      alert("Cannot publish scroll. Please resolve all topic warnings (!) before publishing.");
      return;
    }
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
        image_url: q.imageUrl,
        options: mappedOptions,
        correct_number: q.type === 'NUMBER' ? q.correctNumber : null,
        correct_text: (q.type === 'SHORT_TEXT' || q.type === 'ESSAY') ? q.correctText : null,
        unit_id: q.unitId || null,
        topic_ids: q.topicIds?.length ? q.topicIds : null
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

      {/* ── TOAST NOTIFICATION ── */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: 'var(--bg-secondary)', border: '1px solid var(--accent-gold)',
          borderRadius: '12px', padding: '0.9rem 1.2rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideInRight 0.3s ease',
          maxWidth: '340px'
        }}>
          <CheckCircle2 size={20} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
          <span style={{ color: 'var(--text-main)', fontSize: '0.88rem', lineHeight: 1.4 }}>{toastMsg}</span>
          <button
            onClick={() => setToastMsg(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginLeft: 'auto', flexShrink: 0 }}
          >
            <XCircle size={16} />
          </button>
        </div>
      )}

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
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
          <input type="checkbox" checked={allowedTools.includes("basic_calculator")} onChange={(e) => {
            if (e.target.checked) setAllowedTools([...allowedTools, "basic_calculator"]);
            else setAllowedTools(allowedTools.filter((t: string) => t !== "basic_calculator"));
          }} style={{ accentColor: 'var(--accent-gold)' }} />
          Basic Calculator
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.82rem', marginBottom: '0.8rem' }}>
          <input type="checkbox" checked={allowedTools.includes("sci_calculator")} onChange={(e) => {
            if (e.target.checked) setAllowedTools([...allowedTools, "sci_calculator"]);
            else setAllowedTools(allowedTools.filter((t: string) => t !== "sci_calculator"));
          }} style={{ accentColor: 'var(--accent-gold)' }} />
          Scientific Calculator
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

            {/* Topic Error Warning Banner */}
            {q.topicError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'rgba(255, 68, 68, 0.1)', border: '1px solid #ff4444', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                <AlertCircle size={16} color="#ff4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ color: '#ff4444', fontSize: '0.85rem' }}>Topic / Unit Mismatch</strong>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{q.topicError}</p>
                </div>
                <button
                  onClick={() => {
                    const newQs = [...questions];
                    newQs[qIndex].topicError = undefined;
                    newQs[qIndex].unitId = null;
                    newQs[qIndex].topicIds = [];
                    setQuestions(newQs);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                  title="Dismiss and clear topic"
                >
                  <XCircle size={16} />
                </button>
              </div>
            )}

            <textarea className="auth-input" value={q.text} onChange={(e) => {
              const newQs = [...questions]; newQs[qIndex].text = e.target.value; setQuestions(newQs);
            }} placeholder="Enter question text here..." style={{ minHeight: '80px', fontSize: '1.1rem', marginBottom: '0.5rem' }} />

            <div style={{ marginBottom: '1rem' }}>
              {q.imageUrl ? (
                <div style={{ position: 'relative', display: 'inline-block', marginTop: '0.5rem' }}>
                  <img src={`/api${(q.imageUrl as string).startsWith('/') ? '' : '/'}${q.imageUrl as string}`} alt="Question visual" style={{ maxHeight: '200px', borderRadius: '4px', border: '1px solid var(--border-dark)' }} />
                  <button onClick={() => {
                    const newQs = [...questions]; newQs[qIndex].imageUrl = undefined; setQuestions(newQs);
                  }} style={{ position: 'absolute', top: -10, right: -10, background: 'var(--bg-deep)', borderRadius: '50%', color: 'var(--accent-red)', border: 'none', cursor: 'pointer' }}><XCircle size={20} /></button>
                </div>
              ) : (
                <label className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem', display: 'inline-flex', cursor: 'pointer', marginTop: '0.5rem' }}>
                  <ImageIcon size={14} style={{ marginRight: '0.4rem' }} /> Add Image
                  <input type="file" style={{ display: 'none' }} accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) { alert("Image too large"); return; }
                    setIsSaving(true);
                    const fd = new FormData(); fd.append('file', file);
                    try {
                      const res = await api.post('/files/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
                      const newQs = [...questions]; newQs[qIndex].imageUrl = res.data.image_url; setQuestions(newQs);
                    } catch(err) { alert('Upload failed'); } finally { setIsSaving(false); }
                    e.target.value = '';
                  }} />
                </label>
              )}
            </div>

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
              <div style={{ flex: 1 }}>
                 <label className="text-desc" style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Lecture Unit</label>
                 <select className="auth-input" value={q.unitId || ''} onChange={(e) => {
                   const newQs = [...questions]; newQs[qIndex].unitId = e.target.value ? Number(e.target.value) : null; newQs[qIndex].topicIds = []; setQuestions(newQs);
                 }} style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                    <option value="">-- No Unit --</option>
                    {moduleUnits.map(mu => <option key={mu.id} value={mu.id}>{mu.unit_identifier}: {mu.name}</option>)}
                 </select>
              </div>
            </div>

            {q.unitId && (
               <div style={{ padding: '1rem', backgroundColor: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border-dark)', borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                  <label className="text-desc" style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>Topics <span style={{fontWeight: 'normal', fontStyle:'italic'}}>(optional)</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding:'0.5rem', borderRadius:'4px', marginTop:'0.5rem' }}>
                     {moduleUnits.find(u => u.id === q.unitId)?.topics.map(t => (
                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize:'0.8rem', background: q.topicIds?.includes(t.id) ? 'var(--accent-gold)' : 'var(--bg-dark)', color: q.topicIds?.includes(t.id) ? 'black' : 'var(--text-main)', padding: '0.2rem 0.5rem', borderRadius: '12px' }}>
                           <input type="checkbox" checked={q.topicIds?.includes(t.id)} style={{display: 'none'}} onChange={(e) => {
                             const newQs = [...questions];
                             if (!newQs[qIndex].topicIds) newQs[qIndex].topicIds = [];
                             if (e.target.checked) newQs[qIndex].topicIds!.push(t.id);
                             else newQs[qIndex].topicIds = newQs[qIndex].topicIds!.filter((id: number) => id !== t.id);
                             setQuestions(newQs);
                           }} />
                           {t.name}
                        </label>
                     ))}
                     <button onClick={() => {
                        setTopicModalUnitId(q.unitId as number);
                        setTopicModalQuestionIndex(qIndex);
                        setNewTopicName('');
                        setShowTopicModal(true);
                     }} className="btn-ghost-gold" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '12px', borderStyle: 'dashed' }}><Plus size={12}/> New Topic</button>
                  </div>
               </div>
            )}
          </div>
        ))}

        {/* Add Question */}
        <div className="module-section" style={{ borderStyle: 'dashed', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1.5rem', position: 'relative' }}>
            <p className="text-title" style={{ color: 'var(--text-muted)', margin: 0 }}>Add a Question</p>
            <button onClick={() => { setImportJsonText(''); setImportError(''); setShowImportModal(true); }} className="btn-ghost-gold" style={{ position: 'absolute', right: 0 }}><FileText size={16} style={{marginRight: '0.4rem'}}/> Bulk Import (JSON)</button>
          </div>
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
              <span style={{ flex: 1, marginLeft: '0.4rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 700, marginRight: '0.4rem' }}>Q{i + 1}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{q.type}</span>
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: '0.5rem', flexShrink: 0 }}>
                {q.text ? q.text.slice(0, 14) + (q.text.length > 14 ? '…' : '') : <em>empty</em>}
              </span>
              {q.topicError && <span title="Topic/Unit missing"><AlertCircle size={14} color="#ff4444" style={{ marginLeft: '0.5rem', flexShrink: 0, display: 'block' }} /></span>}
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

          <div className="panel-divider" style={{ marginTop: '1.5rem' }} />
          <p className="panel-heading" style={{ marginBottom: '1rem' }}>Advanced Options</p>

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
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
            <input type="checkbox" checked={allowedTools.includes("basic_calculator")} onChange={(e) => {
              if (e.target.checked) setAllowedTools([...allowedTools, "basic_calculator"]);
              else setAllowedTools(allowedTools.filter((t: string) => t !== "basic_calculator"));
            }} style={{ accentColor: 'var(--accent-gold)' }} />
            Basic Calculator
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.82rem', marginBottom: '0.8rem' }}>
            <input type="checkbox" checked={allowedTools.includes("sci_calculator")} onChange={(e) => {
              if (e.target.checked) setAllowedTools([...allowedTools, "sci_calculator"]);
              else setAllowedTools(allowedTools.filter((t: string) => t !== "sci_calculator"));
            }} style={{ accentColor: 'var(--accent-gold)' }} />
            Scientific Calculator
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
      </div>

      {showTopicModal && (
        <div className="modal-overlay" onClick={() => setShowTopicModal(false)} style={{ zIndex: 1100 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowTopicModal(false)}>✕</button>
            <h2 className="brand-font" style={{ marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>Forge Topic</h2>
            <form onSubmit={submitAddTopic} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                 <label className="text-desc" style={{display:'block'}}>Topic Name</label>
                 <input type="text" className="auth-input" placeholder="e.g. Velocity Vectors" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} required />
              </div>
              <button type="submit" className="btn-solid-gold" style={{marginTop: '0.5rem', justifyContent: 'center'}}>Add Topic</button>
            </form>
          </div>
        </div>
      )}

      {showImportModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowImportModal(false)}
          style={{ zIndex: 1100, alignItems: 'flex-start', overflowY: 'auto', padding: '2rem 1rem' }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '650px', width: '90%',
              maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              padding: 0,
              margin: 'auto'
            }}
          >
            {/* Sticky Header */}
            <div style={{ padding: '1.5rem 2rem 1rem', borderBottom: '1px solid var(--border-dark)', flexShrink: 0, position: 'relative' }}>
              <button className="close-btn" onClick={() => setShowImportModal(false)}>✕</button>
              <h2 className="brand-font" style={{ marginBottom: 0, color: 'var(--accent-gold)' }}>Bulk Import Questions</h2>
            </div>

            {/* Scrollable Body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem 2rem' }}>

            <div style={{ marginBottom: '1rem', background: 'var(--bg-deep)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-dark)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Sample Valid JSON:</p>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: '#a8b2d1' }}>
{`[
  {
    "type": "MCQ",
    "text": "What is the capital of Westeros?",
    "options": ["Winterfell", "King's Landing", "Oldtown"],
    "correctAnswer": "King's Landing",
    "marks": 2
  },
  {
    "type": "CHECKBOX", 
    "text": "Which of these are Stark direwolves?",
    "options": ["Ghost", "Nymeria", "Balerion", "Summer"],
    "correctAnswer": ["Ghost", "Nymeria", "Summer"]
  },
  {
    "type": "ESSAY",
    "text": "Describe the political implications of the Red Wedding.",
    "correctAnswer": "Rubric: Mention betrayal of guest right, shifting alliances..."
  },
  {
    "type": "DRAG_DROP",
    "text": "The wall was built by ___ using ___.",
    "options": ["Bran the Builder", "Ice and Magic"]
  }
]`}
              </pre>
            </div>

            <textarea 
              className="auth-input" 
              placeholder="Paste your JSON array here..." 
              value={importJsonText} 
              onChange={e => setImportJsonText(e.target.value)} 
              style={{ minHeight: '200px', fontFamily: 'monospace', fontSize: '0.85rem' }} 
            />

            {importError && (
              <div style={{ marginTop: '1rem', padding: '0.8rem', background: 'rgba(231, 76, 60, 0.1)', color: 'var(--accent-red)', borderRadius: '4px', border: '1px solid rgba(231, 76, 60, 0.3)', whiteSpace: 'pre-wrap', fontSize: '0.85rem', maxHeight: '150px', overflowY: 'auto' }}>
                {importError}
              </div>
            )}


            {moduleId && moduleUnits.length > 0 && (
              <div style={{ marginBottom: '0', marginTop: '1rem', background: 'var(--bg-deep)', padding: '1rem', borderRadius: '8px', border: '1px solid #a38524' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.85rem' }}>🤖 AI Prompt Generator</span>
                  <button
                    onClick={() => {
                      const outline = JSON.stringify(moduleUnits.map(u => ({
                        unit_identifier: u.unit_identifier,
                        name: u.name,
                        topics: u.topics.map(t => ({ name: t.name }))
                      })), null, 2);
                      const prompt = `Here is my module outline as a JSON string.
${outline}

I want you to convert the questions I give you into a JSON array. Use the following examples to understand every supported question type:

[
  {
    "type": "MCQ",
    "text": "Which type of agent selects actions based solely on the current percept?",
    "options": ["Model-based reflex agent", "Simple reflex agent", "Goal-based agent", "Utility-based agent"],
    "correctAnswer": "Simple reflex agent",
    "marks": 1,
    "unit_identifier": "U1",
    "topics": [{ "name": "Intelligent Agents" }]
  },
  {
    "type": "CHECKBOX",
    "text": "Which of the following are uninformed search strategies? (Select all that apply)",
    "options": ["A* Search", "Breadth-First Search (BFS)", "Depth-First Search (DFS)", "Greedy Best-First Search"],
    "correctAnswer": ["Breadth-First Search (BFS)", "Depth-First Search (DFS)"],
    "unit_identifier": "U2",
    "topics": [{ "name": "Uninformed Search Strategies" }]
  },
  {
    "type": "ESSAY",
    "text": "Explain the differences between supervised and unsupervised learning, with examples.",
    "correctAnswer": "Rubric: Student should mention labelled vs unlabelled data, provide examples like classification (supervised) and clustering (unsupervised). Award marks for clarity and examples.",
    "marks": 10,
    "unit_identifier": "U5",
    "topics": [{ "name": "Forms of Learning" }]
  },
  {
    "type": "SHORT_TEXT",
    "text": "What does the acronym 'CNN' stand for in deep learning?",
    "correctAnswer": "Convolutional Neural Network",
    "marks": 1,
    "unit_identifier": "U6",
    "topics": [{ "name": "Convolutional Neural Networks (CNNs)" }]
  },
  {
    "type": "NUMBER",
    "text": "How many layers does a simple perceptron have?",
    "correctAnswer": 2,
    "marks": 1
  },
  {
    "type": "DRAG_DROP",
    "text": "In adversarial search, the ___ algorithm evaluates game trees, while ___ pruning eliminates irrelevant branches.",
    "options": ["Minimax", "Alpha-Beta"],
    "unit_identifier": "U2",
    "topics": [{ "name": "Adversarial Search and Games" }]
  },
  {
    "type": "FILL_BLANK",
    "text": "The ___ quantifier in First-Order Logic means 'for all elements in the domain'.",
    "options": ["universal"],
    "unit_identifier": "U3",
    "topics": [{ "name": "First-Order Logic" }]
  }
]

IMPORTANT RULES:
- Each question MUST have a valid "type": MCQ, CHECKBOX, NUMBER, SHORT_TEXT, ESSAY, DRAG_DROP, or FILL_BLANK
- Include "unit_identifier" and "topics" using the module outline above where applicable
- MCQ/CHECKBOX: "options" is a string array; "correctAnswer" must exactly match one (MCQ) or more (CHECKBOX) option strings
- ESSAY: provide a grading rubric as "correctAnswer"
- SHORT_TEXT: provide the expected short answer as "correctAnswer"
- NUMBER: "correctAnswer" must be a number (no quotes)
- DRAG_DROP / FILL_BLANK: "options" contains the words/phrases to fill in the blanks, in order
- Do NOT include any text, markdown, or explanation outside the JSON array`;
                      navigator.clipboard.writeText(prompt).then(() => showToast('✅ AI prompt copied! Paste it into ChatGPT, Gemini, or any LLM.'));
                    }}
                    className="btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                  >
                    Copy Prompt
                  </button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>
                  Copy and paste this prompt into ChatGPT, Gemini, or any LLM along with your questions. The outline for <strong style={{color:'var(--text-main)'}}>{availableModules.find(m => m.id === moduleId)?.name}</strong> is automatically embedded.
                </p>
              </div>
            )}

            </div>{/* end scrollable body */}

            {/* Sticky Footer */}
            <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border-dark)', flexShrink: 0 }}>
              <button onClick={handleImportJson} className="btn-solid-gold" style={{ width: '100%', justifyContent: 'center' }}>
                Analyze &amp; Import
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default QuizMaker;