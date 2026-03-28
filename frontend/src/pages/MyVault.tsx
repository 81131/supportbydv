import React, { useEffect, useState } from 'react';
import { Library, Lock, Globe, Heart, FileText, Download, ArrowLeft, Filter } from 'lucide-react';
import api from '../api';

const MyVault: React.FC = () => {
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCollection, setActiveCollection] = useState<any | null>(null);
  const [collectionNotes, setCollectionNotes] = useState<any[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');

  useEffect(() => { fetchMyCollections(); }, []);

  const fetchMyCollections = async () => {
    try {
      const res = await api.get('/library/collections/me');
      setCollections(res.data);
    } catch (error) { console.error(error); } 
    finally { setIsLoading(false); }
  };

  const openCollection = async (col: any) => {
    setActiveCollection(col);
    setIsLoadingNotes(true);
    try {
      let res;
      if (col.id === 'favorites') res = await api.get('/library/notes/favorites/me');
      else res = await api.get(`/library/collections/${col.id}/notes`);
      setCollectionNotes(res.data);
    } catch (error) { console.error(error); } 
    finally { setIsLoadingNotes(false); }
  };

  const handleDownload = async (noteId: number, title: string, ext: string) => {
    try {
      const res = await api.get(`/library/notes/download/${noteId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', `${title}.${ext}`);
      document.body.appendChild(link); link.click(); link.remove();
    } catch (error) { alert("This scroll is sealed or lost to time."); }
  };

  const processedCollections = collections.filter(col => {
    if (visibilityFilter === 'public' && col.visibility !== 'public' && !col.is_special) return false;
    if (visibilityFilter === 'private' && col.visibility !== 'private') return false;
    return true;
  });

  return (
    <div className="page-container">
        
        <div style={{ borderBottom: '1px solid var(--border-dark)', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="brand-font" style={{ color: 'var(--accent-gold)', margin: 0, fontSize: '2.5rem' }}>My Vault</h1>
            <p className="text-desc" style={{ marginTop: '0.5rem' }}>Manage your personal archives and favorited scrolls.</p>
          </div>
          {activeCollection && (
            <button onClick={() => setActiveCollection(null)} className="btn-ghost">
              <ArrowLeft size={18} /> Back to Vault
            </button>
          )}
        </div>

        {!activeCollection ? (
          <>
            <div className="control-bar">
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
              <div className="grid-view">
                {processedCollections.map(col => (
                  <div key={col.id} onClick={() => openCollection(col)} className={`item-card column ${col.is_special ? 'special' : ''}`} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      {col.is_special ? <Heart size={28} color="var(--accent-red)" fill="var(--accent-red)" /> : <Library size={28} color="var(--accent-gold)" />}
                      <h3 className="text-title" style={{ fontSize: '1.3rem' }}>{col.title}</h3>
                    </div>
                    <p className="text-desc" style={{ flex: 1 }}>{col.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-dark)', paddingTop: '1rem' }}>
                      <span className="text-desc">{col.note_count} Scrolls</span>
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              {activeCollection.is_special ? <Heart size={32} color="var(--accent-red)" fill="var(--accent-red)" /> : <Library size={32} color="var(--accent-gold)" />}
              <h2 className="text-title" style={{ fontSize: '1.8rem' }}>{activeCollection.title}</h2>
            </div>

            {isLoadingNotes ? (
              <p style={{ color: 'var(--accent-gold)' }}>Retrieving scrolls...</p>
            ) : collectionNotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-dark)', borderRadius: '8px' }}>
                <FileText size={48} color="var(--border-dark)" style={{ marginBottom: '1rem' }} />
                <p className="text-desc">This archive is currently empty.</p>
              </div>
            ) : (
              <div className="list-view">
                {collectionNotes.map(note => (
                  <div key={note.id} className="item-card row">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                        <FileText size={20} color="var(--accent-gold)" />
                        <h4 className="text-title">{note.title}</h4>
                      </div>
                      <p className="text-desc">{note.description || "No description provided."}</p>
                    </div>
                    <button onClick={() => handleDownload(note.id, note.title, note.file_type)} className="btn-solid-gold">
                      <Download size={18} /> Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default MyVault;