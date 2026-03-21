import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, ScrollText, Pencil, Trash2, BadgeCheck, Drama, Award, Pin } from 'lucide-react';
import api from '../api';

interface QuizDisplayerProps {
  moduleId: number;
  moduleShortName: string;
}

const QuizDisplayer: React.FC<QuizDisplayerProps> = ({ moduleId, moduleShortName }) => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await api.get(`/quizzes/module/${moduleId}`);
        console.log("Archives fetched from DB:", res.data); // 👈 Helpful for debugging!
        setQuizzes(res.data);
      } catch (error) {
        console.error("Failed to load quizzes", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzes();
  }, [moduleId]);

  const handlePinToggle = async (quizId: number, currentStatus: boolean) => {
    try {
      await api.put(`/quizzes/${quizId}/governance`, { is_pinned: !currentStatus });
      setQuizzes(quizzes.map(q => q.id === quizId ? { ...q, is_pinned: !currentStatus } : q));
    } catch (error) {
      console.error("Failed to pin scroll", error);
      alert("Only No One can pin a scroll.");
    }
  };

  const handleRecommendToggle = async (quizId: number, currentStatus: boolean) => {
    try {
      await api.put(`/quizzes/${quizId}/governance`, { is_recommended: !currentStatus });
      // Update local state to reflect the change instantly
      setQuizzes(quizzes.map(q => q.id === quizId ? { ...q, is_recommended: !currentStatus } : q));
    } catch (error) {
      console.error("Failed to recommend scroll", error);
      alert("Only No One can bestow this honor.");
    }
  };

  const handleDelete = async (quizId: number) => {
    if (window.confirm("Are you sure you want to burn this scroll? This cannot be undone.")) {
      try {
        await api.delete(`/quizzes/${quizId}`);
        setQuizzes(quizzes.filter(q => q.id !== quizId)); 
        alert("Scroll burned successfully.");
      } catch (error) {
        console.error("Failed to delete", error);
        alert("Failed to delete the scroll.");
      }
    }
  };

  // 🛡️ SORTING LOGIC: Pinned items jump to the top!
  const sortedQuizzes = [...quizzes].sort((a, b) => Number(b.is_pinned || false) - Number(a.is_pinned || false));

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <button 
          className="btn-primary" 
          onClick={() => navigate('/quiz-maker')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}
        >
          <Plus size={20} /> Forge a {moduleShortName} Quiz
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-dark)', paddingBottom: '0.75rem', marginBottom: '2rem' }}>
        <ScrollText size={28} color="var(--accent-gold)" />
        <h2 className="brand-font" style={{ color: 'var(--text-main)', margin: 0 }}>Available Archives</h2>
      </div>
      
      {isLoading ? (
        <p style={{ color: 'var(--accent-gold)' }}>Summoning ravens... </p>
      ) : quizzes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-dark)', borderRadius: '8px', backgroundColor: 'rgba(20,20,20,0.5)' }}>
          <BookOpen size={48} color="var(--border-dark)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No scrolls have been forged for this module yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* 👇 Map over sortedQuizzes instead of quizzes! */}
          {sortedQuizzes.map((quiz) => {
            
            // 🛡️ ENUM ARMOR: Strip away any weird database formatting
            const role = String(quiz.creator_role).replace('UserRole.', '');
            const isNoOne = role === 'noOne' || role === 'NO_ONE';
            const isVerified = role === 'verified' || role === 'VERIFIED' || role === 'admin' || role === 'ADMIN' || isNoOne;

            return (
              <div key={quiz.id} style={{ 
                border: quiz.is_recommended ? '1px solid var(--accent-gold)' : '1px solid var(--border-dark)', 
                padding: '1.5rem', 
                borderRadius: '8px',
                backgroundColor: quiz.is_recommended ? 'rgba(255, 215, 0, 0.05)' : 'rgba(15, 15, 15, 0.8)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: quiz.is_recommended ? '0 0 10px rgba(255, 215, 0, 0.1)' : 'none'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h4 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.2rem' }}>{quiz.title}</h4>
                    
                    {/* --- BADGES --- */}
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      {quiz.is_recommended && (
                        <span title="Recommended by No One" style={{ cursor: 'help', display: 'flex' }}>
                          <Award size={20} color="var(--accent-gold)" />
                        </span>
                      )}
                      
                      {/* 👇 Use the armored variables here */}
                      {isNoOne && (
                        <span title="Created by No One" style={{ cursor: 'help', display: 'flex' }}>
                          <Drama size={20} color="#b39ddb" />
                        </span>
                      )}
                      {isVerified && (
                        <span title="Verified User" style={{ cursor: 'help', display: 'flex' }}>
                          <BadgeCheck size={20} color="#4caf50" />
                        </span>
                      )}
                      
                      {quiz.is_pinned && (
                        <span title="Pinned by No One" style={{ cursor: 'help', display: 'flex', transform: 'rotate(45deg)' }}>
                          <Pin size={20} color="#ec3c3c" fill="#000000" />
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>{quiz.description}</p>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  
                  {currentUser?.id === quiz.created_user_id && (
                    <button 
                      onClick={() => navigate(`/edit-quiz/${quiz.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid var(--text-muted)', color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <Pencil size={16} /> Edit
                    </button>
                  )}

                  {(currentUser?.id === quiz.created_user_id || currentUser?.role === 'admin' || currentUser?.role === 'noOne') && (
                    <button 
                      onClick={() => handleDelete(quiz.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  )}

                  {(currentUser?.role === 'noOne') && (
                    <button 
                      onClick={() => handlePinToggle(quiz.id, quiz.is_pinned)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: `1px solid ${quiz.is_pinned ? '#ff4d4d' : 'var(--text-muted)'}`, color: quiz.is_pinned ? '#ff4d4d' : 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <Pin size={16} style={{ transform: quiz.is_pinned ? 'rotate(45deg)' : 'none' }} /> 
                      {quiz.is_pinned ? 'Unpin' : 'Pin'}
                    </button>
                  )}

                  {(currentUser?.role === 'noOne') && (
                    <button 
                      onClick={() => handleRecommendToggle(quiz.id, quiz.is_recommended)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: `1px solid ${quiz.is_recommended ? 'var(--accent-gold)' : 'var(--text-muted)'}`, color: quiz.is_recommended ? 'var(--accent-gold)' : 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <Award size={16} /> 
                      {quiz.is_recommended ? 'Revoke Award' : 'Recommend'}
                    </button>
                  )}

                  <Link to={`/take-quiz/${quiz.id}`} style={{ 
                    color: '#000', 
                    backgroundColor: 'var(--accent-gold)',
                    textDecoration: 'none', 
                    fontWeight: 'bold',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '4px',
                    transition: 'opacity 0.2s'
                  }}>
                    Start Quiz
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