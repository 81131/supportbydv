import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import {
  CheckCircle, XCircle, AlertCircle, ArrowLeft, Clock,
  Sparkles, Loader2, BookOpen, RotateCcw
} from 'lucide-react';

const AttemptReview: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [regradingId, setRegradingId] = useState<number | null>(null);
  const [regradeMsg, setRegradeMsg] = useState('');

  const fetchData = () => {
    setLoading(true);
    api.get(`/quizzes/attempts/${attemptId}`)
      .then(res => { setData(res.data); setError(''); })
      .catch(() => setError('This scroll could not be retrieved. It may not belong to you.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [attemptId]);

  const handleAiRegrade = async () => {
    if (!data) return;
    setRegradingId(data.attempt_id);
    setRegradeMsg('');
    try {
      const res = await api.post(`/quizzes/attempts/${data.attempt_id}/ai-regrade`);
      setRegradeMsg(res.data.message + (res.data.regraded > 0 ? ` New total: ${res.data.new_total_marks?.toFixed(1)} marks.` : ''));
      if (res.data.regraded > 0) fetchData();
    } catch (err: any) {
      setRegradeMsg(err?.response?.data?.detail || 'AI grading failed. Check your API key in Settings.');
    } finally {
      setRegradingId(null);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  if (loading) return (
    <div className="page-container" style={{ textAlign: 'center', marginTop: '6rem', color: 'var(--accent-gold)' }}>
      <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
      <p>Unrolling the scroll…</p>
    </div>
  );

  if (error) return (
    <div className="page-container" style={{ textAlign: 'center', marginTop: '6rem' }}>
      <AlertCircle size={48} color="var(--accent-red)" style={{ margin: '0 auto 1rem' }} />
      <p className="text-desc">{error}</p>
      <button className="btn-ghost" style={{ marginTop: '1.5rem' }} onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Go Back
      </button>
    </div>
  );

  if (!data) return null;

  const pct = data.max_score > 0 ? ((data.total_marks / data.max_score) * 100).toFixed(1) : '0.0';
  const passed = data.total_marks >= data.max_score / 2;
  const hasPendingEssays = data.review.some((r: any) => r.needs_manual_review);

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>

      {/* ── Header ────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn-ghost" onClick={() => navigate(-1)} style={{ flexShrink: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="brand-font" style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '1.6rem' }}>
            {data.quiz_title}
          </h1>
          <p className="text-desc" style={{ margin: 0 }}>
            Attempt #{data.attempt_number} · <Clock size={12} style={{ verticalAlign: 'middle' }} /> {formatTime(data.time_consumed_seconds)}
          </p>
        </div>
      </div>

      {/* ── Score Card ────────────────────────────── */}
      <div className="module-section" style={{
        border: `2px solid ${passed ? '#4caf50' : 'var(--accent-red)'}`,
        textAlign: 'center', marginBottom: '2rem', padding: '2rem'
      }}>
        {passed
          ? <CheckCircle size={52} color="#4caf50" style={{ margin: '0 auto 0.75rem' }} />
          : <XCircle size={52} color="var(--accent-red)" style={{ margin: '0 auto 0.75rem' }} />}
        <h2 style={{ fontSize: '2.8rem', margin: '0 0 0.25rem', color: passed ? '#4caf50' : 'var(--accent-red)' }}>
          {data.total_marks} / {data.max_score}
        </h2>
        <p className="text-desc" style={{ fontSize: '1.1rem', margin: 0 }}>Accuracy: {pct}%</p>

        {/* AI Re-grade button */}
        {hasPendingEssays && (
          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={handleAiRegrade}
              disabled={regradingId !== null}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.5)',
                color: 'var(--accent-gold)', borderRadius: '10px',
                padding: '0.6rem 1.4rem', fontSize: '0.95rem',
                cursor: regradingId !== null ? 'wait' : 'pointer',
                opacity: regradingId !== null ? 0.6 : 1, transition: 'all 0.2s'
              }}
            >
              {regradingId !== null
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Grading essays…</>
                : <><Sparkles size={16} /> Re-evaluate essays with AI</>}
            </button>
            {regradeMsg && (
              <p style={{ marginTop: '0.75rem', color: 'var(--accent-gold)', fontSize: '0.85rem' }}>
                {regradeMsg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Question Breakdown ────────────────────── */}
      <h3 className="brand-font" style={{
        color: 'var(--accent-gold)', borderBottom: '1px solid var(--border-dark)',
        paddingBottom: '0.5rem', marginBottom: '1.5rem'
      }}>
        <BookOpen size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
        Performance Review
      </h3>

      {data.review.map((rev: any, i: number) => {
        const borderColor = rev.needs_manual_review
          ? 'var(--accent-gold)'
          : rev.is_correct ? '#4caf50' : 'var(--accent-red)';

        return (
          <div
            key={rev.question_id}
            className="module-section"
            style={{ borderLeft: `4px solid ${borderColor}`, marginBottom: '1.5rem', padding: '1.5rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <p className="text-title" style={{ fontSize: '1.05rem', margin: 0, flex: 1 }}>
                Q{i + 1}: {rev.question_text}
              </p>
              <span style={{
                flexShrink: 0, fontSize: '0.85rem', fontWeight: 'bold',
                color: rev.marks_awarded > 0 ? '#4caf50' : rev.needs_manual_review ? 'var(--accent-gold)' : 'var(--text-muted)'
              }}>
                {rev.marks_awarded} / {rev.marks}
              </span>
            </div>

            {rev.image_url && (
              <div style={{ margin: '1rem 0' }}>
                <img
                  src={`/api${rev.image_url.startsWith('/') ? '' : '/'}${rev.image_url}`}
                  alt="Question"
                  style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '6px', border: '1px solid var(--border-dark)' }}
                />
              </div>
            )}

            <div style={{
              marginTop: '1rem', backgroundColor: 'var(--bg-deep)',
              padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-dark)',
              display: 'grid', gap: '0.6rem'
            }}>
              <p className="text-desc" style={{ margin: 0 }}>
                <strong>Your Answer:</strong>{' '}
                <span style={{ color: rev.is_correct ? '#4caf50' : 'var(--text-main)' }}>
                  {rev.user_answer}
                </span>
              </p>

              {rev.type === 'ESSAY' ? (
                rev.needs_manual_review ? (
                  <p className="text-desc" style={{ margin: 0, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={15} /> Pending Maester Review — use the button above to trigger AI grading.
                  </p>
                ) : (
                  <p className="text-desc" style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <strong>Rubric:</strong> {rev.correct_answer}
                  </p>
                )
              ) : (
                !rev.is_correct && (
                  <p className="text-desc" style={{ margin: 0, color: '#4caf50' }}>
                    <strong>Correct Answer:</strong> {rev.correct_answer}
                  </p>
                )
              )}
            </div>
          </div>
        );
      })}

      {/* ── Footer Actions ────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '3rem', flexWrap: 'wrap' }}>
        <button className="btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Go Back
        </button>
        <Link to={`/take-quiz/${data.quiz_id}`} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RotateCcw size={18} /> Retry Quiz
        </Link>
        <Link to="/analytics" className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={18} /> View Analytics
        </Link>
      </div>
    </div>
  );
};

export default AttemptReview;
