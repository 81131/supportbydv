import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QuizDisplayer from '../components/QuizDisplayer';
import NoteDisplayer from '../components/NoteDisplayer';
import CollectionDisplayer from '../components/CollectionDisplayer';
import { Swords, ScrollText, Library } from 'lucide-react';
import api from '../api';
import ossaBg from '../assets/Ned_Stark_OSSA-bg.jpg';
import wmtBg from '../assets/dragonglass_cave-WMT-bg.avif';
import psBg from '../assets/Tyrion_PS-bg.avif';

const ModuleView: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [module, setModule] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'quizzes' | 'notes' | 'collections'>('quizzes');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const res = await api.get('/modules');
        const found = res.data.find((m: any) => m.id === parseInt(moduleId || '0'));
        setModule(found);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchModule();
  }, [moduleId]);

  if (isLoading) return <div className="page-container text-title">Consulting the Grand Library...</div>;
  if (!module) return <div className="page-container text-title">Module not found in the archives.</div>;

  const moduleBgMap: Record<string, string> = {
    OSSA: ossaBg,
    WMT: wmtBg,
    PS: psBg,
  };
  const heroBg = moduleBgMap[module.code] || null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-deep)' }}>
      
      <div style={{
        ...(heroBg
          ? {
              backgroundImage: `linear-gradient(to bottom, rgba(10, 10, 10, 0.5), var(--bg-deep)), url(${heroBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : { backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-dark)' }),
        padding: '6rem 2rem 4rem', textAlign: 'center',
        transition: 'background 0.4s ease'
      }}>
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', fontSize: '3.5rem', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          {module.code}
        </h1>
        <p style={{ color: '#ffffff', fontSize: '1.2rem', marginTop: '1rem', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', fontFamily: 'var(--font-reading)' }}>
          {module.name}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', borderBottom: '1px solid var(--border-dark)', backgroundColor: 'var(--bg-surface)', transition: 'background-color 0.4s ease, border-color 0.4s ease' }}>
        <button 
          onClick={() => setActiveTab('quizzes')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'quizzes' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'quizzes' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <Swords size={20} /> Quizzes
        </button>
        
        <button 
          onClick={() => setActiveTab('notes')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'notes' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'notes' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <ScrollText size={20} /> Notes
        </button>

        <button 
          onClick={() => setActiveTab('collections')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'collections' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'collections' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <Library size={20} /> Collections
        </button>
      </div>
      
      <div style={{ flex: 1 }}>
        {activeTab === 'quizzes' && <QuizDisplayer moduleId={module.id} moduleShortName={module.code} />}
        {activeTab === 'notes' && <NoteDisplayer moduleId={module.id} />}
        {activeTab === 'collections' && <CollectionDisplayer />}
      </div>

    </div>
  );
};

export default ModuleView;
