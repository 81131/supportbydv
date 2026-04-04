import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, DownloadCloud, Trash2, Lock, Globe, FolderHeart } from 'lucide-react';
import api from '../api';

const MyVault: React.FC = () => {
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [flashMessage, setFlashMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const navigate = useNavigate();

  const showFlash = (message: string, type: 'success' | 'error' = 'success') => {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
  };

  useEffect(() => {
    fetchMyCollections();
  }, []);

  const fetchMyCollections = async () => {
    try {
      const res = await api.get(`/library/collections/me`);
      setCollections(res.data);
    } catch (error) { showFlash("Failed to open your vault.", 'error'); } 
    finally { setIsLoading(false); }
  };

  const handleZipDownload = async (collectionId: string | number, title: string) => {
    try {
      const res = await api.get(`/library/collections/${collectionId}/zip`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Archive.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) { showFlash("Failed to compile the archive.", 'error'); }
  };

  const handleVisibilityChange = async (collectionId: number, newVis: string) => {
    try {
      await api.put(`/library/collections/${collectionId}/visibility`, { visibility: newVis });
      setCollections(collections.map(c => c.id === collectionId ? { ...c, visibility: newVis } : c));
      showFlash("Archives visibility updated.");
    } catch (error) { showFlash("Failed to update visibility.", 'error'); }
  };

  const handleDelete = async (collectionId: number) => {
    if (window.confirm("Are you sure you want to burn this archive? All contained records will be unlinked (but not destroyed).")) {
      try {
        await api.delete(`/library/collections/${collectionId}`);
        setCollections(collections.filter(c => c.id !== collectionId));
        showFlash("Archive burned.");
      } catch (error) { showFlash("You do not have permission.", 'error'); }
    }
  };

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
      {flashMessage && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: flashMessage.type === 'success' ? '#2e7d32' : '#c62828', color: '#fff',
          padding: '1rem 2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem',
          animation: 'fadeInOut 3s ease-in-out'
        }}>
          {flashMessage.message}
        </div>
      )}

      <div style={{ textAlign: 'center', padding: '4rem 1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-dark)' }}>
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', fontSize: '3rem', margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
          <FolderHeart size={48} /> My Vault
        </h1>
        <p className="text-desc" style={{ marginTop: '1rem', fontSize: '1.2rem' }}>
          Your personal archives and collected scrolls.
        </p>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--accent-gold)', textAlign: 'center' }}>Unlocking your vault...</p>
      ) : collections.length === 0 ? (
        <div className="module-section" style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-dark)', borderRadius: '8px' }}>
          <Library size={64} color="var(--border-dark)" style={{ marginBottom: '1rem' }} />
          <p className="text-desc" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Your vault is empty.</p>
          <button onClick={() => navigate('/upload-note')} className="btn-solid-gold">
            Forge New Archives
          </button>
        </div>
      ) : (
        <div className="grid-view">
          {collections.map((col) => (
            <div key={col.id} className="item-card column">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Library size={24} color="var(--accent-gold)" />
                  <h3 className="text-title" style={{ margin: 0, fontSize: '1.4rem' }}>{col.title}</h3>
                </div>
                <button onClick={() => handleDelete(col.id)} className="btn-ghost-danger" title="Burn Archive">
                    <Trash2 size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                {col.visibility === 'private' ? <Lock size={16} color="var(--accent-red)" /> : <Globe size={16} color="var(--accent-blue, #42a5f5)" />}
                <select 
                  value={col.visibility} 
                  onChange={(e) => handleVisibilityChange(col.id, e.target.value)}
                  style={{ background: 'transparent', color: 'var(--text-main)', border: 'none', outline: 'none', fontSize: '1rem', cursor: 'pointer', flex: 1 }}
                >
                  <option value="private">Private Archive</option>
                  <option value="public">Public Archive</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-dark)', paddingTop: '1rem', marginTop: 'auto' }}>
                <span className="text-stat" style={{ fontSize: '1.1rem' }}>{col.note_count} Scrolls</span>
                <button onClick={() => handleZipDownload(col.id, col.title)} className="btn-ghost-gold" disabled={col.note_count === 0} style={{ opacity: col.note_count === 0 ? 0.5 : 1 }}>
                  <DownloadCloud size={18} /> Get ZIP
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyVault;