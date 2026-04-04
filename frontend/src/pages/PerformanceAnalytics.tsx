import { useState, useEffect } from 'react';
import api from '../api';
import { Trophy, Clock, CalendarDays, Activity, ChevronDown, ChevronUp } from 'lucide-react';

interface QuestionStat {
    question_id: number;
    marks_awarded: number;
    time_spent_seconds: number;
    peer_avg_time_seconds: number;
}

interface AttemptAnalytics {
    attempt_id: number;
    quiz_id: number;
    quiz_title: string;
    my_score: number;
    my_time_seconds: number;
    peer_avg_score: number;
    peer_avg_time_seconds: number;
    attempt_date: string;
    detailed_questions: QuestionStat[];
}

const PerformanceAnalytics = () => {
    const [analytics, setAnalytics] = useState<AttemptAnalytics[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedAttemptId, setExpandedAttemptId] = useState<number | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/quizzes/analytics/me');
                setAnalytics(res.data.analytics);
            } catch (err) {
                console.error("Failed to fetch analytics:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const toggleExpand = (id: number) => {
        if (expandedAttemptId === id) setExpandedAttemptId(null);
        else setExpandedAttemptId(id);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}m ${s}s`;
    };

    if (loading) return <div className="loading-state brand-font">Mapping the archives...</div>;

    if (analytics.length === 0) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <h1 className="brand-font" style={{ color: 'var(--accent-gold)' }}>Performance Matrices</h1>
                <p className="text-desc">You have no completed attempts to analyze. Return after forging your skills.</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <h1 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '2rem', textAlign: 'center' }}>
                <Activity size={32} style={{ display: 'inline', marginRight: '1rem', verticalAlign: 'middle' }}/>
                Performance Matrices
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
                {analytics.map((attempt) => (
                    <div key={attempt.attempt_id} className="module-card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleExpand(attempt.attempt_id)}>
                            <div>
                                <h3 className="brand-font" style={{ color: 'var(--text-main)', fontSize: '1.4rem' }}>{attempt.quiz_title}</h3>
                                <p className="text-desc" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                                    <CalendarDays size={14}/> {new Date(attempt.attempt_date).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                {expandedAttemptId === attempt.attempt_id ? <ChevronUp color="var(--accent-gold)"/> : <ChevronDown color="var(--accent-gold)"/>}
                            </div>
                        </div>

                        {/* Top Line Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                            <div className="stat-block" style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Trophy size={18} color="var(--accent-gold)" />
                                    <span style={{ color: 'var(--text-muted)' }}>Score</span>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{attempt.my_score}</div>
                                <div style={{ fontSize: '0.85rem', color: attempt.my_score >= attempt.peer_avg_score ? '#4caf50' : '#f44336' }}>
                                    Peer Avg: {attempt.peer_avg_score}
                                </div>
                            </div>
                            
                            <div className="stat-block" style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Clock size={18} color="var(--accent-gold)" />
                                    <span style={{ color: 'var(--text-muted)' }}>Total Time</span>
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{formatTime(attempt.my_time_seconds)}</div>
                                <div style={{ fontSize: '0.85rem', color: attempt.my_time_seconds <= attempt.peer_avg_time_seconds ? '#4caf50' : '#f44336' }}>
                                    Peer Avg: {formatTime(attempt.peer_avg_time_seconds)}
                                </div>
                            </div>
                        </div>

                        {/* Expandable Question Breakdown */}
                        {expandedAttemptId === attempt.attempt_id && (
                            <div style={{ marginTop: '2rem', borderTop: '1px dashed var(--border-color)', paddingTop: '1.5rem' }}>
                                <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Granular Question Analysis</h4>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                            <th style={{ padding: '0.5rem' }}>Question (ID)</th>
                                            <th style={{ padding: '0.5rem' }}>Marks</th>
                                            <th style={{ padding: '0.5rem' }}>Your Time</th>
                                            <th style={{ padding: '0.5rem' }}>Peer Avg Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attempt.detailed_questions.map((q) => (
                                            <tr key={q.question_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '0.8rem 0.5rem', color: 'var(--text-main)' }}>#{q.question_id}</td>
                                                <td style={{ padding: '0.8rem 0.5rem', color: q.marks_awarded > 0 ? '#4caf50' : '#f44336' }}>{q.marks_awarded}</td>
                                                <td style={{ padding: '0.8rem 0.5rem', color: 'var(--text-main)' }}>{q.time_spent_seconds}s</td>
                                                <td style={{ padding: '0.8rem 0.5rem', color: 'var(--text-muted)' }}>{q.peer_avg_time_seconds}s</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </div>
                ))}
            </div>
        </div>
    );
};

export default PerformanceAnalytics;
