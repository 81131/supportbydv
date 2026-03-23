import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Heart, FolderPlus, Trash2, Pin, VenetianMask, BadgeCheck, Award, Filter, X, Plus} from 'lucide-react';
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

  // --- ✨ NEW: BULK SELECTION STATE ---
  const [selectedNotes, setSelectedNotes] = useState<number[]>([]);

  // --- COLLECTION MODAL STATE ---
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

  // --- ✨ NEW: BULK TOGGLE LOGIC ---
  const toggleNoteSelection = (noteId: number) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]
    );
  };

  const openCollectionModal = async (noteId: number | null = null) => {
    // If noteId is null, it means we are doing a bulk add from the top button!
    setActiveNoteForCollection(noteId);
    try {
      const res = await api.get('/library/collections/me');
      setMyCollections(res.data);
    } catch (err) { console.error(err); }
  };

  // --- ✨ NEW: BATCH UPLOAD LOGIC ---
  const handleAddToCollection = async (collectionId: number) => {
    try {
      // Determine if we are saving one specific note, or the whole bulk array
      const notesToSave = activeNoteForCollection ? [activeNoteForCollection] : selectedNotes;
      
      // Execute all saves concurrently
      await Promise.all(notesToSave.map(id => 
        api.post(`/library/collections/${collectionId}/notes/${id}`)
      ));

      alert(`Successfully added ${notesToSave.length} scroll(s) to the archive!`);
      setActiveNoteForCollection(null); 
      setSelectedNotes([]); // Clear selections after success
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

  // Governance & Utils...
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
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%', position: 'relative' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        
        {/* ✨ NEW: BULK ACTION BUTTON */}
        <div>
          {selectedNotes.length > 0 && (
            <button onClick={() => openCollectionModal(null)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-gold)', color: '#000', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              <FolderPlus size={18} /> Save {selectedNotes.length} Selected to Archive
            </button>
          )}
        </div>

        <button onClick={() => navigate('/upload-note')} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} /> Forge New Scroll
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', backgroundColor: 'rgba(0,0,0,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-dark)', marginBottom: '2rem', alignItems: 'center' }}>
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
            <VenetianMask size={16} color="#b39ddb" /> By No One
          </label>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--accent-gold)' }}>Searching the library...</p>
      ) : processedNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-dark)', borderRadius: '8px' }}>
          <FileText size={48} color="var(--border-dark)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No scrolls match your current filters.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {processedNotes.map((note) => {
            const role = String(note.creator_role).replace('UserRole.', '');
            const isNoOne = role === 'noOne' || role === 'NO_ONE';
            const isVerified = role === 'verified' || role === 'VERIFIED' || role === 'admin' || role === 'ADMIN' || isNoOne;
            const canDelete = currentUser?.id === note.uploader_id || currentUser?.role === 'admin' || currentUser?.role === 'noOne';

            return (
              <div key={note.id} style={{ 
                border: note.is_pinned ? '1px solid var(--accent-gold)' : (note.is_recommended ? '1px solid var(--accent-gold)' : '1px solid var(--border-dark)'), 
                padding: '1.5rem', borderRadius: '8px', 
                backgroundColor: note.is_recommended ? 'rgba(255, 215, 0, 0.05)' : 'var(--bg-surface)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  
                  {/* ✨ NEW: THE CHECKBOX */}
                  <input 
                    type="checkbox" 
                    checked={selectedNotes.includes(note.id)}
                    onChange={() => toggleNoteSelection(note.id)}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--accent-gold)', marginTop: '0.2rem', cursor: 'pointer' }}
                  />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                      <FileText size={20} color="var(--accent-gold)" />
                      <h4 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-reading)' }}>{note.title}</h4>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {note.is_recommended && <span title="Recommended"><Award size={18} color="var(--accent-gold)" /></span>}
                        {isNoOne && <span title="Forged by No One"><VenetianMask size={18} color="#b39ddb" /></span>}
                        {isVerified && <span title="Verified Scholar"><BadgeCheck size={18} color="#4caf50" /></span>}
                        {note.is_pinned && <span title="Pinned"><Pin size={18} color="#ff4d4d" fill="#ff4d4d" style={{ transform: 'rotate(45deg)' }} /></span>}
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', fontFamily: 'var(--font-reading)' }}>{note.description}</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  
                  {currentUser?.role === 'noOne' && (
                    <div style={{ display: 'flex', gap: '0.5rem', borderRight: '1px solid var(--border-dark)', paddingRight: '0.8rem' }}>
                      <button onClick={() => handleRecommendToggle(note.id, note.is_recommended)} style={{ background: 'transparent', border: `1px solid ${note.is_recommended ? 'var(--accent-gold)' : 'var(--text-muted)'}`, color: note.is_recommended ? 'var(--accent-gold)' : 'var(--text-muted)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Award size={16} /> {note.is_recommended ? 'Revoke' : 'Recommend'}
                      </button>
                      <button onClick={() => handlePinToggle(note.id, note.is_pinned)} style={{ background: 'transparent', border: `1px solid ${note.is_pinned ? '#ff4d4d' : 'var(--text-muted)'}`, color: note.is_pinned ? '#ff4d4d' : 'var(--text-muted)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Pin size={16} style={{ transform: note.is_pinned ? 'rotate(45deg)' : 'none' }} /> {note.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                    </div>
                  )}

                  {canDelete && (
                    <button onClick={() => handleDelete(note.id)} title="Burn Scroll" style={{ background: 'transparent', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  )}
                  
                  <button onClick={() => handleFavoriteToggle(note.id)} title={note.is_favorited ? "Remove from Favorites" : "Favorite"} style={{ background: 'transparent', border: '1px solid var(--border-dark)', color: note.is_favorited ? '#ff4d4d' : 'var(--text-muted)', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <Heart size={18} fill={note.is_favorited ? "#ff4d4d" : "transparent"} />
                  </button>
                  
                  <button onClick={() => openCollectionModal(note.id)} title="Add to Archive" style={{ background: 'transparent', border: '1px solid var(--border-dark)', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                    <FolderPlus size={18} />
                  </button>
                  
                  <button onClick={() => handleDownload(note.id, note.title, note.file_type)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--accent-gold)', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    <Download size={18} /> Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- 📁 THE "SAVE TO ARCHIVE" MODAL OVERLAY --- */}
      {(activeNoteForCollection !== null || selectedNotes.length > 0 && activeNoteForCollection === null) && myCollections && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-dark)', borderRadius: '8px', padding: '2rem', width: '100%', maxWidth: '400px', position: 'relative' }}>
            
            <button onClick={() => { setActiveNoteForCollection(null); setIsCreatingCol(false); }} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>

            <h2 className="brand-font" style={{ color: 'var(--accent-gold)', marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderPlus size={24} /> {activeNoteForCollection ? "Save to Archive" : `Save ${selectedNotes.length} Scrolls`}
            </h2>

            {myCollections.length > 0 && !isCreatingCol && (
              <div style={{ display: 'grid', gap: '0.8rem', marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {myCollections.map(col => (
                  <button key={col.id} onClick={() => handleAddToCollection(col.id)} style={{ padding: '1rem', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border-dark)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{col.title}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.2rem 0.5rem', border: '1px solid var(--border-dark)', borderRadius: '12px' }}>{col.visibility}</span>
                  </button>
                ))}
              </div>
            )}

            {!isCreatingCol ? (
              <button onClick={() => setIsCreatingCol(true)} style={{ width: '100%', padding: '1rem', background: 'transparent', border: '1px dashed var(--accent-gold)', color: 'var(--accent-gold)', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} /> Forge a New Archive
              </button>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Archive Name</label>
                  <input type="text" value={newColTitle} onChange={e => setNewColTitle(e.target.value)} className="auth-input" placeholder="e.g., Exam Prep" autoFocus />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Visibility</label>
                  <select value={newColVis} onChange={e => setNewColVis(e.target.value)} className="auth-input" style={{ width: '100%' }}>
                    <option value="private">Private (Only you)</option>
                    <option value="public">Public (Shared with the realm)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button onClick={() => setIsCreatingCol(false)} style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--border-dark)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleCreateCollection} disabled={!newColTitle} style={{ flex: 1, padding: '0.8rem', background: 'var(--accent-gold)', border: 'none', color: '#000', borderRadius: '4px', cursor: !newColTitle ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Forge & Save</button>
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