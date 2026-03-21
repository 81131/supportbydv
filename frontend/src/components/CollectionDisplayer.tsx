import React, { useEffect, useState } from 'react';
import { Library, DownloadCloud, Pin } from 'lucide-react'; // 👈 Removed 'Award'
import api from '../api';

const CollectionDisplayer: React.FC = () => {
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await api.get(`/library/collections/public`);
      setCollections(res.data);
    } catch (error) {
      console.error("Failed to load archives", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleZipDownload = async (collectionId: number, title: string) => {
    try {
      const res = await api.get(`/library/collections/${collectionId}/zip`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Archive.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Failed to compile the archive.");
    }
  };

  const sortedCollections = [...collections].sort((a, b) => Number(b.is_pinned || false) - Number(a.is_pinned || false));

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {isLoading ? (
        <p style={{ color: 'var(--accent-gold)' }}>Opening the vaults...</p>
      ) : sortedCollections.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-dark)', borderRadius: '8px' }}>
          <Library size={48} color="var(--border-dark)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No public archives have been curated yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {sortedCollections.map((col) => (
            <div key={col.id} style={{ 
              border: col.is_pinned ? '1px solid var(--accent-gold)' : '1px solid var(--border-dark)', 
              padding: '1.5rem', borderRadius: '8px', backgroundColor: 'rgba(15, 15, 15, 0.8)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Library size={24} color="var(--accent-gold)" />
                  <h3 style={{ margin: 0, color: '#fff' }}>{col.title}</h3>
                </div>
                {col.is_pinned && <Pin size={18} color="#ff4d4d" fill="#ff4d4d" style={{ transform: 'rotate(45deg)' }} />}
              </div>
              
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', minHeight: '40px' }}>
                {col.description || "A curated collection of scrolls."}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--border-dark)' }}>By {col.creator_name}</span>
                <button 
                  onClick={() => handleZipDownload(col.id, col.title)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1px solid var(--accent-gold)', color: 'var(--accent-gold)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <DownloadCloud size={16} /> Get ZIP
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollectionDisplayer;