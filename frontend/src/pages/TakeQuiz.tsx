import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Timer as TimerIcon, CheckCircle, XCircle, Send, RefreshCcw, AlertCircle, ArrowLeft } from 'lucide-react';

const TakeQuiz: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null); 
  const [startTime] = useState<number>(Date.now()); 

  // 1. Fetch the safe quiz
  useEffect(() => {
    api.get(`/quizzes/${id}/take`)
      .then(res => {
        setQuiz(res.data);
        if (res.data.is_timed && res.data.time_limit_minutes) {
          setTimeLeft(res.data.time_limit_minutes * 60); // Convert to seconds
        }
      })
      .catch(err => {
        console.error("Failed to fetch quiz", err);
        alert("The scroll could not be retrieved.");
      });
  }, [id]);

  // 2. Timer Logic
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || results) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev && prev <= 1) {
          clearInterval(timer);
          handleSubmit(); // Auto-submit when time is up
          return 0;
        }
        return prev ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, results]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 3. Handle Input Changes
  const handleOptionChange = (qId: number, optId: number, type: string) => {
    setAnswers(prev => {
      if (type === 'MCQ') return { ...prev, [qId]: { selected_options: [optId] } };
      
      const currentSelections = prev[qId]?.selected_options || [];
      const newSelections = currentSelections.includes(optId)
        ? currentSelections.filter((id: number) => id !== optId)
        : [...currentSelections, optId];
        
      return { ...prev, [qId]: { selected_options: newSelections } };
    });
  };

  const handleTextChange = (qId: number, text: string) => {
    setAnswers(prev => ({ ...prev, [qId]: { text_answer: text } }));
  };

  const handleNumberChange = (qId: number, num: number) => {
    setAnswers(prev => ({ ...prev, [qId]: { numeric_answer: num } }));
  };

  // 4. Submit to Backend Grading Engine
