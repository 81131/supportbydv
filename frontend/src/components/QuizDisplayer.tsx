import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Pencil, Trash2, BadgeCheck, VenetianMask, Award, Pin, Filter } from 'lucide-react';
import api from '../api';

interface QuizDisplayerProps {
  moduleId: number;
  moduleShortName: string;
}

const QuizDisplayer: React.FC<QuizDisplayerProps> = ({ moduleId, moduleShortName }) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // --- FILTER & SORT STATE ---
  const [sortOrder, setSortOrder] = useState<'newest' | 'nameAsc' | 'nameDesc'>('newest');
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterRecommended, setFilterRecommended] = useState(false);
  const [filterNoOne, setFilterNoOne] = useState(false);

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

  // --- GOVERNANCE ---
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

  const handleDelete = async (quizId: number) => {
    if (window.confirm("Are you sure you want to burn this scroll? This cannot be undone.")) {
      try {
        await api.delete(`/quizzes/${quizId}`);
        setQuizzes(quizzes.filter(q => q.id !== quizId)); 
      } catch (error) { alert("Failed to delete the scroll."); }
    }
  };

  // --- FILTER & SORT ENGINE ---
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
    <div style={{ padding: '3rem 2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/quiz-maker')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
          <Plus size={20} /> Forge a {moduleShortName} Trial
        </button>
      </div>

      {/* --- CONTROL BAR --- */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-dark)', marginBottom: '2rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)' }}>
          <Filter size={20} /> <strong style={{ marginRight: '1rem' }}>Filter Archives</strong>
        </div>
        
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="auth-input" style={{ width: 'auto', padding: '0.5rem', margin: 0 }}>
          <option value="newest">Last Updated</option>
          <option value="nameAsc">Name (A-Z)</option>
          <option value="nameDesc">Name (Z-A)</option>
        </select>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={filterVerified} onChange={e => setFilterVerified(e.target.checked)} style={{ accentColor: 'var(--accent-gold)' }}/>
            <BadgeCheck size={16} color="#4caf50" /> Verified
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={filterRecommended} onChange={e => setFilterRecommended(e.target.checked)} style={{ accentColor: 'var(--accent-gold)' }}/>
            <Award size={16} color="var(--accent-gold)" /> Recommended
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={filterNoOne} onChange={e => setFilterNoOne(e.target.checked)} style={{ accentColor: 'var(--accent-gold)' }}/>
            <VenetianMask size={16} color="#b39ddb" /> By No One
          </label>
        </div>
      </div>
      
      {isLoading ? (
        <p style={{ color: 'var(--accent-gold)' }}>Summoning ravens... </p>
      ) : processedQuizzes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-dark)', borderRadius: '8px', backgroundColor: 'rgba(20,20,20,0.5)' }}>
          <BookOpen size={48} color="var(--border-dark)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No scrolls match your current filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {processedQuizzes.map((quiz) => {
            const role = String(quiz.creator_role).replace('UserRole.', '');
            const isNoOne = role === 'noOne' || role === 'NO_ONE';
            const isVerified = role === 'verified' || role === 'VERIFIED' || role === 'admin' || role === 'ADMIN' || isNoOne;

            return (
              <div key={quiz.id} style={{ 
                border: quiz.is_pinned ? '1px solid var(--accent-gold)' : (quiz.is_recommended ? '1px solid var(--accent-gold)' : '1px solid var(--border-dark)'), 
                padding: '1.5rem', borderRadius: '8px',
                backgroundColor: quiz.is_recommended ? 'rgba(255, 215, 0, 0.05)' : 'rgba(15, 15, 15, 0.8)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: quiz.is_recommended ? '0 0 10px rgba(255, 215, 0, 0.1)' : 'none'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h4 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.2rem' }}>{quiz.title}</h4>
                    
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {quiz.is_recommended && <span title="Recommended"><Award size={20} color="var(--accent-gold)" /></span>}
                      {isNoOne && <span title="Forged by No One"><VenetianMask size={20} color="#b39ddb" /></span>}
                      {isVerified && <span title="Verified Scholar"><BadgeCheck size={20} color="#4caf50" /></span>}
                      {quiz.is_pinned && <span title="Pinned"><Pin size={20} color="#ff4d4d" fill="#ff4d4d" style={{ transform: 'rotate(45deg)' }} /></span>}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>{quiz.description}</p>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  
                  {/* --- GOVERNANCE BUTTONS FOR NO ONE --- */}
                  {currentUser?.role === 'noOne' && (
                    <div style={{ display: 'flex', gap: '0.5rem', borderRight: '1px solid var(--border-dark)', paddingRight: '1rem' }}>
                      <button onClick={() => handleRecommendToggle(quiz.id, quiz.is_recommended)} style={{ background: 'transparent', border: `1px solid ${quiz.is_recommended ? 'var(--accent-gold)' : 'var(--text-muted)'}`, color: quiz.is_recommended ? 'var(--accent-gold)' : 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Award size={16} /> {quiz.is_recommended ? 'Revoke' : 'Recommend'}
                      </button>
                      <button onClick={() => handlePinToggle(quiz.id, quiz.is_pinned)} style={{ background: 'transparent', border: `1px solid ${quiz.is_pinned ? '#ff4d4d' : 'var(--text-muted)'}`, color: quiz.is_pinned ? '#ff4d4d' : 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Pin size={16} style={{ transform: quiz.is_pinned ? 'rotate(45deg)' : 'none' }} /> {quiz.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                    </div>
                  )}

                  {currentUser?.id === quiz.created_user_id && (
                    <button onClick={() => navigate(`/edit-quiz/${quiz.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}><Pencil size={16} /> Edit</button>
                  )}

                  {(currentUser?.id === quiz.created_user_id || currentUser?.role === 'admin' || currentUser?.role === 'noOne') && (
                    <button onClick={() => handleDelete(quiz.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16} /> Delete</button>
                  )}

                  <Link to={`/take-quiz/${quiz.id}`} style={{ color: '#000', backgroundColor: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 'bold', padding: '0.6rem 1.2rem', borderRadius: '4px' }}>
                    Start Trial
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuizDisplayer;