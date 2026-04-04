import { useState, useEffect } from 'react';
import api from '../api';
import { Trophy, Clock, CalendarDays, Activity, ChevronDown, ChevronUp, Flame, Users } from 'lucide-react';
import { LineChart, Line, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ZAxis } from 'recharts';

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
    my_max_score: number;
    my_time_seconds: number;
    peer_avg_score: number;
    peer_avg_time_seconds: number;
    attempt_date: string;
    detailed_questions: QuestionStat[];
}

interface KPIs {
    total_accuracy_percentage: number;
    avg_speed_per_question_seconds: number;
    peer_percentile: number;
    consistency_streak_days: number;
}

interface RadarStat {
    subject: string;
    score: number;
}

interface DashboardData {
    kpis: KPIs;
    radar_stats_module: RadarStat[];
    radar_stats_topic: RadarStat[];
    analytics: AttemptAnalytics[];
}

const PerformanceAnalytics = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedAttemptId, setExpandedAttemptId] = useState<number | null>(null);
    const [radarView, setRadarView] = useState<'module' | 'topic'>('module');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/quizzes/analytics/me');
                setData(res.data);
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

    if (!data || data.analytics.length === 0) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <h1 className="brand-font" style={{ color: 'var(--accent-gold)' }}>Performance Matrices</h1>
                <p className="text-desc">You have no completed attempts to analyze. Return after forging your skills.</p>
            </div>
        );
    }

    const { kpis, radar_stats_module, radar_stats_topic, analytics } = data;

    // Derived Chart Data
    const progressData = analytics.map((a, i) => ({
        name: `Trial ${i + 1}`,
        myScore: (a.my_score / (a.my_max_score || 1)) * 100 || 0,
        peerAvg: (a.peer_avg_score / (a.my_max_score || 1)) * 100 || 0,
    }));

    const efficiencyData = analytics.map(a => ({
        time: a.my_time_seconds,
        accuracy: (a.my_score / (a.my_max_score || 1)) * 100 || 0,
        name: a.quiz_title
    }));

    const activeRadarData = radarView === 'module' ? radar_stats_module : radar_stats_topic;

    return (
        <div className="page-container" style={{ paddingBottom: '4rem' }}>
            <h1 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '2rem', textAlign: 'center', fontSize: '2.5rem' }}>
                <Activity size={40} style={{ display: 'inline', marginRight: '1rem', verticalAlign: 'middle' }}/>
                Performance Matrices
            </h1>

            {/* LAYER 1: KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="module-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <Trophy size={32} color="var(--accent-gold)" style={{ margin: '0 auto 0.5rem auto' }} />
                    <h3 className="brand-font" style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Overall Accuracy</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '0.5rem' }}>
                        {kpis.total_accuracy_percentage.toFixed(1)}%
                    </div>
                </div>
                
                <div className="module-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <Clock size={32} color="var(--accent-gold)" style={{ margin: '0 auto 0.5rem auto' }} />
                    <h3 className="brand-font" style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Avg Speed / Q</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '0.5rem' }}>
                        {kpis.avg_speed_per_question_seconds.toFixed(0)}s
                    </div>
                </div>

                <div className="module-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <Users size={32} color="var(--accent-gold)" style={{ margin: '0 auto 0.5rem auto' }} />
                    <h3 className="brand-font" style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Peer Percentile</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '0.5rem' }}>
                        Top {100 - kpis.peer_percentile}%
                    </div>
                </div>

                <div className="module-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <Flame size={32} color="#ff6b6b" style={{ margin: '0 auto 0.5rem auto' }} />
                    <h3 className="brand-font" style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Consistency Streak</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '0.5rem' }}>
                        {kpis.consistency_streak_days} Days
                    </div>
                </div>
            </div>

            {/* LAYER 2: VISUAL INSIGHTS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem', marginBottom: '3rem' }}>
                
                <div className="module-card" style={{ padding: '1.5rem', height: '400px' }}>
                    <h3 className="brand-font" style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>Progress Tracker</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={progressData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" />
                            <YAxis stroke="var(--text-muted)" domain={[0, 100]} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }} />
                            <Legend />
                            <Line type="monotone" name="My Score %" dataKey="myScore" stroke="var(--accent-gold)" strokeWidth={3} dot={{ r: 5 }} />
                            <Line type="monotone" name="Peer Avg %" dataKey="peerAvg" stroke="#8884d8" strokeWidth={2} strokeDasharray="5 5" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="module-card" style={{ padding: '1.5rem', height: '400px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 className="brand-font" style={{ color: 'var(--accent-gold)' }}>Skill Radar</h3>
                        <select 
                            className="auth-input" 
                            style={{ padding: '0.2rem 0.5rem', width: 'auto', fontSize: '0.85rem' }}
                            value={radarView} 
                            onChange={(e) => setRadarView(e.target.value as 'module' | 'topic')}
                        >
                            <option value="module">By Module</option>
                            <option value="topic">By Topic</option>
                        </select>
                    </div>
                    {activeRadarData.length > 2 ? (
                        <ResponsiveContainer width="100%" height="90%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={activeRadarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.2)" />
                                <Radar name="My Mastery" dataKey="score" stroke="var(--accent-gold)" fill="var(--accent-gold)" fillOpacity={0.4} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            <p>Need at least 3 data points to generate radar.</p>
                        </div>
                    )}
                </div>

                <div className="module-card" style={{ padding: '1.5rem', height: '400px', gridColumn: '1 / -1' }}>
                    <h3 className="brand-font" style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>Efficiency Matrix <span className="text-desc" style={{fontSize: '0.8rem', marginLeft: '1rem'}}>(Accuracy vs Speed)</span></h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis type="number" dataKey="time" name="Time (s)" stroke="var(--text-muted)" />
                            <YAxis type="number" dataKey="accuracy" name="Accuracy (%)" domain={[0, 100]} stroke="var(--text-muted)" />
                            <ZAxis type="category" dataKey="name" name="Scroll" />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }} />
                            <Scatter name="Attempts" data={efficiencyData} fill="var(--accent-gold)" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* LAYER 3: DETAILED LEDGER */}
            <h2 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem', textAlign: 'center' }}>Detailed Ledger</h2>
            
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

                        {expandedAttemptId === attempt.attempt_id && (
                            <div style={{ marginTop: '2rem', borderTop: '1px dashed var(--border-color)', paddingTop: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                    <div className="stat-block" style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <Trophy size={18} color="var(--accent-gold)" />
                                            <span style={{ color: 'var(--text-muted)' }}>Score</span>
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{attempt.my_score} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>/ {attempt.my_max_score}</span></div>
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

                                {/* Time Drain Bar Chart */}
                                <div style={{ height: '300px', marginBottom: '2rem', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '8px' }}>
                                    <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center' }}>Time Drain (s)</h4>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <BarChart data={attempt.detailed_questions}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="question_id" stroke="var(--text-muted)" tickFormatter={(id) => `Q${id}`} />
                                            <YAxis stroke="var(--text-muted)" />
                                            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }} />
                                            <Legend />
                                            <Bar name="My Time" dataKey="time_spent_seconds" fill="var(--accent-gold)" />
                                            <Bar name="Peer Avg" dataKey="peer_avg_time_seconds" fill="#8884d8" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Granular Question Analysis</h4>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
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
