import React, { useEffect, useState } from 'react';
import { Library, Lock, Globe, Heart, FileText, Download, ArrowLeft, Filter } from 'lucide-react';
import api from '../api';

const MyVault: React.FC = () => {
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- View State ---
  const [activeCollection, setActiveCollection] = useState<any | null>(null);
  const [collectionNotes, setCollectionNotes] = useState<any[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  // --- Filter State ---
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');

  useEffect(() => {
    fetchMyCollections();
  }, []);

  const fetchMyCollections = async () => {
    try {
      const res = await api.get('/library/collections/me');
      setCollections(res.data);
    } catch (error) {
      console.error("Failed to fetch vault", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openCollection = async (col: any) => {
    setActiveCollection(col);
    setIsLoadingNotes(true);
    try {
      let res;
      // ✨ THE MAGIC ROUTER: If it's the virtual favorites card, hit the favorites API!
      if (col.id === 'favorites') {
        res = await api.get('/library/notes/favorites/me');
      } else {
        res = await api.get(`/library/collections/${col.id}/notes`);
      }
      setCollectionNotes(res.data);
    } catch (error) {
      console.error("Failed to load scrolls", error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleDownload = async (noteId: number, title: string, ext: string) => {
    try {
      const res = await api.get(`/library/notes/download/${noteId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) { alert("This scroll is sealed or lost to time."); }
  };

  // --- 🔍 FILTER ENGINE ---
  const processedCollections = collections.filter(col => {
    if (visibilityFilter === 'public' && col.visibility !== 'public' && !col.is_special) return false;
    if (visibilityFilter === 'private' && col.visibility !== 'private') return false;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-deep)', color: 'var(--text-main)', padding: '4rem 2rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* --- HEADER --- */}
        <div style={{ borderBottom: '1px solid var(--border-dark)', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="brand-font" style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '2.5rem' }}>My Vault</h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Manage your personal archives and favorited scrolls.</p>
          </div>
          
          {activeCollection && (
            <button onClick={() => setActiveCollection(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: '1px solid var(--border-dark)', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
              <ArrowLeft size={18} /> Back to Vault
            </button>
          )}
        </div>

        {/* --- VIEW 1: THE GRID OF COLLECTIONS --- */}
        {!activeCollection ? (
          <>
            {/* The Filter Bar */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)', marginRight: '1rem' }}>
                <Filter size={20} /> <strong>Filter Vault</strong>
              </div>
              <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value as any)} className="auth-input" style={{ width: 'auto', padding: '0.4rem', margin: 0 }}>
                <option value="all">All Archives</option>
                <option value="private">Private Only</option>
                <option value="public">Public Only</option>
              </select>
            </div>

            {isLoading ? (
              <p style={{ color: 'var(--accent-gold)' }}>Unlocking the vaults...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {processedCollections.map(col => (
                  <div 
                    key={col.id} 
                    onClick={() => openCollection(col)}
                    style={{ 
                      border: col.is_special ? '2px solid #ff4d4d' : '1px solid var(--border-dark)', 
                      padding: '1.5rem', borderRadius: '8px', 
                      backgroundColor: col.is_special ? 'rgba(255, 77, 77, 0.05)' : 'rgba(15, 15, 15, 0.8)',
                      cursor: 'pointer', transition: 'transform 0.2s',
                      display: 'flex', flexDirection: 'column'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      {col.is_special ? <Heart size={28} color="#ff4d4d" fill="#ff4d4d" /> : <Library size={28} color="var(--accent-gold)" />}
                      <h3 style={{ margin: 0, color: '#fff', fontSize: '1.3rem' }}>{col.title}</h3>
                    </div>
                    
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1 }}>{col.description}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-dark)', paddingTop: '1rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{col.note_count} Scrolls</span>
                      
                      {col.visibility === 'private' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#ffb74d' }}><Lock size={14} /> Private</span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#4fc3f7' }}><Globe size={14} /> Public</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          
        /* --- VIEW 2: INSIDE A SPECIFIC COLLECTION --- */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              {activeCollection.is_special ? <Heart size={32} color="#ff4d4d" fill="#ff4d4d" /> : <Library size={32} color="var(--accent-gold)" />}
              <h2 style={{ margin: 0, color: '#fff' }}>{activeCollection.title}</h2>
            </div>

            {isLoadingNotes ? (
              <p style={{ color: 'var(--accent-gold)' }}>Retrieving scrolls...</p>
            ) : collectionNotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-dark)', borderRadius: '8px' }}>
                <FileText size={48} color="var(--border-dark)" style={{ marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>This archive is currently empty.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {collectionNotes.map(note => (
                  <div key={note.id} style={{ border: '1px solid var(--border-dark)', padding: '1.5rem', borderRadius: '8px', backgroundColor: 'rgba(15, 15, 15, 0.8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                        <FileText size={20} color="var(--accent-gold)" />
                        <h4 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.2rem' }}>{note.title}</h4>
                      </div>
                      <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>{note.description || "No description provided."}</p>
                    </div>
                    
                    <div>
                      <button onClick={() => handleDownload(note.id, note.title, note.file_type)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--accent-gold)', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        <Download size={18} /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default MyVault;