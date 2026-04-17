import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Trophy, CalendarDays, ChevronDown, ChevronUp, Users, Zap, Target, BookOpen, AlertTriangle } from 'lucide-react';
import { LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

interface QuestionStat {
    question_id: number;
    marks_awarded: number;
    time_spent_seconds: number;
    peer_avg_time_seconds: number;
    question_text?: string;
    topic_ids?: string;
    unit_id?: number;
}

interface AttemptAnalytics {
    attempt_id: number;
    quiz_id: number;
    quiz_title: string;
    module_id: number;
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
    comeback_rate_percentage: number;
    peer_group: string;
}

interface BaselineKPIs {
    peer_accuracy_percentage: number;
    peer_avg_speed_per_question_seconds: number;
}

interface RadarStat {
    subject: string;
    score: number;
    peer_score: number;
}

interface DashboardData {
    kpis: KPIs;
    baseline_kpis: BaselineKPIs;
    radar_stats_module: RadarStat[];
    radar_stats_topic: RadarStat[];
    analytics: AttemptAnalytics[];
}

const PerformanceAnalytics = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [availableModules, setAvailableModules] = useState<any[]>([]);
    const [moduleTopics, setModuleTopics] = useState<Record<number, any[]>>({});

    // Level 0: Global Filters
    const [timeframe, setTimeframe] = useState('all');
    const [peerGroup, setPeerGroup] = useState('batch');
    const [moduleId, setModuleId] = useState('all');
    const [difficulty, setDifficulty] = useState('all');
    const [attemptType, setAttemptType] = useState('all');

    const [expandedAttemptId, setExpandedAttemptId] = useState<number | null>(null);
    const [radarView, setRadarView] = useState<'module' | 'topic' | 'unit'>('module');

    useEffect(() => {
        api.get('/modules').then(res => setAvailableModules(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        const fetchAllUnits = async () => {
            let maps: Record<number, any[]> = {};
            for (let m of availableModules) {
                try {
                    let res = await api.get(`/modules/${m.id}/units-with-topics`);
                    maps[m.id] = res.data;
                } catch (e) {
                    console.error(e);
                }
            }
            setModuleTopics(maps);
        };
        if (availableModules.length > 0) {
            fetchAllUnits();
        }
    }, [availableModules]);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/quizzes/analytics/me?timeframe=${timeframe}&peer_group=${peerGroup}&module_id=${moduleId}&difficulty=${difficulty}&attempt_type=${attemptType}`);
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch analytics:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [timeframe, peerGroup, moduleId, difficulty, attemptType]);

    const toggleExpand = (id: number) => {
        if (expandedAttemptId === id) setExpandedAttemptId(null);
        else setExpandedAttemptId(id);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}m ${s}s`;
    };

    // Derived AI Strategy Room Insights
    const strategy = useMemo(() => {
        if (!data) return null;
        const topicRadar = data.radar_stats_topic;
        if (topicRadar.length === 0) return null;
        let best = topicRadar.reduce((prev, curr) => (prev.score > curr.score) ? prev : curr);
        let worst = topicRadar.reduce((prev, curr) => (prev.score < curr.score) ? prev : curr);
        return { weapon: best.subject, heel: worst.subject };
    }, [data]);

    // Compute radar_stats_unit from detailed_questions on the client (units already in data)
    const radarUnitData = useMemo((): RadarStat[] => {
        if (!data || Object.keys(moduleTopics).length === 0) return [];
        const unitAcc: Record<number, { earned: number; max: number; name: string; peerEarned: number; peerMax: number }> = {};

        data.analytics.forEach(attempt => {
            attempt.detailed_questions.forEach(q => {
                if (!q.unit_id) return;
                const units = moduleTopics[attempt.module_id] || [];
                const unit = units.find((u: any) => u.id === q.unit_id);
                const unitName = unit ? unit.name : `Unit ${q.unit_id}`;
                if (!unitAcc[q.unit_id]) {
                    unitAcc[q.unit_id] = { earned: 0, max: 0, name: unitName, peerEarned: 0, peerMax: 0 };
                }
                // marks_awarded = 0 means wrong, max is inferred as 1 mark per question slot
                // We use a ratio approach: track correct vs total
                unitAcc[q.unit_id].earned += q.marks_awarded;
                unitAcc[q.unit_id].max += 1; // normalise to count
            });
        });

        return Object.values(unitAcc)
            .filter(v => v.max > 0)
            .map(v => ({
                subject: v.name,
                score: Math.round((v.earned / v.max) * 100),
                peer_score: 0 // peer unit breakdown not available without backend change
            }));
    }, [data, moduleTopics]);

    // Derive recommended reviews from failures, grouped by module
    const recommendedReviews = useMemo(() => {
        if (!data || Object.keys(moduleTopics).length === 0) return {};
        let grouped: Record<number, { moduleCode: string; moduleName: string; items: { unitId: number; unitName: string; topicId: number | null; topicName: string | null }[] }> = {};
        let seenKeys = new Set<string>();

        data.analytics.forEach(attempt => {
            attempt.detailed_questions.forEach(q => {
                if (q.marks_awarded === 0 && q.unit_id) {
                    let t_id: number | null = null;
                    if (q.topic_ids) {
                        try {
                            const tids = JSON.parse(q.topic_ids);
                            if (tids.length > 0) t_id = tids[0];
                        } catch (e) { }
                    }

                    const units = moduleTopics[attempt.module_id] || [];
                    const unit = units.find((u: any) => u.id === q.unit_id);
                    if (!unit) return;

                    const topic = t_id ? unit.topics.find((t: any) => t.id === t_id) : null;
                    const key = `${attempt.module_id}-${q.unit_id}-${t_id ?? 'none'}`;

                    if (seenKeys.has(key)) return;
                    seenKeys.add(key);

                    const mod = availableModules.find((m: any) => m.id === attempt.module_id);
                    if (!grouped[attempt.module_id]) {
                        grouped[attempt.module_id] = {
                            moduleCode: mod?.code ?? `Module ${attempt.module_id}`,
                            moduleName: mod?.name ?? '',
                            items: []
                        };
                    }
                    grouped[attempt.module_id].items.push({
                        unitId: q.unit_id,
                        unitName: unit.name,        // API returns 'name', not 'title'
                        topicId: t_id,
                        topicName: topic ? topic.name : null  // API returns 'name', not 'title'
                    });
                }
            });
        });
        return grouped;
    }, [data, moduleTopics, availableModules]);

    const hasRecommendations = Object.keys(recommendedReviews).length > 0;

    if (!data && loading) return <div className="loading-state brand-font">Mapping the archives...</div>;

    const kpis = data?.kpis;
    const baseline = data?.baseline_kpis;

    // Calculate Deltas vs Peer Group
    const accDelta = kpis && baseline ? (kpis.total_accuracy_percentage - baseline.peer_accuracy_percentage).toFixed(1) : '0.0';
    const accDeltaIsPositive = parseFloat(accDelta) >= 0;

    const speedDelta = kpis && baseline ? (baseline.peer_avg_speed_per_question_seconds - kpis.avg_speed_per_question_seconds).toFixed(1) : '0.0';
    const speedDeltaIsPositive = parseFloat(speedDelta) >= 0;

    return (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

            {/* LEVEL 0: GLOBAL CONTROL PANEL (STICKY) */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 100,
                backgroundColor: 'rgba(10, 10, 10, 0.95)', borderBottom: '1px solid var(--accent-gold)',
                padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255,215,0,0.1)'
            }}>
                <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="auth-input" style={{ width: 'auto', margin: 0, padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="semester">This Semester</option>
                    <option value="all">Legacy (All Time)</option>
                </select>
                <select value={peerGroup} onChange={e => setPeerGroup(e.target.value)} className="auth-input" style={{ width: 'auto', margin: 0, padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                    <option value="batch">Batch Average</option>
                    <option value="top25">Top 25% (High Achievers)</option>
                    <option value="top10">Top 10% (Elite Tier)</option>
                </select>
                <select value={moduleId} onChange={e => setModuleId(e.target.value)} className="auth-input" style={{ width: 'auto', margin: 0, padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                    <option value="all">All Subjects/Modules</option>
                    {availableModules.map(m => <option key={m.id} value={m.id}>{m.code}</option>)}
                </select>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="auth-input" style={{ width: 'auto', margin: 0, padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy Qs Only</option>
                    <option value="medium">Medium Qs Only</option>
                    <option value="hard">Hard Qs Only</option>
                </select>
                <select value={attemptType} onChange={e => setAttemptType(e.target.value)} className="auth-input" style={{ width: 'auto', margin: 0, padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                    <option value="all">All Attempts</option>
                    <option value="first">First Attempts Only</option>
                    <option value="retakes">Retakes Only</option>
                </select>
            </div>

            <div className="page-container" style={{ paddingTop: '2rem', flex: 1, filter: loading ? 'blur(4px)' : 'none', transition: 'filter 0.3s' }}>

                {(!data || data.analytics.length === 0) ? (
                    <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
                        <h1 className="brand-font" style={{ color: 'var(--accent-gold)' }}>The Arena is Empty</h1>
                        <p className="text-desc">No attempts match these rigorous filters. Adjust your controls above.</p>
                    </div>
                ) : (
                    <>
                        {/* LEVEL 1: HERO SECTION */}
                        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                            <h1 className="brand-font" style={{ color: 'var(--accent-gold)', fontSize: '3rem', margin: '0 0 0.5rem 0' }}>The Arena</h1>
                            <p style={{ color: 'var(--text-main)', fontSize: '1.2rem', fontStyle: 'italic', fontFamily: 'var(--font-reading)' }}>
                                {kpis!.total_accuracy_percentage >= 80 ? "🔥 You are commanding the battlefield." :
                                    kpis!.comeback_rate_percentage >= 50 ? "🛡️ A resilient scholar climbs upward." :
                                        "⚔️ Stand firm. Sharpen your blade."}
                            </p>
                        </div>

                        {/* LEVEL 2: VITAL SIGNS */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                            <div className="dashboard-card" style={{ textAlign: 'center', borderTop: '3px solid var(--accent-gold)' }}>
                                <Trophy size={32} color="var(--accent-gold)" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                                <h3 className="brand-font" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Accuracy Rating</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-main)', lineHeight: 1 }}>{kpis!.total_accuracy_percentage.toFixed(1)}%</div>
                                <div style={{ fontSize: '0.85rem', color: accDeltaIsPositive ? '#4caf50' : '#f44336', marginTop: '0.75rem', fontWeight: 'bold' }}>
                                    {accDeltaIsPositive ? '▲' : '▼'} {Math.abs(parseFloat(accDelta))}% {accDeltaIsPositive ? 'above' : 'below'} {peerGroup.toUpperCase()}
                                </div>
                            </div>

                            <div className="dashboard-card" style={{ textAlign: 'center', borderTop: '3px solid var(--accent-gold)' }}>
                                <Zap size={32} color="var(--accent-gold)" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                                <h3 className="brand-font" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Agility (Speed/Q)</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-main)', lineHeight: 1 }}>{kpis!.avg_speed_per_question_seconds.toFixed(0)}s</div>
                                <div style={{ fontSize: '0.85rem', color: speedDeltaIsPositive ? '#4caf50' : '#f44336', marginTop: '0.75rem', fontWeight: 'bold' }}>
                                    {speedDeltaIsPositive ? '▲' : '▼'} {Math.abs(parseFloat(speedDelta))}s {speedDeltaIsPositive ? 'faster' : 'slower'} vs {peerGroup.toUpperCase()}
                                </div>
                            </div>

                            <div className="dashboard-card" style={{ textAlign: 'center', borderTop: '3px solid var(--accent-gold)' }}>
                                <Target size={32} color="var(--accent-gold)" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                                <h3 className="brand-font" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Comeback Rate</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-main)', lineHeight: 1 }}>{kpis!.comeback_rate_percentage}%</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>Mistakes fixed on retakes</div>
                            </div>

                            <div className="dashboard-card" style={{ textAlign: 'center', borderTop: '3px solid var(--accent-gold)' }}>
                                <Users size={32} color="var(--accent-gold)" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                                <h3 className="brand-font" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Global Standing</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-main)', lineHeight: 1 }}>Top {100 - kpis!.peer_percentile}%</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>{kpis!.consistency_streak_days} Day Streak 🔥</div>
                            </div>
                        </div>

                        {/* LEVEL 4: THE STRATEGY ROOM */}
                        {strategy && (
                            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '3rem', flexWrap: 'wrap' }}>
                                <div className="dashboard-card" style={{ flex: '1 1 300px', maxWidth: '400px', border: '1px solid var(--accent-gold)', borderRight: '4px solid #4caf50', padding: '1.5rem', textAlign: 'center', background: 'var(--bg-elevated)' }}>
                                    <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Your Secret Weapon</h3>
                                    <div style={{ color: '#4caf50', fontSize: '1.3rem', fontWeight: 'bold', fontFamily: 'var(--font-brand)' }}>{strategy.weapon}</div>
                                </div>
                                <div className="dashboard-card" style={{ flex: '1 1 300px', maxWidth: '400px', border: '1px solid var(--accent-gold)', borderRight: '4px solid #ff6b6b', padding: '1.5rem', textAlign: 'center', background: 'var(--bg-elevated)' }}>
                                    <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Your Achilles Heel</h3>
                                    <div style={{ color: '#ff6b6b', fontSize: '1.3rem', fontWeight: 'bold', fontFamily: 'var(--font-brand)' }}>{strategy.heel}</div>
                                </div>
                            </div>
                        )}

                        {/* LEVEL 3: BATTLEFIELD (VISUALS) — full width stacked */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '4rem' }}>
                            <div className="dashboard-card" style={{ padding: '1.5rem', height: '400px' }}>
                                <h3 className="brand-font" style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>Timeline Progression</h3>
                                <ResponsiveContainer width="100%" height="90%">
                                    <LineChart data={data.analytics.map((a, i) => ({ name: `T${i + 1}`, myScore: (a.my_score / (a.my_max_score || 1)) * 100, peerAvg: (a.peer_avg_score / (a.my_max_score || 1)) * 100 }))}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" />
                                        <YAxis stroke="var(--text-muted)" domain={[0, 100]} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                                        <Legend />
                                        <Line type="monotone" name="Your Score %" dataKey="myScore" stroke="var(--accent-gold)" strokeWidth={3} dot={{ r: 5 }}>
                                            <LabelList dataKey="myScore" position="top" formatter={(val: number) => val.toFixed(0)} fill="var(--accent-gold)" fontSize={12} offset={10} />
                                        </Line>
                                        <Line type="monotone" name={`${peerGroup.toUpperCase()} Avg %`} dataKey="peerAvg" stroke="#b39ddb" strokeWidth={2} strokeDasharray="5 5">
                                            <LabelList dataKey="peerAvg" position="bottom" formatter={(val: number) => val.toFixed(0)} fill="#b39ddb" fontSize={12} offset={10} />
                                        </Line>
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="dashboard-card" style={{ padding: '1.5rem', height: '420px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 className="brand-font" style={{ color: 'var(--accent-gold)' }}>Dominance Radar</h3>
                                    <select className="auth-input" style={{ padding: '0.2rem 0.5rem', width: 'auto', fontSize: '0.85rem' }} value={radarView} onChange={(e) => setRadarView(e.target.value as 'module' | 'topic' | 'unit')}>
                                        <option value="module">By Module</option>
                                        <option value="topic">By Topic</option>
                                        <option value="unit">By Unit</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flex: 1, gap: '1.5rem', overflow: 'hidden' }}>
                                    <div style={{ flex: '2', height: '100%', minWidth: 0 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            {(() => {
                                                const radarData = radarView === 'module' ? data.radar_stats_module : radarView === 'topic' ? data.radar_stats_topic : radarUnitData;
                                                const hasEnough = radarData.length >= 3;
                                                return hasEnough ? (
                                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                                                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.2)" />
                                                        <Radar name="My Mastery (%)" dataKey="score" stroke="var(--accent-gold)" fill="var(--accent-gold)" fillOpacity={0.3} />
                                                        {radarView !== 'unit' && (
                                                            <Radar name={`${peerGroup.toUpperCase()} Mastery (%)`} dataKey="peer_score" stroke="#b39ddb" fill="#b39ddb" fillOpacity={0.3} />
                                                        )}
                                                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                                    </RadarChart>
                                                ) : (
                                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                                                        Not enough unique subjects for Radar (min 3)
                                                    </div>
                                                );
                                            })()}
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ flex: '1', overflowY: 'auto', paddingRight: '0.5rem', borderLeft: '1px solid var(--border-dark)', paddingLeft: '1rem', minWidth: '180px' }}>
                                        <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-dark)' }}>
                                                    <th style={{ padding: '0.3rem 0' }}>Subject</th>
                                                    <th style={{ padding: '0.3rem 0' }}>You</th>
                                                    {radarView !== 'unit' && <th style={{ padding: '0.3rem 0' }}>Peer</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(radarView === 'module' ? data.radar_stats_module : radarView === 'topic' ? data.radar_stats_topic : radarUnitData).map((stat, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                                                        <td style={{ color: 'var(--text-main)', padding: '0.5rem 0', wordBreak: 'break-word' }}>{stat.subject}</td>
                                                        <td style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>{stat.score.toFixed(0)}</td>
                                                        {radarView !== 'unit' && <td style={{ color: '#b39ddb' }}>{stat.peer_score.toFixed(0)}</td>}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* LEVEL 4.5: RECOMMENDED REVIEWS — grouped by module */}
                        {hasRecommendations && (
                            <div className="dashboard-card" style={{ marginBottom: '4rem', padding: '2rem' }}>
                                <h2 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
                                    <Target size={24} color="var(--accent-gold)" /> Recommended for Review
                                </h2>
                                {Object.entries(recommendedReviews).map(([modId, group]) => (
                                    <div key={modId} style={{ marginBottom: '2rem' }}>
                                        <h3 className="brand-font" style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ background: 'var(--accent-gold)', color: '#000', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{group.moduleCode}</span>
                                            Recommended for review in {group.moduleCode}
                                        </h3>
                                        <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: 0 }}>
                                            {group.items.map((item, i) => (
                                                <li key={i}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                        {item.topicName ? (
                                                            <>
                                                                <button
                                                                    className="btn-ghost"
                                                                    style={{ padding: '0.15rem 0.6rem', fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 'bold', color: '#ffcc80', background: 'rgba(255,204,128,0.1)', border: '1px solid rgba(255,204,128,0.3)', borderRadius: '4px' }}
                                                                    onClick={() => navigate(`/module/${modId}/notes?unitId=${item.unitId}&topicId=${item.topicId}&recommended=true`)}
                                                                >
                                                                    {item.topicName}
                                                                </button>
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>from</span>
                                                                <button
                                                                    className="btn-ghost"
                                                                    style={{ padding: '0.15rem 0.6rem', fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-main)', background: 'var(--bg-elevated)', border: '1px solid var(--border-dark)', borderRadius: '4px' }}
                                                                    onClick={() => navigate(`/module/${modId}/notes?unitId=${item.unitId}`)}
                                                                >
                                                                    {item.unitName}
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                className="btn-ghost"
                                                                style={{ padding: '0.15rem 0.6rem', fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-main)', background: 'var(--bg-elevated)', border: '1px solid var(--border-dark)', borderRadius: '4px' }}
                                                                onClick={() => navigate(`/module/${modId}/notes?unitId=${item.unitId}`)}
                                                            >
                                                                {item.unitName}
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* LEVEL 5: THE ACTIONABLE LEDGER */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
                            <BookOpen size={24} color="var(--accent-gold)" />
                            <h2 className="brand-font" style={{ color: 'var(--text-main)', margin: 0 }}>Actionable Ledger</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
                            {data.analytics.map((attempt) => (
                                <div key={attempt.attempt_id} className="dashboard-card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '12px', transition: 'all 0.3s ease' }}>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleExpand(attempt.attempt_id)}>
                                        <div>
                                            <h3 className="brand-font" style={{ color: 'var(--accent-gold)', fontSize: '1.4rem' }}>{attempt.quiz_title}</h3>
                                            <p className="text-desc" style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                                                <span><CalendarDays size={14} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} /> {new Date(attempt.attempt_date).toLocaleDateString()}</span>
                                                <span style={{ color: (attempt.my_score >= attempt.peer_avg_score) ? '#4caf50' : '#ff6b6b' }}>
                                                    <strong>{attempt.my_score}</strong> / {attempt.my_max_score} Score
                                                </span>
                                            </p>
                                        </div>
                                        <div>
                                            {expandedAttemptId === attempt.attempt_id ? <ChevronUp color="var(--accent-gold)" /> : <ChevronDown color="var(--accent-gold)" />}
                                        </div>
                                    </div>

                                    {expandedAttemptId === attempt.attempt_id && (
                                        <div style={{ marginTop: '2rem', borderTop: '1px dashed rgba(255,215,0,0.2)', paddingTop: '1.5rem' }}>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                                <div className="stat-block" style={{ background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-gold)' }}>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Execution Time</div>
                                                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{formatTime(attempt.my_time_seconds)}</div>
                                                    <div style={{ fontSize: '0.85rem', color: attempt.my_time_seconds <= attempt.peer_avg_time_seconds ? '#4caf50' : '#ff6b6b', marginTop: '0.2rem' }}>
                                                        {peerGroup.toUpperCase()}: {formatTime(attempt.peer_avg_time_seconds)}
                                                    </div>
                                                </div>
                                            </div>

                                            <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <AlertTriangle size={16} color="var(--text-muted)" /> Micro-Analysis
                                            </h4>

                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                                            <th style={{ padding: '0.8rem 0.5rem', width: '50px' }}>Q</th>
                                                            <th style={{ padding: '0.8rem 0.5rem', width: '100px' }}>Result</th>
                                                            <th style={{ padding: '0.8rem 0.5rem', width: '150px' }}>Speed vs Cohort</th>
                                                            <th style={{ padding: '0.8rem 0.5rem', textAlign: 'right' }}>Remediation</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {attempt.detailed_questions.map((q) => {
                                                            const isPerfect = q.marks_awarded > 0; // Approximation for perfect
                                                            const isFaster = q.time_spent_seconds < q.peer_avg_time_seconds;
                                                            return (
                                                                <tr key={q.question_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    <td style={{ padding: '0.8rem 0.5rem', color: 'var(--text-muted)' }}>#{q.question_id}</td>
                                                                    <td style={{ padding: '0.8rem 0.5rem', color: isPerfect ? '#4caf50' : '#ff6b6b', fontWeight: 'bold' }}>
                                                                        {isPerfect ? 'Success' : 'Failure'}
                                                                    </td>
                                                                    <td style={{ padding: '0.8rem 0.5rem' }}>
                                                                        <span style={{ color: 'var(--text-main)' }}>{q.time_spent_seconds}s</span>
                                                                        <span style={{ color: isFaster ? '#4caf50' : '#ff6b6b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                                                                            ({q.peer_avg_time_seconds}s avg)
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '0.8rem 0.5rem', textAlign: 'right' }}>
                                                                        {!isPerfect && (q.unit_id !== null && q.unit_id !== undefined) ? (
                                                                            <button
                                                                                className="btn-ghost"
                                                                                style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    let topicId = null;
                                                                                    if (q.topic_ids) {
                                                                                        try {
                                                                                            const tids = JSON.parse(q.topic_ids);
                                                                                            if (tids.length > 0) topicId = tids[0];
                                                                                        } catch (e) { }
                                                                                    }
                                                                                    let qStr = `?unitId=${q.unit_id}`;
                                                                                    if (topicId) qStr += `&topicId=${topicId}`;
                                                                                    qStr += `&recommended=true`; // We automatically apply Recommended filter for remediation!
                                                                                    navigate(`/module/${attempt.module_id}/notes${qStr}`);
                                                                                }}
                                                                            >
                                                                                Review Concept <BookOpen size={12} style={{ marginLeft: '4px' }} />
                                                                            </button>
                                                                        ) : isPerfect ? (
                                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Mastered</span>
                                                                        ) : (
                                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No concept mapped</span>
                                                                        )}
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
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PerformanceAnalytics;
