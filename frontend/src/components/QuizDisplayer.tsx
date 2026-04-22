import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, BookOpen, Pencil, Trash2, BadgeCheck, VenetianMask, Award, Pin, Filter, Crown, History } from 'lucide-react';
import api from '../api';
import AttemptHistoryModal from './AttemptHistoryModal';

interface QuizDisplayerProps {
  moduleId: number;
  moduleShortName: string;
}

const QuizDisplayer: React.FC<QuizDisplayerProps> = ({ moduleId, moduleShortName }) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [sortOrder, setSortOrder] = useState<'newest' | 'nameAsc' | 'nameDesc'>('newest');
  const [filterVerified, setFilterVerified] = useState(false);
  
  const initialRecommended = searchParams.get('recommended') === 'true';
  const [filterRecommended, setFilterRecommended] = useState(initialRecommended);
  const [filterNoOne, setFilterNoOne] = useState(false);

  const [expandedAnalytics, setExpandedAnalytics] = useState<Record<number, any>>({});
  const [attemptHistoryQuiz, setAttemptHistoryQuiz] = useState<{ id: number; title: string } | null>(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchQuizzes();
  }, [moduleId]);

  const fetchQuizzes = async () => {
    try {
      const res = await api.get(`/quizzes/module/${moduleId}`);
      setQuizzes(res.data);
    } catch (error) {
      console.error("Failed to load quizzes", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinToggle = async (quizId: number, currentStatus: boolean) => {
    try {
      await api.put(`/quizzes/${quizId}/governance`, { is_pinned: !currentStatus });
      setQuizzes(quizzes.map(q => q.id === quizId ? { ...q, is_pinned: !currentStatus } : q));
    } catch (error) { alert("Only No One can pin a scroll."); }
  };

  const handleRecommendToggle = async (quizId: number, currentStatus: boolean) => {
    try {
      await api.put(`/quizzes/${quizId}/governance`, { is_recommended: !currentStatus });
      setQuizzes(quizzes.map(q => q.id === quizId ? { ...q, is_recommended: !currentStatus } : q));
    } catch (error) { alert("Only No One can bestow this honor."); }
  };

  const handlePremiumToggle = async (quizId: number, currentStatus: boolean) => {
    try {
      await api.put(`/quizzes/${quizId}/governance`, { is_premium: !currentStatus });
      setQuizzes(quizzes.map(q => q.id === quizId ? { ...q, is_premium: !currentStatus } : q));
    } catch (error) { alert("Only No One can make this premium."); }
  };

  const handleDelete = async (quizId: number) => {
    if (window.confirm("Are you sure you want to burn this scroll? This cannot be undone.")) {
      try {
        await api.delete(`/quizzes/${quizId}`);
        setQuizzes(quizzes.filter(q => q.id !== quizId)); 
      } catch (error) { alert("Failed to delete the scroll."); }
    }
  };

  const handleToggleAnalytics = async (quizId: number) => {
    if (expandedAnalytics[quizId]) {
      setExpandedAnalytics(prev => { const n = {...prev}; delete n[quizId]; return n; });
    } else {
      try {
        const res = await api.get(`/quizzes/${quizId}/analytics`);
        setExpandedAnalytics(prev => ({...prev, [quizId]: res.data}));
      } catch (error) { alert("Failed to load metrics. You might lack permissions."); }
    }
  };

  const processedQuizzes = quizzes.filter(quiz => {
    const role = String(quiz.creator_role).replace('UserRole.', '');
    const isNoOne = role === 'noOne' || role === 'NO_ONE';
    const isVerified = role === 'verified' || role === 'VERIFIED' || role === 'admin' || role === 'ADMIN' || isNoOne;

    if (filterVerified && !isVerified) return false;
    if (filterRecommended && !quiz.is_recommended) return false;
    if (filterNoOne && !isNoOne) return false;
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'nameAsc') return a.title.localeCompare(b.title);
    if (sortOrder === 'nameDesc') return b.title.localeCompare(a.title);
    return b.id - a.id; 
  }).sort((a, b) => Number(b.is_pinned || false) - Number(a.is_pinned || false));

  return (
    <div className="page-container" style={{ padding: '3rem 2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <button onClick={() => navigate(`/quiz-maker?moduleId=${moduleId}`)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
          <Plus size={20} /> Forge a {moduleShortName} Trial
        </button>
      </div>

      <div className="control-bar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)' }}>
          <Filter size={20} /> <strong style={{ marginRight: '0.5rem' }}>Filter Archives</strong>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="auth-input" style={{ width: 'auto', padding: '0.4rem', margin: 0, fontSize: '0.85rem' }}>
            <option value="newest">Last Updated</option>
            <option value="nameAsc">Name (A-Z)</option>
            <option value="nameDesc">Name (Z-A)</option>
          </select>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={filterVerified} onChange={e => setFilterVerified(e.target.checked)} style={{ accentColor: 'var(--accent-gold)' }}/>
              <BadgeCheck size={16} color="#4caf50" /> Verified
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={filterRecommended} onChange={e => setFilterRecommended(e.target.checked)} style={{ accentColor: 'var(--accent-gold)' }}/>
              <Award size={16} color="var(--accent-gold)" /> Recommended
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={filterNoOne} onChange={e => setFilterNoOne(e.target.checked)} style={{ accentColor: 'var(--accent-gold)' }}/>
              <VenetianMask size={16} color="var(--accent-purple, #b39ddb)" /> By No One
            </label>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <p style={{ color: 'var(--accent-gold)' }}>Summoning ravens... </p>
      ) : processedQuizzes.length === 0 ? (
        <div className="module-section" style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-dark)', borderRadius: '8px' }}>
          <BookOpen size={48} color="var(--border-dark)" style={{ marginBottom: '1rem' }} />
          <p className="text-desc" style={{ fontSize: '1.1rem' }}>No scrolls match your current filters.</p>
        </div>
      ) : (
        <div className="list-view">
          {processedQuizzes.map((quiz) => {
            const role = String(quiz.creator_role).replace('UserRole.', '');
            const isNoOne = role === 'noOne' || role === 'NO_ONE';
            const isVerified = role === 'verified' || role === 'VERIFIED' || role === 'admin' || role === 'ADMIN' || isNoOne;

            return (
              <div key={quiz.id} className={`item-card row ${quiz.is_recommended ? 'recommended' : ''} ${quiz.is_pinned && !quiz.is_recommended ? 'pinned' : ''}`}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h4 className="text-title">{quiz.title}</h4>
                    
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {quiz.is_recommended && <span title="Recommended"><Award size={20} color="var(--accent-gold)" /></span>}
                      {isNoOne && <span title="Forged by No One"><VenetianMask size={20} color="var(--accent-purple, #b39ddb)" /></span>}
                      {isVerified && <span title="Verified Scholar"><BadgeCheck size={20} color="#4caf50" /></span>}
                      {quiz.is_pinned && <span title="Pinned"><Pin size={20} color="var(--accent-red)" fill="var(--accent-red)" style={{ transform: 'rotate(45deg)' }} /></span>}
                      {quiz.is_premium && <span title="Premium Exclusive"><Crown size={20} color="#f1c40f" fill="#f1c40f" /></span>}
                    </div>
                  </div>
                  <p className="text-desc" style={{ marginBottom: '0.4rem' }}>{quiz.description}</p>
                  <p className="text-desc" style={{ fontSize: '0.85rem' }}>
                    Forged by: <Link to={`/user/${quiz.created_user_id}`} style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600 }}>{quiz.creator_name}</Link>
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  
                  {currentUser?.role === 'noOne' && (
                    <div style={{ display: 'flex', gap: '0.5rem', borderRight: '1px solid var(--border-dark)', paddingRight: '1rem' }}>
                      <button onClick={() => handleRecommendToggle(quiz.id, quiz.is_recommended)} className="btn-ghost" style={{ borderColor: quiz.is_recommended ? 'var(--accent-gold)' : '', color: quiz.is_recommended ? 'var(--accent-gold)' : '' }}>
                        <Award size={16} /> {quiz.is_recommended ? 'Revoke' : 'Recommend'}
                      </button>
                      <button onClick={() => handlePremiumToggle(quiz.id, quiz.is_premium)} className="btn-ghost" style={{ borderColor: quiz.is_premium ? '#f1c40f' : '', color: quiz.is_premium ? '#f1c40f' : '' }}>
                        <Crown size={16} /> {quiz.is_premium ? 'Unpremium' : 'Premium'}
                      </button>
                      <button onClick={() => handlePinToggle(quiz.id, quiz.is_pinned)} className="btn-ghost" style={{ borderColor: quiz.is_pinned ? 'var(--accent-red)' : '', color: quiz.is_pinned ? 'var(--accent-red)' : '' }}>
                        <Pin size={16} style={{ transform: quiz.is_pinned ? 'rotate(45deg)' : 'none' }} /> {quiz.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                    </div>
                  )}

                  {currentUser?.id === quiz.created_user_id && (
                    <button onClick={() => navigate(`/edit-quiz/${quiz.id}`)} className="btn-ghost"><Pencil size={16} /> Edit</button>
                  )}

                  {(currentUser?.id === quiz.created_user_id || currentUser?.role === 'admin' || currentUser?.role === 'noOne') && (
                    <>
                      <button onClick={() => handleToggleAnalytics(quiz.id)} className="btn-ghost"><Award size={16} /> Metrics</button>
                      <button onClick={() => handleDelete(quiz.id)} className="btn-ghost-danger"><Trash2 size={16} /> Delete</button>
                    </>
                  )}

                  <button
                    onClick={() => setAttemptHistoryQuiz({ id: quiz.id, title: quiz.title })}
                    className="btn-ghost"
                    style={{ color: 'var(--accent-gold)', borderColor: 'rgba(255,215,0,0.3)' }}
                  >
                    <History size={16} /> My Attempts
                  </button>

                  <Link to={`/take-quiz/${quiz.id}`} className="btn-solid-gold" style={{ textDecoration: 'none' }}>
                    Start Trial
                  </Link>
                </div>

                {expandedAnalytics[quiz.id] && (
                  <div style={{ padding: '1rem', marginTop: '1rem', borderTop: '1px dashed var(--border-dark)', backgroundColor: 'var(--bg-deep)', borderRadius: '4px' }}>
                     <h5 className="text-title" style={{ fontSize: '1rem', color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>Performance Matrix</h5>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                          <p className="text-desc">Total Attempts</p>
                          <p className="text-main" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{expandedAnalytics[quiz.id].total_attempts}</p>
                        </div>
                        <div>
                          <p className="text-desc">Pass Rate</p>
                          <p className="text-main" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{expandedAnalytics[quiz.id].pass_rate}%</p>
                        </div>
                        <div>
                          <p className="text-desc">Hardest Q. ID</p>
                          <p className="text-main" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{expandedAnalytics[quiz.id].highest_failure_question_id || 'N/A'}</p>
                        </div>
                     </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Attempt History Modal */}
      {attemptHistoryQuiz && (
        <AttemptHistoryModal
          quizId={attemptHistoryQuiz.id}
          quizTitle={attemptHistoryQuiz.title}
          onClose={() => setAttemptHistoryQuiz(null)}
        />
      )}
    </div>
  );
};

export default QuizDisplayer;