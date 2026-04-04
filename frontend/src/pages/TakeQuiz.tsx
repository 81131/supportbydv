import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Timer as TimerIcon, CheckCircle, XCircle, Send, RefreshCcw, AlertCircle, ArrowLeft, ArrowRight, Flag, Calculator, Hash, LayoutGrid, ListOrdered, FileText, CheckSquare, Edit3 } from 'lucide-react';
import ScientificCalculator from '../components/ScientificCalculator';

const TakeQuiz: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null); 
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isConsentAgreed, setIsConsentAgreed] = useState(false);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [flash, setFlash] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showFlash = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setFlash({ message, type });
    setTimeout(() => setFlash(null), 3000);
  };

  useEffect(() => {
    api.get(`/quizzes/${id}/take`)
      .then(res => {
        setQuiz(res.data);
        if (res.data.is_timed && res.data.time_limit_minutes) {
          const remaining = res.data.time_limit_minutes * 60 - res.data.time_consumed;
          setTimeLeft(remaining > 0 ? remaining : 0); 
        }
        if (res.data.draft) {
          const loadedAnswers: Record<number, any> = {};
          for (const [qId, data] of Object.entries(res.data.draft)) {
            loadedAnswers[Number(qId)] = {
               text_answer: (data as any).parsed?.text_answer || '',
               numeric_answer: (data as any).parsed?.numeric_answer || null,
               selected_options: (data as any).parsed?.selected_options || [],
               drag_drop_answer: (data as any).parsed?.drag_drop_answer || [],
               fill_blank_answer: (data as any).parsed?.fill_blank_answer || [],
               is_flagged: (data as any).is_flagged || false,
               time_spent_seconds: (data as any).parsed?.time_spent_seconds || 0
            };
          }
          setAnswers(loadedAnswers);
        }
        
        if (!res.data.consent_text) {
           setIsConsentAgreed(true);
           setStartTime(Date.now());
        }
      })
      .catch(err => {
        console.error("Failed to fetch quiz", err);
        showFlash("The scroll could not be retrieved.", "error");
        setTimeout(() => navigate(-1), 3000);
      });
  }, [id]);

  useEffect(() => {
    if (!isConsentAgreed || timeLeft === null || timeLeft <= 0 || results) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev && prev <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return prev ? prev - 1 : 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, results, isConsentAgreed]);

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

  const saveDraft = async () => {
    if (results || !quiz || !startTime) return;
    const timeConsumedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const formattedAnswers = Object.keys(answers).map(qId => ({
      question_id: parseInt(qId),
      ...answers[parseInt(qId)]
    }));
    try {
      await api.post(`/quizzes/${id}/submit`, { answers: formattedAnswers, time_consumed_seconds: timeConsumedSeconds, is_draft: true });
    } catch(err) { console.error("Draft fail", err); }
  };

  const handleNext = () => {
    saveDraft();
    if (activeQuestionIndex < quiz.questions.length - 1) setActiveQuestionIndex(activeQuestionIndex + 1);
  };
  const handlePrev = () => {
    saveDraft();
    if (activeQuestionIndex > 0) setActiveQuestionIndex(activeQuestionIndex - 1);
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
      if (!window.confirm(confirmMsg)) return;
    }

    setIsSubmitting(true);
    const timeConsumedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const formattedAnswers = Object.keys(answers).map(qId => ({
      question_id: parseInt(qId),
      ...answers[parseInt(qId)]
    }));

    try {
      const res = await api.post(`/quizzes/${id}/submit`, { 
        answers: formattedAnswers,
        time_consumed_seconds: timeConsumedSeconds,
        is_draft: false
      });
      setResults(res.data);
      window.scrollTo(0, 0);
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
             <button className="btn-solid-gold" style={{ fontSize: '1.2rem', padding: '1rem 3rem' }} onClick={() => { setIsConsentAgreed(true); setStartTime(Date.now()); }}>
                 <CheckSquare size={20} style={{ marginRight: '0.8rem' }} /> I Agree, Begin Scroll
             </button>
         </div>
      </div>
    );
  }

  if (results) {
    const percentage = ((results.score / results.max_score) * 100).toFixed(1);
    const passed = results.score >= (results.max_score / 2);

    return (
      <div className="page-container">
        <div className="module-section" style={{ border: `2px solid ${passed ? '#4caf50' : 'var(--accent-red)'}`, textAlign: 'center', marginBottom: '3rem' }}>
          {passed ? <CheckCircle size={64} color="#4caf50" style={{ margin: '0 auto 1rem' }}/> : <XCircle size={64} color="var(--accent-red)" style={{ margin: '0 auto 1rem' }}/>}
          <h1 className="brand-font" style={{ color: 'var(--accent-gold)', margin: '0 0 1rem 0' }}>Trial Complete</h1>
          <h2 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', color: passed ? '#4caf50' : 'var(--accent-red)' }}>{results.score} / {results.max_score}</h2>
          <p className="text-desc" style={{ fontSize: '1.2rem' }}>Accuracy: {percentage}%</p>
        </div>

        <h3 className="brand-font" style={{ color: 'var(--accent-gold)', borderBottom: '1px solid var(--border-dark)', paddingBottom: '0.5rem', marginBottom: '2rem' }}>Performance Review</h3>
        
        {results.review.map((rev: any, i: number) => (
          <div key={i} className="module-section" style={{ borderLeft: `4px solid ${rev.is_correct ? '#4caf50' : (rev.type === 'ESSAY' || rev.type === 'DRAG_DROP' ? 'var(--accent-gold)' : 'var(--accent-red)')}`, marginBottom: '1.5rem', padding: '1.5rem' }}>
            <p className="text-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Q{i + 1}: {rev.question_text}</p>
            <div style={{ display: 'grid', gap: '0.5rem', backgroundColor: 'var(--bg-deep)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-dark)' }}>
              <p className="text-desc" style={{ margin: 0 }}><strong>Your Answer:</strong> <span style={{ color: rev.is_correct ? '#4caf50' : 'var(--text-main)' }}>{rev.user_answer}</span></p>
              {(!rev.is_correct && rev.type !== 'ESSAY') && (
                <p className="text-desc" style={{ margin: 0, color: '#4caf50' }}><strong>Correct Answer:</strong> {rev.correct_answer}</p>
              )}
              {rev.type === 'ESSAY' && (
                <p className="text-desc" style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><AlertCircle size={16}/> Pending Maester Review</p>
              )}
              <div className="text-desc" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-dark)', textAlign: 'right', fontSize: '0.9rem' }}>
                Marks Awarded: <span style={{ fontWeight: 'bold', color: rev.marks_awarded > 0 ? '#4caf50' : (rev.marks_awarded < 0 ? 'var(--accent-red)' : 'var(--text-muted)')}}>{rev.marks_awarded}</span> / {rev.max_marks}
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '3rem' }}>
          <button onClick={() => navigate(-1)} className="btn-ghost">
            <ArrowLeft size={20} /> Return to Archives
          </button>
        </div>
      </div>
    );
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
        <button className="btn-ghost" style={{ width: '100%', marginBottom: '0.5rem', justifyContent: 'flex-start' }} onClick={() => showFlash("No generic calculator provided.", "info")}>
          <Calculator size={16} style={{ marginRight: '0.5rem' }} /> Basic Calculator
        </button>
        
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
              <a key={idx} href={`http://localhost:8000/${resUrl}`} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>
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

            <div className="text-main" style={{ fontSize: '1.2rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              {q.text}
            </div>

            {q.image_url && (
              <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <img src={`http://localhost:8000${q.image_url}`} alt="Reference Context" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '4px', border: '1px solid var(--border-dark)' }} />
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {q.options.map((_: any, bIdx: number) => {
                      const currentFills = answers[q.id]?.fill_blank_answer || [];
                      return (
                        <div key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--accent-gold)' }}>Blank {bIdx + 1}:</span>
                          <input 
                            type="text" className="auth-input" placeholder="Enter word/phrase..." 
                            style={{ margin: 0, flex: 1 }} value={currentFills[bIdx] || ''}
                            onChange={(e) => {
                              const newVals = [...currentFills];
                              newVals[bIdx] = e.target.value;
                              updateAnswer(q.id, 'fill_blank_answer', newVals);
                            }}
                          />
                        </div>
                      );
                    })}
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
              <button key={qn.id} onClick={() => { saveDraft(); setActiveQuestionIndex(i); setShowDrawer(false); }}
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

        <button onClick={() => saveDraft().then(() => showFlash("Draft saved to the archives!", "success"))} className="btn-ghost" style={{ width: '100%' }}>
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
        </div>
      </div>
    </div>
  );
};

export default TakeQuiz;