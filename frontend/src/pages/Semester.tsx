import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import ossaBg from '../assets/OSSA-bg.webp';
import wmtBg from '../assets/WMT-bg.webp';
import psBg from '../assets/PS-bg.webp';
import { AdWrapper } from '../components/AdWrapper';

import { API_BASE_URL } from '../api';

const Semester: React.FC = () => {
  const { semesterKey } = useParams<{ semesterKey: string }>();
  const [modules, setModules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await api.get('/modules');
        const match = semesterKey?.match(/Y(\d)S(\d)/);
        if (match) {
          const year = parseInt(match[1]);
          const sem = parseInt(match[2]);
          const filtered = res.data.filter((m: any) => m.year === year && m.semester === sem);
          setModules(filtered);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchModules();
  }, [semesterKey]);

  if (isLoading) return <div className="page-container text-title">Consulting the Grand Library...</div>;

  const moduleBgMap: Record<string, string> = {
    OSSA: ossaBg,
    WMT: wmtBg,
    PS: psBg,
  };

  return (
    <AdWrapper semesterKey={semesterKey}>
      <div className="page-container">
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', textAlign: 'center', marginTop: '2rem' }}>
        {semesterKey} Archives
      </h1>
      <p className="text-desc" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        "Every module is a brick in the wall of your knowledge."
      </p>

      {modules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No modules have been forged for this semester yet.
        </div>
      ) : (
        <div className="modules-grid">
          {modules.map(mod => (
            <Link key={mod.id} to={`/module/${mod.id}`} style={{ textDecoration: 'none' }}>
              <div
                className="module-card"
                style={mod.card_image_url ? { backgroundImage: `url(${API_BASE_URL}${mod.card_image_url})` } : (moduleBgMap[mod.code] ? { backgroundImage: `url(${moduleBgMap[mod.code]})` } : {})}
              >
                <h2 className="brand-font">{mod.code}</h2>
                <p>{mod.name}</p>
                {mod.module_phrase && <p style={{ fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.5rem', color: 'var(--accent-gold)' }}>{mod.module_phrase}</p>}
              </div>
            </Link>
          ))}
        </div>
        )}
      </div>
    </AdWrapper>
  );
};

export default Semester;
