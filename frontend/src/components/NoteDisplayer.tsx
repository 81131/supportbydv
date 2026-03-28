import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Heart, FolderPlus, Trash2, Pin, VenetianMask, BadgeCheck, Award, Filter, X, Plus } from 'lucide-react';
import api from '../api';

interface NoteDisplayerProps {
  moduleId: number;
}

const NoteDisplayer: React.FC<NoteDisplayerProps> = ({ moduleId }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const [sortOrder, setSortOrder] = useState<'newest' | 'nameAsc' | 'nameDesc'>('newest');
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterRecommended, setFilterRecommended] = useState(false);
  const [filterNoOne, setFilterNoOne] = useState(false);

  const [selectedNotes, setSelectedNotes] = useState<number[]>([]);

  const [activeNoteForCollection, setActiveNoteForCollection] = useState<number | null>(null);
  const [myCollections, setMyCollections] = useState<any[]>([]);
  const [newColTitle, setNewColTitle] = useState('');
  const [newColVis, setNewColVis] = useState('private');
  const [isCreatingCol, setIsCreatingCol] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { fetchNotes(); }, [moduleId]);

  const fetchNotes = async () => {
    try {
      const res = await api.get(`/library/notes/module/${moduleId}`);
      setNotes(res.data);
    } catch (error) { console.error(error); } 
    finally { setIsLoading(false); }
  };

  const handleFavoriteToggle = async (noteId: number) => {
    try {
      const res = await api.post(`/library/notes/${noteId}/favorite`);
      setNotes(notes.map(n => n.id === noteId ? { ...n, is_favorited: res.data.is_favorited } : n));
    } catch (error) { console.error(error); }
  };

  const toggleNoteSelection = (noteId: number) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]
    );
  };

  const openCollectionModal = async (noteId: number | null = null) => {
    setActiveNoteForCollection(noteId);
    try {
      const res = await api.get('/library/collections/me');
      setMyCollections(res.data);
    } catch (err) { console.error(err); }
  };

  const handleAddToCollection = async (collectionId: number) => {
    try {
      const notesToSave = activeNoteForCollection ? [activeNoteForCollection] : selectedNotes;
      await Promise.all(notesToSave.map(id => 
        api.post(`/library/collections/${collectionId}/notes/${id}`)
      ));
      alert(`Successfully added ${notesToSave.length} scroll(s) to the archive!`);
      setActiveNoteForCollection(null); 
      setSelectedNotes([]); 
    } catch (err) { alert("Failed to add some scrolls."); }
  };

  const handleCreateCollection = async () => {
    if (!newColTitle) return;
    try {
      const res = await api.post('/library/collections', { title: newColTitle, visibility: newColVis });
      await handleAddToCollection(res.data.id);
      setNewColTitle('');
      setIsCreatingCol(false);
    } catch (err) { alert("Failed to forge archive."); }
  };

  const handlePinToggle = async (noteId: number, currentStatus: boolean) => {
    try {
      await api.put(`/library/notes/${noteId}/governance`, { is_pinned: !currentStatus });
      setNotes(notes.map(n => n.id === noteId ? { ...n, is_pinned: !currentStatus } : n));
    } catch (error) { alert("Only No One can pin a scroll."); }
  };

  const handleRecommendToggle = async (noteId: number, currentStatus: boolean) => {
    try {
      await api.put(`/library/notes/${noteId}/governance`, { is_recommended: !currentStatus });
      setNotes(notes.map(n => n.id === noteId ? { ...n, is_recommended: !currentStatus } : n));
    } catch (error) { alert("Only No One can bestow this honor."); }
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

  const handleDelete = async (noteId: number) => {
    if (window.confirm("Are you sure you want to burn this scroll?")) {
      try {
        await api.delete(`/library/notes/${noteId}`);
        setNotes(notes.filter(n => n.id !== noteId)); 
      } catch (error) { alert("You do not have permission."); }
    }
  };

  const processedNotes = notes.filter(note => {
    const role = String(note.creator_role).replace('UserRole.', '');
    const isNoOne = role === 'noOne' || role === 'NO_ONE';
    const isVerified = role === 'verified' || role === 'VERIFIED' || role === 'admin' || role === 'ADMIN' || isNoOne;

    if (filterVerified && !isVerified) return false;
    if (filterRecommended && !note.is_recommended) return false;
    if (filterNoOne && !isNoOne) return false;
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'nameAsc') return a.title.localeCompare(b.title);
    if (sortOrder === 'nameDesc') return b.title.localeCompare(a.title);
    return b.id - a.id; 
  }).sort((a, b) => Number(b.is_pinned || false) - Number(a.is_pinned || false)); 

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div>
          {selectedNotes.length > 0 && (
            <button onClick={() => openCollectionModal(null)} className="btn-solid-gold">
              <FolderPlus size={18} /> Save {selectedNotes.length} Selected to Archive
            </button>
          )}
        </div>

        <button onClick={() => navigate('/upload-note')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} /> Forge New Scroll
        </button>
      </div>

      <div className="control-bar">
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
            <VenetianMask size={16} color="var(--accent-purple, #b39ddb)" /> By No One
          </label>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--accent-gold)' }}>Searching the library...</p>
      ) : processedNotes.length === 0 ? (
        <div className="module-section" style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-dark)', borderRadius: '8px' }}>
          <FileText size={48} color="var(--border-dark)" style={{ marginBottom: '1rem' }} />
          <p className="text-desc">No scrolls match your current filters.</p>
        </div>
      ) : (
        <div className="list-view">
          {processedNotes.map((note) => {
            const role = String(note.creator_role).replace('UserRole.', '');
            const isNoOne = role === 'noOne' || role === 'NO_ONE';
            const isVerified = role === 'verified' || role === 'VERIFIED' || role === 'admin' || role === 'ADMIN' || isNoOne;
            const canDelete = currentUser?.id === note.uploader_id || currentUser?.role === 'admin' || currentUser?.role === 'noOne';

            return (
              <div key={note.id} className={`item-card row ${note.is_recommended ? 'recommended' : ''} ${note.is_pinned && !note.is_recommended ? 'pinned' : ''}`}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  
                  <input 
                    type="checkbox" 
                    checked={selectedNotes.includes(note.id)}
                    onChange={() => toggleNoteSelection(note.id)}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)', marginTop: '0.2rem', cursor: 'pointer' }}
                  />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                      <FileText size={20} color="var(--accent-gold)" />
                      <h4 className="text-title">{note.title}</h4>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {note.is_recommended && <span title="Recommended"><Award size={18} color="var(--accent-gold)" /></span>}
                        {isNoOne && <span title="Forged by No One"><VenetianMask size={18} color="var(--accent-purple, #b39ddb)" /></span>}
                        {isVerified && <span title="Verified Scholar"><BadgeCheck size={18} color="#4caf50" /></span>}
                        {note.is_pinned && <span title="Pinned"><Pin size={18} color="var(--accent-red)" fill="var(--accent-red)" style={{ transform: 'rotate(45deg)' }} /></span>}
                      </div>
                    </div>
                    <p className="text-desc">{note.description}</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  
                  {currentUser?.role === 'noOne' && (
                    <div style={{ display: 'flex', gap: '0.5rem', borderRight: '1px solid var(--border-dark)', paddingRight: '0.8rem' }}>
                      <button onClick={() => handleRecommendToggle(note.id, note.is_recommended)} className="btn-ghost" style={{ borderColor: note.is_recommended ? 'var(--accent-gold)' : '', color: note.is_recommended ? 'var(--accent-gold)' : '' }}>
                        <Award size={16} /> {note.is_recommended ? 'Revoke' : 'Recommend'}
                      </button>
                      <button onClick={() => handlePinToggle(note.id, note.is_pinned)} className="btn-ghost" style={{ borderColor: note.is_pinned ? 'var(--accent-red)' : '', color: note.is_pinned ? 'var(--accent-red)' : '' }}>
                        <Pin size={16} style={{ transform: note.is_pinned ? 'rotate(45deg)' : 'none' }} /> {note.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                    </div>
                  )}

                  {canDelete && (
                    <button onClick={() => handleDelete(note.id)} title="Burn Scroll" className="btn-ghost-danger"><Trash2 size={18} /></button>
                  )}
                  
                  <button onClick={() => handleFavoriteToggle(note.id)} title={note.is_favorited ? "Remove from Favorites" : "Favorite"} className="btn-ghost" style={{ borderColor: note.is_favorited ? 'var(--accent-red)' : '', color: note.is_favorited ? 'var(--accent-red)' : '' }}>
                    <Heart size={18} fill={note.is_favorited ? "var(--accent-red)" : "transparent"} />
                  </button>
                  
                  <button onClick={() => openCollectionModal(note.id)} title="Add to Archive" className="btn-ghost"><FolderPlus size={18} /></button>
                  
                  <button onClick={() => handleDownload(note.id, note.title, note.file_type)} className="btn-solid-gold">
                    <Download size={18} /> Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- 📁 THE "SAVE TO ARCHIVE" MODAL OVERLAY --- */}
      {(activeNoteForCollection !== null || (selectedNotes.length > 0 && activeNoteForCollection === null)) && myCollections && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="modal-box">
            
            <button onClick={() => { setActiveNoteForCollection(null); setIsCreatingCol(false); }} className="close-btn">
              <X size={24} />
            </button>

            <h2 className="brand-font" style={{ color: 'var(--accent-gold)', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderPlus size={24} /> {activeNoteForCollection ? "Save to Archive" : `Save ${selectedNotes.length} Scrolls`}
            </h2>

            {myCollections.length > 0 && !isCreatingCol && (
              <div style={{ display: 'grid', gap: '0.8rem', marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {myCollections.map(col => (
                  <button key={col.id} onClick={() => handleAddToCollection(col.id)} className="modal-item-btn">
                    <span>{col.title}</span>
                    <span className="text-desc" style={{ padding: '0.2rem 0.5rem', border: '1px solid var(--border-dark)', borderRadius: '12px' }}>{col.visibility}</span>
                  </button>
                ))}
              </div>
            )}

            {!isCreatingCol ? (
              <button onClick={() => setIsCreatingCol(true)} className="btn-ghost-gold" style={{ width: '100%', justifyContent: 'center' }}>
                <Plus size={18} /> Forge a New Archive
              </button>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem' }}>Archive Name</label>
                  <input type="text" value={newColTitle} onChange={e => setNewColTitle(e.target.value)} className="auth-input" placeholder="e.g., Exam Prep" autoFocus />
                </div>
                <div>
                  <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem' }}>Visibility</label>
                  <select value={newColVis} onChange={e => setNewColVis(e.target.value)} className="auth-input" style={{ width: '100%' }}>
                    <option value="private">Private (Only you)</option>
                    <option value="public">Public (Shared with the realm)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button onClick={() => setIsCreatingCol(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                  <button onClick={handleCreateCollection} disabled={!newColTitle} className="btn-solid-gold" style={{ flex: 1, justifyContent: 'center', opacity: !newColTitle ? 0.5 : 1 }}>Forge & Save</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default NoteDisplayer;