const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (results) return; 
    setIsSubmitting(true);

    const timeConsumedSeconds = Math.floor((Date.now() - startTime) / 1000); // 👈 Calculate elapsed time

    const formattedAnswers = Object.keys(answers).map(qId => ({
      question_id: parseInt(qId),
      ...answers[parseInt(qId)]
    }));

    try {
      // 👈 Add timeConsumedSeconds to payload
      const res = await api.post(`/quizzes/${id}/submit`, { 
        answers: formattedAnswers,
        time_consumed_seconds: timeConsumedSeconds 
      });
      setResults(res.data);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Submission failed", error);
      alert("Failed to submit the scroll. Check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  
  const handleRetry = () => {
    setResults(null);
    setAnswers({});
    if (quiz?.is_timed) setTimeLeft(quiz.time_limit_minutes * 60);
    window.scrollTo(0, 0);
  };

  if (!quiz) return <div style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--accent-gold)' }}>Unrolling the scroll...</div>;

  // --- VIEW 1: RESULTS & REVIEW MODE ---
  if (results) {
    const percentage = ((results.score / results.max_score) * 100).toFixed(1);
    const passed = results.score >= (results.max_score / 2);

    return (
      <div style={{ padding: '3rem 1rem', maxWidth: '800px', margin: '0 auto', color: 'var(--text-main)' }}>
        <div style={{ backgroundColor: 'var(--bg-deep)', padding: '3rem', borderRadius: '8px', border: `2px solid ${passed ? '#4caf50' : '#ff4d4d'}`, textAlign: 'center', marginBottom: '3rem' }}>
          {passed ? <CheckCircle size={64} color="#4caf50" style={{ margin: '0 auto 1rem' }}/> : <XCircle size={64} color="#ff4d4d" style={{ margin: '0 auto 1rem' }}/>}
          <h1 className="brand-font" style={{ color: 'var(--accent-gold)', margin: '0 0 1rem 0' }}>Trial Complete</h1>
          <h2 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', color: passed ? '#4caf50' : '#ff4d4d' }}>{results.score} / {results.max_score}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Accuracy: {percentage}%</p>
        </div>

        <h3 className="brand-font" style={{ color: 'var(--accent-gold)', borderBottom: '1px solid var(--border-dark)', paddingBottom: '0.5rem', marginBottom: '2rem' }}>Performance Review</h3>
        
        {results.review.map((rev: any, i: number) => (
          <div key={i} style={{ backgroundColor: 'var(--bg-deep)', padding: '2rem', borderRadius: '8px', borderLeft: `4px solid ${rev.is_correct ? '#4caf50' : (rev.type === 'ESSAY' ? 'var(--accent-gold)' : '#ff4d4d')}`, marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 'bold' }}>Q{i + 1}: {rev.question_text}</p>
            
            <div style={{ display: 'grid', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '4px' }}>
              <p style={{ margin: 0 }}><strong>Your Answer:</strong> <span style={{ color: rev.is_correct ? '#4caf50' : 'var(--text-main)' }}>{rev.user_answer}</span></p>
              {(!rev.is_correct && rev.type !== 'ESSAY') && (
                <p style={{ margin: 0, color: '#4caf50' }}><strong>Correct Answer:</strong> {rev.correct_answer}</p>
              )}
              {rev.type === 'ESSAY' && (
                <p style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><AlertCircle size={16}/> Pending Maester Review</p>
              )}
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-dark)', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Marks Awarded: <span style={{ color: rev.marks_awarded > 0 ? '#4caf50' : (rev.marks_awarded < 0 ? '#ff4d4d' : 'var(--text-muted)')}}>{rev.marks_awarded}</span> / {rev.max_marks}
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '3rem' }}>
          <button onClick={() => navigate(-1)} style={{ padding: '1rem 2rem', background: 'transparent', border: '1px solid var(--border-dark)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowLeft size={20} /> Return to Archives
          </button>
          <button onClick={handleRetry} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCcw size={20} /> Retry Trial
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW 2: TAKING THE QUIZ ---
  return (
    <div style={{ padding: '3rem 1rem', maxWidth: '850px', margin: '0 auto', color: 'var(--text-main)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', backgroundColor: 'var(--bg-deep)', padding: '1.5rem 2rem', borderRadius: '8px', borderBottom: '2px solid var(--accent-gold)' }}>
        <div>
          <h1 className="brand-font" style={{ color: 'var(--accent-gold)', margin: '0 0 0.5rem 0' }}>{quiz.title}</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>{quiz.description}</p>
        </div>
        
        {timeLeft !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: timeLeft < 60 ? '#ff4d4d20' : 'rgba(0,0,0,0.5)', padding: '1rem 1.5rem', borderRadius: '6px', border: `1px solid ${timeLeft < 60 ? '#ff4d4d' : 'var(--border-dark)'}` }}>
            <TimerIcon size={28} color={timeLeft < 60 ? '#ff4d4d' : 'var(--accent-gold)'} />
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: timeLeft < 60 ? '#ff4d4d' : 'var(--text-main)', fontFamily: 'monospace' }}>
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {quiz.questions.map((q: any, i: number) => (
          <div key={q.id} style={{ backgroundColor: 'var(--bg-deep)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border-dark)', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', lineHeight: '1.5' }}>
                <span style={{ color: 'var(--accent-gold)', marginRight: '0.5rem' }}>{i + 1}.</span> 
                {q.text}
              </h3>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', whiteSpace: 'nowrap', marginLeft: '1rem' }}>[{q.marks} Marks]</span>
            </div>

            {q.image_url && (
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <img src={`http://localhost:8000${q.image_url}`} alt="Reference" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '4px', border: '1px solid var(--border-dark)' }} />
              </div>
            )}

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {(q.type === 'MCQ' || q.type === 'CHECKBOX') && q.options.map((opt: any) => (
                <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-dark)', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <input 
                    type={q.type === 'MCQ' ? 'radio' : 'checkbox'}
                    name={`q-${q.id}`}
                    checked={answers[q.id]?.selected_options?.includes(opt.id) || false}
                    onChange={() => handleOptionChange(q.id, opt.id, q.type)}
                    style={{ transform: 'scale(1.5)', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '1.1rem' }}>{opt.text}</span>
                </label>
              ))}

              {q.type === 'NUMBER' && (
                <input 
                  type="number" step="0.001" placeholder="Enter numeric answer..." required
                  onChange={(e) => handleNumberChange(q.id, parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', border: '1px solid var(--border-dark)', borderRadius: '6px', fontSize: '1.1rem', outline: 'none' }}
                />
              )}

              {(q.type === 'SHORT_TEXT' || q.type === 'ESSAY') && (
                <textarea 
                  placeholder="Draft your response..." required
                  onChange={(e) => handleTextChange(q.id, e.target.value)}
                  style={{ width: '100%', padding: '1rem', minHeight: q.type === 'ESSAY' ? '150px' : '60px', backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', border: '1px solid var(--border-dark)', borderRadius: '6px', fontSize: '1.1rem', outline: 'none', resize: 'vertical' }}
                />
              )}
            </div>
          </div>
        ))}

        <div style={{ position: 'sticky', bottom: '2rem', textAlign: 'center', marginTop: '3rem' }}>
          <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ padding: '1.2rem 3rem', fontSize: '1.3rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', opacity: isSubmitting ? 0.7 : 1 }}>
            <Send size={24} /> {isSubmitting ? 'Submitting to Maesters...' : 'Submit Trial'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TakeQuiz;