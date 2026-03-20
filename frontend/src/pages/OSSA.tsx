import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, ScrollText, Pencil, Trash2 } from 'lucide-react'; 
import api from '../api';
import bgImage from '../assets/Ned_Stark_OSSA-bg.jpg'; 

const OSSA = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const MODULE_ID = 1; 
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await api.get(`/quizzes/module/${MODULE_ID}`);
        setQuizzes(res.data);
      } catch (error) {
        console.error("Failed to load quizzes", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-deep)' }}>
      
      <div style={{
        backgroundImage: `linear-gradient(to bottom, rgba(10, 10, 10, 0.4), var(--bg-deep)), url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
        padding: '6rem 2rem 4rem',
        textAlign: 'center',
        borderBottom: '1px solid var(--border-dark)'
      }}>
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', fontSize: '3.5rem', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          Operating System & System Administration
        </h1>
        <p style={{ color: '#e0e0e0', fontSize: '1.2rem', marginTop: '1rem', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
          "The man who passes the sentence should swing the sword."
        </p>
      </div>

      <div style={{ padding: '3rem 2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
          <button 
            className="btn-primary" 
            onClick={() => navigate('/quiz-maker')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}
          >
            <Plus size={20} /> Forge an OSSA Quiz
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
            {quizzes.map((quiz) => (
              <div key={quiz.id} style={{ 
                border: '1px solid var(--border-dark)', 
                padding: '1.5rem', 
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 15, 15, 0.8)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ color: 'var(--text-main)', margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>{quiz.title}</h4>
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

                  {(currentUser?.id === quiz.created_user_id || currentUser?.role === 'ADMIN') && (
                    <button 
                      onClick={() => handleDelete(quiz.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} /> Delete
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OSSA;