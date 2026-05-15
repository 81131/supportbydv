import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Timer as TimerIcon, CheckCircle, Send, RefreshCcw, AlertCircle, ArrowLeft, ArrowRight, Flag, Calculator, Hash, LayoutGrid, ListOrdered, FileText, CheckSquare, Edit3, XCircle } from 'lucide-react';
import ScientificCalculator from '../components/ScientificCalculator';

const TakeQuiz: React.FC = () => {
  const { id, questionIndex } = useParams();
  const navigate = useNavigate();

  const activeQuestionIndex = questionIndex ? parseInt(questionIndex) - 1 : 0;

  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null); // still used as a guard for timers/re-submission
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isConsentAgreed, setIsConsentAgreed] = useState(false);
  const answersRef = useRef(answers);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [flash, setFlash] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showFlash = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setFlash({ message, type });
    setTimeout(() => setFlash(null), 3000);
  };

  useEffect(() => {
    api.get(`/quizzes/${id}/take`)
      .then(res => {
        setQuiz(res.data);
        if (res.data.attempt_created_at) {
           setIsConsentAgreed(true);
           const serverStart = new Date(res.data.attempt_created_at).getTime();
           setStartTime(serverStart);
           if (res.data.is_timed && res.data.time_limit_minutes) {
             const consumed = Math.floor((Date.now() - serverStart) / 1000);
             const remaining = res.data.time_limit_minutes * 60 - consumed;
             setTimeLeft(remaining > 0 ? remaining : 0); 
           }
           
           if (res.data.draft && Object.keys(res.data.draft).length > 0) {
             const loadedAnswers: Record<number, any> = {};
             Object.entries(res.data.draft).forEach(([qId, d]: [string, any]) => {
               loadedAnswers[parseInt(qId)] = {
                 is_flagged: d.is_flagged,
                 ...d.parsed
               };
             });
             setAnswers(loadedAnswers);
           }

           if (!questionIndex && res.data.questions?.length > 0) {
             navigate(`/take-quiz/${id}/q/1`, { replace: true });
           }
        } else {
           if (!res.data.consent_text) {
             handleStartAttempt();
           }
        }
      })
      .catch(err => {
        console.error("Failed to fetch quiz", err);
        showFlash("The scroll could not be retrieved.", "error");
        setTimeout(() => navigate(-1), 3000);
      });
  }, [id]);

  useEffect(() => {
    if (!isConsentAgreed || !quiz || !quiz.is_timed || timeLeft === null || timeLeft <= 0 || results) return;
    const timer = setInterval(() => {
       const consumed = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
       const remaining = (quiz.time_limit_minutes * 60) - consumed;
       if (remaining <= 0) { clearInterval(timer); setTimeLeft(0); handleSubmit(); }
       else { setTimeLeft(remaining); }
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz, isConsentAgreed, results, startTime, timeLeft]);

  useEffect(() => {
    if (!isConsentAgreed || results) return;
    const autoSaveTimer = setInterval(() => {
       saveDraft(true); // silent true
    }, 10 * 60 * 1000);
    return () => clearInterval(autoSaveTimer);
  }, [isConsentAgreed, results, startTime]);
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isConsentAgreed && !results && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isConsentAgreed, results, isSubmitting]);

  useEffect(() => {
    if (isConsentAgreed && !results && quiz && quiz.questions.length > 0) {
      const timer = setInterval(() => {
        setAnswers(prev => {
           const qId = quiz.questions[activeQuestionIndex].id;
           const curAns = prev[qId] || {};
           return { ...prev, [qId]: { ...curAns, time_spent_seconds: (curAns.time_spent_seconds || 0) + 1 }};
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isConsentAgreed, results, quiz, activeQuestionIndex]);

  const handleStartAttempt = async () => {
    try {
      const res = await api.post(`/quizzes/${id}/start`);
      setIsConsentAgreed(true);
      const serverStart = new Date(res.data.attempt_created_at).getTime();
      setStartTime(serverStart);
      // Wait for fetch inside start or fallback
      navigate(`/take-quiz/${id}/q/1`, { replace: true });
      window.location.reload(); // Refresh to catch all questions properly
    } catch(e) {
      showFlash("Failed to bind scroll to a new attempt.", "error");
    }
  };

  const saveDraft = async (silent=false) => {
    if (results || !quiz || !startTime) return;
    const timeConsumedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const currAnswers = answersRef.current;
    if (Object.keys(currAnswers).length === 0) return;
    const formattedAnswers = Object.keys(currAnswers).map(qId => ({
      question_id: parseInt(qId),
      ...currAnswers[parseInt(qId)]
    }));
    try {
      await api.post(`/quizzes/${id}/submit`, { answers: formattedAnswers, time_consumed_seconds: timeConsumedSeconds, is_draft: true });
      if(!silent) showFlash("Draft saved.", "success");
    } catch(err) { console.error("Draft fail", err); }
  };

  const handleNext = () => {
    saveDraft(true);
    if (activeQuestionIndex < quiz.questions.length - 1) navigate(`/take-quiz/${id}/q/${activeQuestionIndex + 2}`);
  };
  const handlePrev = () => {
    saveDraft(true);
    if (activeQuestionIndex > 0) navigate(`/take-quiz/${id}/q/${activeQuestionIndex}`);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60); const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const updateAnswer = (qId: number, key: string, value: any) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], [key]: value } }));
  };

  const toggleFlag = (qId: number) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], is_flagged: !(prev[qId]?.is_flagged) } }));
  };

  const handleOptionChange = (qId: number, optId: number, type: string) => {
    setAnswers(prev => {
      if (type === 'MCQ') return { ...prev, [qId]: { ...prev[qId], selected_options: [optId] } };
      const currentSelections = prev[qId]?.selected_options || [];
      const newSelections = currentSelections.includes(optId)
        ? currentSelections.filter((id: number) => id !== optId)
        : [...currentSelections, optId];
      return { ...prev, [qId]: { ...prev[qId], selected_options: newSelections } };
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (results) return; 
    
    if (e) {
      const unansweredCount = quiz.questions.length - Object.keys(answers).filter(qId => isAnswered(parseInt(qId))).length;
      let confirmMsg = "Are you sure you want to finalize your answers?";
      if (unansweredCount > 0) confirmMsg = `You have ${unansweredCount} unanswered question(s). Are you sure you want to finish the attempt?`;
      // Show our custom dialog instead of window.confirm
      setConfirmDialog({ message: confirmMsg, onConfirm: () => { setConfirmDialog(null); doSubmit(); } });
      return;
    }
    doSubmit();
  };

  const doSubmit = async () => {

    setIsSubmitting(true);
    const timeConsumedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

    try {
      const currAnswers = answersRef.current;
      const res = await api.post(`/quizzes/${id}/submit`, { 
        answers: Object.keys(currAnswers).map(qId => ({
          question_id: parseInt(qId),
          ...currAnswers[parseInt(qId)]
        })),
        time_consumed_seconds: timeConsumedSeconds,
        is_draft: false
      });
      setResults(res.data); // guard: stops timers and prevents re-submission
      // Redirect to the dedicated attempt review page
      navigate(`/quiz-attempt/${res.data.attempt_id}`, { replace: true });
    } catch (error) {
      console.error("Submission failed", error);
      showFlash("Failed to submit the scroll. Check your connection.", "error");
    } finally { setIsSubmitting(false); }
  };

  const isAnswered = (qId: number) => {
    const ans = answers[qId];
    if (!ans) return false;
    if (ans.selected_options?.length > 0) return true;
    if (ans.text_answer?.trim()?.length > 0) return true;
    if (ans.numeric_answer !== undefined && ans.numeric_answer !== null) return true;
    if (ans.drag_drop_answer?.length > 0) return true;
    if (ans.fill_blank_answer?.some((a: string) => a && a.trim().length > 0)) return true;
    return false;
  };

  let parsedResources: string[] = [];
  if (quiz && quiz.allowed_resources) {
    try {
      if (typeof quiz.allowed_resources === 'string') {
        parsedResources = JSON.parse(quiz.allowed_resources);
      } else if (Array.isArray(quiz.allowed_resources)) {
        parsedResources = quiz.allowed_resources;
      }
    } catch(e) {}
  }

  if (!quiz) return <div className="page-container text-title" style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--accent-gold)' }}>Unrolling the scroll...</div>;

  if (quiz && !isConsentAgreed && !results) {
    return (
      <div className="page-container" style={{ maxWidth: '800px', margin: '4rem auto' }}>
         <div className="module-section" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
             <AlertCircle size={48} color="var(--accent-gold)" style={{ margin: '0 auto 1.5rem auto' }} />
             <h1 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>Important Instructions &amp; Consent</h1>
             <div style={{ backgroundColor: 'var(--bg-deep)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-dark)', marginBottom: '2rem', textAlign: 'left', whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '1.1rem', lineHeight: '1.6' }}>
                 {quiz.consent_text}
             </div>
             <p className="text-desc" style={{ marginBottom: '2rem' }}>Once you begin, the timer will start automatically. Ensure you are ready.</p>
             <button className="btn-solid-gold" style={{ fontSize: '1.2rem', padding: '1rem 3rem' }} onClick={() => handleStartAttempt()}>
                 <CheckSquare size={20} style={{ marginRight: '0.8rem' }} /> I Agree, Begin Scroll
             </button>
         </div>
      </div>
    );
  }

  if (activeQuestionIndex < 0 || activeQuestionIndex >= quiz.questions?.length) {
    return <div className="page-container text-title" style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--accent-gold)' }}>Question not found.</div>;
  }


  const q = quiz.questions[activeQuestionIndex];
  
  const currentDDFills = answers[q?.id]?.drag_drop_answer || [];
  
  const handleOnDragStart = (e: React.DragEvent, word: string, sourceIndex?: number) => {
    e.dataTransfer.setData("text/plain", word);
    if (sourceIndex !== undefined) e.dataTransfer.setData("sourceIndex", sourceIndex.toString());
  };

  const handleOnDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const word = e.dataTransfer.getData("text/plain");
    const sourceIndex = e.dataTransfer.getData("sourceIndex");
    const newFills = [...currentDDFills];
    if (sourceIndex) {
      const sIdx = parseInt(sourceIndex);
      const existingWord = newFills[targetIndex];
      newFills[targetIndex] = word;
      newFills[sIdx] = existingWord || '';
    } else {
      newFills[targetIndex] = word;
    }
    updateAnswer(q.id, 'drag_drop_answer', newFills);
  };
  
  const handleBankDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceIndex = e.dataTransfer.getData("sourceIndex");
    if (sourceIndex) {
      const newFills = [...currentDDFills];
      newFills[parseInt(sourceIndex)] = '';
      updateAnswer(q.id, 'drag_drop_answer', newFills);
    }
  };

  return (
    <div className="quiz-layout-wrapper">

      {/* Flash message */}
      {flash && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, backgroundColor: flash.type === 'error' ? 'var(--accent-red)' : (flash.type === 'success' ? '#4caf50' : 'var(--bg-deep)'), color: flash.type === 'info' ? 'var(--accent-gold)' : '#fff', padding: '1rem 2rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
          {flash.type === 'error' ? <XCircle size={20} /> : <CheckCircle size={20} />}
          {flash.message}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div onClick={() => setConfirmDialog(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9990, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', borderRadius: '16px', padding: '2rem', maxWidth: '440px', width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <AlertCircle size={28} color="var(--accent-gold)" />
              <h2 className="brand-font" style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '1.3rem' }}>Finish Attempt?</h2>
            </div>
            <p style={{ color: 'var(--text-main)', lineHeight: 1.6, marginBottom: '2rem' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setConfirmDialog(null)}>Cancel</button>
              <button className="btn-solid-gold" onClick={confirmDialog.onConfirm} style={{ justifyContent: 'center' }}>
                <Send size={16} style={{ marginRight: '0.4rem' }} /> Submit Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile drawer toggle */}
      <div className="mobile-only" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
        <button className="btn-solid-gold" style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0, justifyContent: 'center' }} onClick={() => setShowDrawer(!showDrawer)}>
          <LayoutGrid size={24} />
        </button>
      </div>

      {/* ══════════════════════════════
          LEFT PANEL: Actions + Utility
          ══════════════════════════════ */}
      <div className="quiz-panel-left">
        {/* Actions */}
        <p className="panel-heading">Actions</p>
        <button
          onClick={() => toggleFlag(q.id)}
          className={`btn-ghost`}
          style={{ width: '100%', marginBottom: '0.5rem', color: answers[q?.id]?.is_flagged ? 'var(--accent-red)' : 'var(--text-main)', borderColor: answers[q?.id]?.is_flagged ? 'var(--accent-red)' : 'var(--border-dark)', justifyContent: 'center' }}
        >
          <Flag size={16} fill={answers[q?.id]?.is_flagged ? 'var(--accent-red)' : 'none'} style={{ marginRight: '0.4rem' }} />
          {answers[q?.id]?.is_flagged ? 'Unflag' : 'Flag Question'}
        </button>
        <button
          onClick={(e) => handleSubmit(e)}
          disabled={isSubmitting}
          className="btn-solid-gold"
          style={{ width: '100%', justifyContent: 'center', opacity: isSubmitting ? 0.5 : 1 }}
        >
          <Send size={16} style={{ marginRight: '0.4rem' }} /> {isSubmitting ? 'Summoning…' : 'Finish Attempt'}
        </button>

        <div className="panel-divider" />

        {/* Utility Panel */}
        <p className="panel-heading">Utility</p>
        {quiz.allowed_tools && quiz.allowed_tools.includes("basic_calculator") && (
          <button className="btn-ghost" style={{ width: '100%', marginBottom: '0.5rem', justifyContent: 'flex-start' }} onClick={() => showFlash("No generic calculator provided.", "info")}>
            <Calculator size={16} style={{ marginRight: '0.5rem' }} /> Basic Calculator
          </button>
        )}
        {!quiz.allowed_tools?.includes("basic_calculator") && !quiz.allowed_tools?.includes("sci_calculator") && (
          <button className="btn-ghost" style={{ width: '100%', marginBottom: '0.5rem', justifyContent: 'flex-start' }} onClick={() => showFlash("No calculator allowed for this quiz.", "info")}>
            <Calculator size={16} style={{ marginRight: '0.5rem' }} /> No Calculator
          </button>
        )}
        
        {quiz.allowed_tools && quiz.allowed_tools.includes("sci_calculator") && (
          <button className="btn-ghost" style={{ width: '100%', marginBottom: '0.5rem', justifyContent: 'flex-start' }} onClick={() => setShowCalculator(!showCalculator)}>
            <Calculator size={16} style={{ marginRight: '0.5rem' }} color="var(--accent-gold)" />
            <span style={{ color: 'var(--accent-gold)' }}>{showCalculator ? 'Close Sci Calc' : 'Sci Calculator'}</span>
          </button>
        )}

        {parsedResources.length === 0 && (
          <button className="btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => showFlash("No resources provided for this trial.", "info")}>
            <FileText size={16} style={{ marginRight: '0.5rem' }} /> No Resources
          </button>
        )}
        {parsedResources.length > 0 && (
          <>
            {parsedResources.map((resUrl: string, idx: number) => (
              <a key={idx} href={`/api${resUrl.startsWith('/') ? '' : '/'}${resUrl}`} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
                <FileText size={16} style={{ marginRight: '0.5rem' }} /> Resource {idx + 1}
              </a>
            ))}
          </>
        )}
      </div>

      {/* Scientific Calculator Overlay */}
      {showCalculator && <ScientificCalculator onClose={() => setShowCalculator(false)} />}

      {/* ══════════════════════════════
          CENTRE: Active Question
          ══════════════════════════════ */}
      <div className="quiz-main-content">
        {q && (
          <div className="module-section" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-dark)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 className="text-title" style={{ margin: 0, fontSize: '1.5rem' }}>Question {activeQuestionIndex + 1}</h2>
                <span className="text-desc">Score: {q.marks} {q.negative_marks ? `| Penalty: -${q.negative_marks}` : ''}</span>
              </div>
            </div>

            {!['DRAG_DROP', 'FILL_BLANK'].includes(q.type) && (
              <div className="text-main" style={{ fontSize: '1.2rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                {q.text}
              </div>
            )}

            {q.image_url && (
              <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <img src={`/api${q.image_url.startsWith('/') ? '' : '/'}${q.image_url}`} alt="Reference Context" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '4px', border: '1px solid var(--border-dark)' }} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              {(q.type === 'MCQ' || q.type === 'CHECKBOX') && q.options.map((opt: any) => (
                <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', backgroundColor: answers[q.id]?.selected_options?.includes(opt.id) ? 'rgba(255, 215, 0, 0.1)' : 'var(--bg-deep)', border: `1px solid ${answers[q.id]?.selected_options?.includes(opt.id) ? 'var(--accent-gold)' : 'var(--border-dark)'}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <input 
                    type={q.type === 'MCQ' ? 'radio' : 'checkbox'}
                    name={`q-${q.id}`}
                    checked={answers[q.id]?.selected_options?.includes(opt.id) || false}
                    onChange={() => handleOptionChange(q.id, opt.id, q.type)}
                    style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-gold)', cursor: 'pointer', margin: 0 }}
                  />
                  <span className="text-main" style={{ fontSize: '1.1rem' }}>{opt.text}</span>
                </label>
              ))}

              {q.type === 'DRAG_DROP' && (
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
                  <p className="text-desc" style={{ marginBottom: '1.5rem' }}><ListOrdered size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}/>Drag words from the bank into the corresponding blanks:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ fontSize: '1.2rem', lineHeight: 2 }}>
                      {q.text.split('___').map((part: string, idx: number, arr: string[]) => (
                        <React.Fragment key={idx}>
                          <span>{part}</span>
                          {idx < arr.length - 1 && (
                            <span 
                              onDragOver={(e) => e.preventDefault()} 
                              onDrop={(e) => handleOnDrop(e, idx)}
                              draggable={!!currentDDFills[idx]}
                              onDragStart={(e) => currentDDFills[idx] && handleOnDragStart(e, currentDDFills[idx], idx)}
                              className="dd-slot"
                              style={{ display: 'inline-block', minWidth: '120px', minHeight: '34px', margin: '0 8px', border: `2px dashed ${currentDDFills[idx] ? 'var(--accent-gold)' : 'var(--border-dark)'}`, borderRadius: '4px', verticalAlign: 'middle', textAlign: 'center', backgroundColor: currentDDFills[idx] ? 'rgba(255, 215, 0, 0.1)' : 'transparent', color: 'var(--accent-gold)', fontWeight: 'bold', cursor: currentDDFills[idx] ? 'grab' : 'default', padding: '0 10px' }}
                            >
                              {currentDDFills[idx] || "Drop Here"}
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-dark, var(--bg-surface))', borderRadius: '8px', minHeight: '100px' }}
                         onDragOver={(e) => e.preventDefault()}
                         onDrop={handleBankDrop}>
                      <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem', marginTop: 0 }}>Word Bank</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                        {q.options.map((opt: any, i: number) => {
                          if (currentDDFills.includes(opt.text)) return null;
                          return (
                            <div 
                              key={i} draggable
                              onDragStart={(e) => handleOnDragStart(e, opt.text)}
                              style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--bg-deep)', border: '1px solid var(--accent-gold)', borderRadius: '4px', color: 'var(--text-main)', cursor: 'grab', fontWeight: 'bold' }}
                            >
                              {opt.text}
                            </div>
                          );
                        })}
                      </div>
                      {q.options.filter((opt: any) => !currentDDFills.includes(opt.text)).length === 0 && (
                        <p className="text-desc" style={{ fontStyle: 'italic' }}>All words have been placed.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {q.type === 'FILL_BLANK' && (
                <div style={{ border: '1px solid var(--border-dark)', borderRadius: '6px', padding: '1rem', backgroundColor: 'var(--bg-deep)' }}>
                  <p className="text-desc" style={{ marginBottom: '1rem' }}><Edit3 size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}/>Provide exactly the words to fill in the blanks in sequence:</p>
                  <div style={{ fontSize: '1.2rem', lineHeight: 2, padding: '0.5rem' }}>
                    {(() => {
                       const currentFills = answers[q.id]?.fill_blank_answer || [];
                       return q.text.split('___').map((part: string, idx: number, arr: string[]) => (
                        <React.Fragment key={idx}>
                          <span>{part}</span>
                          {idx < arr.length - 1 && (
                            <input 
                              type="text" className="auth-input" placeholder="Type here..." 
                              style={{ display: 'inline-block', width: '150px', margin: '0 8px', padding: '0.2rem 0.5rem', textAlign: 'center' }}
                              value={currentFills[idx] || ''}
                              onChange={(e) => {
                                const newVals = [...currentFills];
                                newVals[idx] = e.target.value;
                                updateAnswer(q.id, 'fill_blank_answer', newVals);
                              }}
                            />
                          )}
                        </React.Fragment>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {q.type === 'NUMBER' && (
                <div style={{ position: 'relative' }}>
                  <Hash size={24} color="var(--border-dark)" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="number" step="0.001" placeholder="Enter numeric answer..." className="auth-input"
                    value={answers[q.id]?.numeric_answer || ''}
                    onChange={(e) => updateAnswer(q.id, 'numeric_answer', e.target.value === '' ? null : parseFloat(e.target.value))}
                    style={{ width: '100%', fontSize: '1.2rem', paddingLeft: '3rem' }}
                  />
                </div>
              )}

              {(q.type === 'SHORT_TEXT' || q.type === 'ESSAY') && (
                <textarea 
                  placeholder="Draft your response..." className="auth-input"
                  value={answers[q.id]?.text_answer || ''}
                  onChange={(e) => updateAnswer(q.id, 'text_answer', e.target.value)}
                  style={{ width: '100%', flex: 1, minHeight: q.type === 'ESSAY' ? '200px' : '80px', fontSize: '1.1rem', resize: 'vertical' }}
                />
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-dark)', paddingTop: '1.5rem', marginTop: '2rem' }}>
              <button onClick={handlePrev} disabled={activeQuestionIndex === 0} className="btn-ghost" style={{ opacity: activeQuestionIndex === 0 ? 0.3 : 1 }}><ArrowLeft size={20} /> Previous</button>
              {activeQuestionIndex < quiz.questions.length - 1 && (
                <button onClick={handleNext} className="btn-primary" style={{ backgroundColor: 'var(--bg-deep)', color: 'var(--text-main)', border: '1px solid var(--border-dark)' }}>Next <ArrowRight size={20} /></button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════
          RIGHT PANEL: Quiz Navigation
          ══════════════════════════════ */}
      <div className={`quiz-panel-right ${showDrawer ? 'mobile-drawer-open' : 'mobile-drawer-hidden'}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p className="panel-heading" style={{ marginBottom: 0 }}>Quiz Navigation</p>
          <button onClick={() => setShowDrawer(false)} className="close-btn mobile-only" style={{ position: 'static' }}><XCircle size={18}/></button>
        </div>

        {/* Timer */}
        {timeLeft !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', backgroundColor: timeLeft < 60 ? 'rgba(255, 77, 77, 0.1)' : 'var(--bg-deep)', padding: '0.75rem', borderRadius: '4px', border: `1px solid ${timeLeft < 60 ? 'var(--accent-red)' : 'var(--border-dark)'}` }}>
            <TimerIcon size={20} color={timeLeft < 60 ? 'var(--accent-red)' : 'var(--accent-gold)'} />
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: timeLeft < 60 ? 'var(--accent-red)' : 'var(--text-main)', fontFamily: 'monospace' }}>
              {formatTime(timeLeft)}
            </span>
          </div>
        )}

        {/* Question pills grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {quiz.questions.map((qn: any, i: number) => {
            const active = i === activeQuestionIndex;
            const answered = isAnswered(qn.id);
            const flagged = answers[qn.id]?.is_flagged;
            return (
              <button key={qn.id} onClick={() => { saveDraft(true); navigate(`/take-quiz/${id}/q/${i + 1}`); setShowDrawer(false); }}
                style={{ 
                  width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', position: 'relative',
                  borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s',
                  backgroundColor: active ? 'var(--accent-gold)' : (answered ? 'var(--border-dark)' : 'var(--bg-deep)'),
                  color: active ? '#000' : 'var(--text-main)',
                  border: `2px solid ${active ? 'var(--accent-gold)' : 'var(--border-dark)'}`
                }}>
                {i + 1}
                {flagged && <Flag size={12} color="var(--accent-red)" style={{ position: 'absolute', top: '-4px', right: '-4px', fill: 'var(--accent-red)' }}/>}
              </button>
            );
          })}
        </div>

        <div className="panel-divider" />

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: 'var(--accent-gold)', display: 'inline-block' }}></span>
            <span className="text-desc">Active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: 'var(--border-dark)', display: 'inline-block' }}></span>
            <span className="text-desc">Answered</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: 'var(--bg-deep)', border: '2px solid var(--border-dark)', display: 'inline-block' }}></span>
            <span className="text-desc">Unanswered</span>
          </div>
        </div>

        <button onClick={() => saveDraft(false)} className="btn-ghost" style={{ width: '100%' }}>
          <RefreshCcw size={16} /> Save Progress
        </button>

        <div className="mobile-only" style={{ marginTop: '2rem' }}>
          <div className="panel-divider" />
          <p className="panel-heading" style={{ marginBottom: '1rem' }}>Actions</p>
          <button
            onClick={() => { toggleFlag(q.id); setShowDrawer(false); }}
            className={`btn-ghost`}
            style={{ width: '100%', marginBottom: '0.5rem', color: answers[q?.id]?.is_flagged ? 'var(--accent-red)' : 'var(--text-main)', borderColor: answers[q?.id]?.is_flagged ? 'var(--accent-red)' : 'var(--border-dark)', justifyContent: 'center' }}
          >
            <Flag size={16} fill={answers[q?.id]?.is_flagged ? 'var(--accent-red)' : 'none'} style={{ marginRight: '0.4rem' }} />
            {answers[q?.id]?.is_flagged ? 'Unflag' : 'Flag Question'}
          </button>
          <button
            onClick={(e) => { handleSubmit(e); setShowDrawer(false); }}
            disabled={isSubmitting}
            className="btn-solid-gold"
            style={{ width: '100%', justifyContent: 'center', opacity: isSubmitting ? 0.5 : 1 }}
          >
            <Send size={16} style={{ marginRight: '0.4rem' }} /> {isSubmitting ? 'Summoning…' : 'Finish Attempt'}
          </button>

          <div className="panel-divider" style={{ marginTop: '1.5rem' }} />
          <p className="panel-heading" style={{ marginBottom: '1rem' }}>Utility</p>
          {quiz.allowed_tools && quiz.allowed_tools.includes("basic_calculator") && (
            <button className="btn-ghost" style={{ width: '100%', marginBottom: '0.5rem', justifyContent: 'flex-start' }} onClick={() => { showFlash("No generic calculator provided.", "info"); setShowDrawer(false); }}>
              <Calculator size={16} style={{ marginRight: '0.5rem' }} /> Basic Calculator
            </button>
          )}
          {quiz.allowed_tools && quiz.allowed_tools.includes("sci_calculator") && (
            <button className="btn-ghost" style={{ width: '100%', marginBottom: '0.5rem', justifyContent: 'flex-start' }} onClick={() => { setShowCalculator(!showCalculator); setShowDrawer(false); }}>
              <Calculator size={16} style={{ marginRight: '0.5rem' }} color="var(--accent-gold)" />
              <span style={{ color: 'var(--accent-gold)' }}>{showCalculator ? 'Close Sci Calc' : 'Sci Calculator'}</span>
            </button>
          )}
          {parsedResources.map((resUrl: string, idx: number) => (
            <a key={idx} href={`/api${resUrl.startsWith('/') ? '' : '/'}${resUrl}`} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
              <FileText size={16} style={{ marginRight: '0.5rem' }} /> Resource {idx + 1}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TakeQuiz;