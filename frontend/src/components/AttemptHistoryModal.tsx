import React, { useState, useEffect } from 'react';
import api from '../api';
import { X, ChevronDown, ChevronUp, Clock, Trophy, CheckCircle, XCircle, AlertCircle, History } from 'lucide-react';

interface QuestionBreakdown {
  question_id: number;
  question_text: string;
  type: string;
  user_answer: string;
  correct_answer: string;
  marks_awarded: number;
  max_marks: number;
  needs_manual_review: boolean;
}

interface AttemptRecord {
  attempt_id: number;
  attempt_number: number;
  score: number;
  max_score: number;
  time_consumed_seconds: number;
  created_at: string;
  questions: QuestionBreakdown[];
}

interface Props {
  quizId: number;
  quizTitle: string;
  onClose: () => void;
}

const AttemptHistoryModal: React.FC<Props> = ({ quizId, quizTitle, onClose }) => {
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    api.get(`/quizzes/${quizId}/my-attempts`)
      .then(res => setAttempts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [quizId]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const pct = (score: number, max: number) =>
    max > 0 ? Math.round((score / max) * 100) : 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '2rem 1rem', overflowY: 'auto'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)', borderRadius: '16px',
          border: '1px solid var(--border-dark)', width: '100%', maxWidth: '820px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6)', overflow: 'hidden'
        }}
      >
        {/* Modal header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-dark)',
          background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, transparent 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <History size={22} color="var(--accent-gold)" />
            <div>
              <h2 className="brand-font" style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '1.3rem' }}>
                Attempt History
              </h2>
              <p className="text-desc" style={{ margin: 0, fontSize: '0.85rem' }}>{quizTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-btn" style={{ position: 'static' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem 2rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <p className="text-desc" style={{ textAlign: 'center', padding: '2rem' }}>
              Consulting the archives...
            </p>
          ) : attempts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <History size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
              <p className="text-desc">No completed attempts found for this quiz.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {attempts.map((attempt) => {
                const percentage = pct(attempt.score, attempt.max_score);
                const passed = percentage >= 50;
                const isExpanded = expandedId === attempt.attempt_id;

                return (
                  <div key={attempt.attempt_id} style={{
                    border: `1px solid ${passed ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)'}`,
                    borderRadius: '10px', overflow: 'hidden', transition: 'all 0.2s'
                  }}>
                    {/* Attempt summary row */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : attempt.attempt_id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '1rem 1.2rem', cursor: 'pointer',
                        background: isExpanded ? 'rgba(255,215,0,0.04)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      {passed
                        ? <CheckCircle size={20} color="#4caf50" style={{ flexShrink: 0 }} />
                        : <XCircle size={20} color="#f44336" style={{ flexShrink: 0 }} />}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span className="brand-font" style={{ color: 'var(--text-main)', fontSize: '1rem' }}>
                            Attempt #{attempt.attempt_number}
                          </span>
                          <span style={{
                            fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px',
                            background: passed ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)',
                            color: passed ? '#4caf50' : '#f44336', fontWeight: 'bold'
                          }}>
                            {percentage}%
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {new Date(attempt.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: passed ? '#4caf50' : '#f44336' }}>
                            {attempt.score} / {attempt.max_score}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem', justifyContent: 'flex-end' }}>
                            <Clock size={12} /> {formatTime(attempt.time_consumed_seconds)}
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={18} color="var(--accent-gold)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                      </div>
                    </div>

                    {/* Question breakdown */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--border-dark)', padding: '1rem 1.2rem', background: 'var(--bg-deep)' }}>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead>
                              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-dark)' }}>
                                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', fontWeight: 600 }}>Question</th>
                                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', fontWeight: 600 }}>Your Answer</th>
                                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', fontWeight: 600 }}>Correct Answer</th>
                                <th style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>Marks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attempt.questions.map((q, i) => {
                                const correct = q.marks_awarded >= q.max_marks;
                                const partial = !correct && q.marks_awarded > 0;
                                const color = correct ? '#4caf50' : partial ? '#ff9800' : '#f44336';
                                return (
                                  <tr key={q.question_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <td style={{ padding: '0.8rem 0.5rem', color: 'var(--text-main)', maxWidth: '220px' }}>
                                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Q{i + 1}.</span>
                                        <span style={{ wordBreak: 'break-word' }}>{q.question_text}</span>
                                      </div>
                                      {q.needs_manual_review && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.3rem' }}>
                                          <AlertCircle size={12} /> Pending Review
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: '0.8rem 0.5rem', color: color, maxWidth: '180px', wordBreak: 'break-word' }}>
                                      {q.user_answer}
                                    </td>
                                    <td style={{ padding: '0.8rem 0.5rem', color: '#4caf50', maxWidth: '180px', wordBreak: 'break-word' }}>
                                      {q.type === 'ESSAY' ? (
                                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                                          {q.correct_answer.slice(0, 80)}{q.correct_answer.length > 80 ? '…' : ''}
                                        </span>
                                      ) : q.correct_answer}
                                    </td>
                                    <td style={{ padding: '0.8rem 0.5rem', textAlign: 'right', fontWeight: 'bold', color, whiteSpace: 'nowrap' }}>
                                      {q.marks_awarded} / {q.max_marks}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttemptHistoryModal;
