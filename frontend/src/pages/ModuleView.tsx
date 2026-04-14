import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuizDisplayer from '../components/QuizDisplayer';
import NoteDisplayer from '../components/NoteDisplayer';
import CollectionDisplayer from '../components/CollectionDisplayer';
import VideoDisplayer from '../components/VideoDisplayer';
import { Swords, ScrollText, Library, Settings, MonitorPlay } from 'lucide-react';
import api, { API_BASE_URL } from '../api';
import { AdWrapper } from '../components/AdWrapper';
import ossaBg from '../assets/Ned_Stark_OSSA-bg.jpg';
import wmtBg from '../assets/dragonglass_cave-WMT-bg.avif';
import psBg from '../assets/Tyrion_PS-bg.avif';

type TabType = 'quizzes' | 'notes' | 'collections' | 'videos';

const ModuleView: React.FC = () => {
  const { moduleId, tab } = useParams<{ moduleId: string; tab?: string }>();
  const navigate = useNavigate();
  const [module, setModule] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>((tab as TabType) || 'quizzes');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));

    const fetchModule = async () => {
      try {
        const res = await api.get('/modules');
        const found = res.data.find((m: any) => m.id === parseInt(moduleId || '0'));
        setModule(found);
        if (found) {
          document.title = `${found.code} | Citadel`;
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchModule();
  }, [moduleId]);

  // Sync tab to URL
  useEffect(() => {
    if (tab && (tab === 'quizzes' || tab === 'notes' || tab === 'collections')) {
      setActiveTab(tab as TabType);
    }
  }, [tab]);

  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    navigate(`/module/${moduleId}/${newTab}`, { replace: true });
  };

  if (isLoading) return <div className="page-container text-title">Consulting the Grand Library...</div>;
  if (!module) return <div className="page-container text-title">Module not found in the archives.</div>;

  const moduleBgMap: Record<string, string> = {
    OSSA: ossaBg,
    WMT: wmtBg,
    PS: psBg,
  };
  const heroBg = module.banner_image_url ? `${API_BASE_URL}${module.banner_image_url}` : (moduleBgMap[module.code] || null);
  const semesterKey = `Y${module.year}S${module.semester}`;

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
        padding: '6rem 2rem 4rem', textAlign: 'center', position: 'relative',
        transition: 'background 0.4s ease'
      }}>
        {user && (user.role === 'admin' || user.role === 'noOne') && (
          <button 
            onClick={() => navigate(`/edit-module/${module.id}`)} 
            className="btn-solid-gold" 
            style={{ position: 'absolute', top: '2rem', right: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}
          >
            <Settings size={16} /> Revise Settings
          </button>
        )}
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', fontSize: '3.5rem', margin: 0, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          {module.code}
        </h1>
        <p style={{ color: '#ffffff', fontSize: '1.2rem', marginTop: '1rem', textShadow: '2px 2px 4px rgba(0,0,0,0.8)', fontFamily: 'var(--font-reading)' }}>
          {module.name}
        </p>
        {module.module_phrase && (
          <p style={{ color: 'var(--accent-gold)', fontSize: '1rem', fontStyle: 'italic', marginTop: '0.5rem', textShadow: '1px 1px 2px rgba(0,0,0,0.8)', fontFamily: 'var(--font-reading)' }}>
            "{module.module_phrase}"
          </p>
        )}
      </div>

      <AdWrapper semesterKey={semesterKey}>
        <div style={{ display: 'flex', justifyContent: 'center', borderBottom: '1px solid var(--border-dark)', backgroundColor: 'var(--bg-surface)', transition: 'background-color 0.4s ease, border-color 0.4s ease' }}>
        <button 
          onClick={() => handleTabChange('quizzes')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'quizzes' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'quizzes' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <Swords size={20} /> Quizzes
        </button>
        
        <button 
          onClick={() => handleTabChange('notes')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'notes' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'notes' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <ScrollText size={20} /> Notes
        </button>

        <button 
          onClick={() => handleTabChange('collections')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'collections' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'collections' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <Library size={20} /> Collections
        </button>

        <button 
          onClick={() => handleTabChange('videos')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'videos' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'videos' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <MonitorPlay size={20} /> Videos
        </button>
      </div>
      
      <div style={{ flex: 1 }}>
        {activeTab === 'quizzes' && <QuizDisplayer moduleId={module.id} moduleShortName={module.code} />}
        {activeTab === 'notes' && <NoteDisplayer moduleId={module.id} />}
        {activeTab === 'collections' && <CollectionDisplayer moduleId={module.id} />}
        {activeTab === 'videos' && <VideoDisplayer moduleId={module.id} user={user} />}
      </div>
    </AdWrapper>
  </div>
  );
};

export default ModuleView;
