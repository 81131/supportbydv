import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Swords, Eye, Clock, FileText, Activity } from 'lucide-react';

const MyQuizzes: React.FC = () => {
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const res = await api.get('/quizzes/me');
                setQuizzes(res.data);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load your scrolls.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchQuizzes();
    }, []);

    if (isLoading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--accent-gold)' }}>Consulting your archives...</div>;

    return (
        <div className="page-container" style={{ padding: '3rem 2rem' }}>
            <h1 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Swords size={32} /> My Forged Trials
            </h1>

            {quizzes.length === 0 ? (
                <div className="module-section" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <p className="text-desc" style={{ fontSize: '1.2rem' }}>You have not forged any trials yet.</p>
                    <button onClick={() => navigate('/quiz-maker')} className="btn-solid-gold" style={{ marginTop: '1rem' }}>Forge One Now</button>
                </div>
            ) : (
                <div className="list-view">
                    {quizzes.map(q => (
                        <div key={q.id} className="item-card row">
                            <div>
                                <h3 className="text-title" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {q.title}
                                    {!q.is_published && <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--bg-card)', border: '1px solid var(--accent-gold)', borderRadius: '12px', color: 'var(--accent-gold)' }}>Draft</span>}
                                </h3>
                                <p className="text-desc" style={{ marginBottom: '1rem' }}>{q.description}</p>
                                <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><FileText size={16} /> {q.question_count} Questions</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Activity size={16} /> {q.attempt_count} Attempts</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={16} /> {new Date(q.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <button onClick={() => navigate(`/edit-quiz/${q.id}`)} className="btn-secondary">Edit</button>
                                <button onClick={() => navigate(`/review-essays/${q.id}`)} className="btn-solid-gold" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <Eye size={18} /> Review Submissions
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyQuizzes;
