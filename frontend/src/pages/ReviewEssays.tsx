import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../api';

const ReviewEssays: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [marks, setMarks] = useState<number>(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    fetchTasks();
  }, [quizId]);

  const fetchTasks = async () => {
    try {
      const res = await api.get(`/quizzes/${quizId}/review-tasks`);
      setTasks(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    try {
      await api.post('/quizzes/review', {
        question_attempt_id: selectedTask.id,
        marks_awarded: marks,
        feedback: feedback
      });
      toast.error("Decree issued! The student has been notified.");
      setSelectedTask(null);
      setFeedback('');
      fetchTasks();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to submit review.");
    }
  };

  if (isLoading) return <div className="page-container text-title">Summoning the trials...</div>;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate(-1)} className="btn-ghost">
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '2.5rem' }}>Manual Review</h1>
      </div>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-dark)', borderRadius: '8px' }}>
          <CheckCircle size={48} color="#4caf50" style={{ marginBottom: '1rem' }} />
          <p className="text-desc">All ravens have been answered. No pending reviews for this trial.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedTask ? '1fr 1fr' : '1fr', gap: '2rem' }}>
          <div className="module-section">
            <h3 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>Pending Answers</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => { setSelectedTask(task); setMarks(task.marks_max); }}
                  className={`item-card column ${selectedTask?.id === task.id ? 'recommended' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className="text-title" style={{ fontSize: '1rem' }}>{task.student_name}</span>
                    <span className="text-stat">Max: {task.marks_max}</span>
                  </div>
                  <p className="text-desc" style={{ fontSize: '0.85rem' }}>Q: {task.question_text}</p>
                </div>
              ))}
            </div>
          </div>

          {selectedTask && (
            <div className="module-section">
              <h3 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>Grade Answer</h3>
              <div style={{ marginBottom: '1.5rem', background: 'var(--bg-deep)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--border-dark)' }}>
                <p className="text-desc" style={{ marginBottom: '0.5rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>Question:</p>
                <p className="text-main" style={{ marginBottom: '1.5rem' }}>{selectedTask.question_text}</p>

                <p className="text-desc" style={{ marginBottom: '0.5rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>Student's Answer:</p>
                <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.95rem' }}>{selectedTask.student_answer}</div>
              </div>

              <form onSubmit={handleReviewSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="text-desc">Marks Awarded (Max {selectedTask.marks_max})</label>
                  <input type="number" step="0.5" max={selectedTask.marks_max} min={0} className="auth-input" value={marks} onChange={(e) => setMarks(parseFloat(e.target.value))} required />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="text-desc">Feedback (Raven's Message)</label>
                  <textarea className="auth-input" style={{ minHeight: '100px' }} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Provide guidance to the scholar..." />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>Submit Grade</button>
                  <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setSelectedTask(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewEssays;
