import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FileText, Download, Heart, FolderPlus, Trash2, Pin, VenetianMask, BadgeCheck, Award, Filter, X, Plus, Upload, BookOpen } from 'lucide-react';
import api from '../api';
import PdfViewer from './PdfViewer';

interface NoteDisplayerProps {
  moduleId: number;
}

const NoteDisplayer: React.FC<NoteDisplayerProps> = ({ moduleId }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [pdfNote, setPdfNote] = useState<{ id: number; title: string } | null>(null);

  const [sortOrder, setSortOrder] = useState<'newest' | 'nameAsc' | 'nameDesc'>('newest');
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterRecommended, setFilterRecommended] = useState(false);
  const [filterNoOne, setFilterNoOne] = useState(false);
  const [filterMyUploads, setFilterMyUploads] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialUnitId = searchParams.get('unitId') || '';
  const initialTopicId = searchParams.get('topicId') || '';

  const [filterUnit, setFilterUnit] = useState<string>(initialUnitId);
  const [filterTopic, setFilterTopic] = useState<string>(initialTopicId);
  
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [availableTopics, setAvailableTopics] = useState<any[]>([]);

  const [selectedNotes, setSelectedNotes] = useState<number[]>([]);

  const [activeNoteForCollection, setActiveNoteForCollection] = useState<number | null>(null);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [myCollections, setMyCollections] = useState<any[]>([]);
  const [newColTitle, setNewColTitle] = useState('');
  const [newColVis, setNewColVis] = useState('private');
  const [newColYear, setNewColYear] = useState(2);
  const [newColSem, setNewColSem] = useState(2);
  const [newColMod, setNewColMod] = useState<number | ''>(moduleId);
  const [isCreatingCol, setIsCreatingCol] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const [flashMessage, setFlashMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [allModules, setAllModules] = useState<any[]>([]);

  const showFlash = (message: string, type: 'success' | 'error' = 'success') => {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
  };

  useEffect(() => {
    api.get(`/modules/${moduleId}/units-with-topics`).then(res => setAvailableUnits(res.data)).catch(console.error);
  }, [moduleId]);

  useEffect(() => {
    if (filterUnit) {
      const unit = availableUnits.find(u => u.id === Number(filterUnit));
      setAvailableTopics(unit ? unit.topics : []);
    } else {
      setAvailableTopics([]);
    }
  }, [filterUnit, availableUnits]);

  useEffect(() => { fetchNotes(); }, [moduleId, filterUnit, filterTopic, filterRecommended]);

  useEffect(() => {
    // Fetch all modules for the collection module dropdown
    api.get('/modules').then(res => setAllModules(res.data)).catch(console.error);
  }, []);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterUnit) query.append('unitId', filterUnit);
      if (filterTopic) query.append('topicId', filterTopic);
      if (filterRecommended) query.append('recommended', 'true');

      const res = await api.get(`/library/notes/module/${moduleId}?${query.toString()}`);
      setNotes(res.data);
      
      // Update URL silently
      setSearchParams(query, { replace: true });
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
    setIsCollectionModalOpen(true);
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
      showFlash(`Successfully added ${notesToSave.length} scroll(s) to the archive!`);
      setActiveNoteForCollection(null); 
      setSelectedNotes([]); 
      setIsCollectionModalOpen(false);
    } catch (err) { showFlash("Failed to add some scrolls.", 'error'); }
  };

  const handleCreateCollection = async () => {
    if (!newColTitle) return;
    try {
      const res = await api.post('/library/collections', { 
        title: newColTitle, 
        visibility: newColVis,
        year: newColYear,
        semester: newColSem,
        module_id: newColMod ? Number(newColMod) : null
      });
      await handleAddToCollection(res.data.id);
      setNewColTitle('');
      setIsCreatingCol(false);
    } catch (err) { showFlash("Failed to forge archive.", 'error'); }
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
      showFlash(!currentStatus ? "Scroll recommended!" : "Recommendation removed.");
    } catch (error) { showFlash("Only No One can bestow this honor.", 'error'); }
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
    } catch (error) { showFlash("This scroll is sealed or lost to time.", 'error'); }
  };

  const openNote = (note: any) => {
    if (note.file_type === 'pdf') {
      setPdfNote({ id: note.id, title: note.title });
    } else {
      handleDownload(note.id, note.title, note.file_type || 'file');
    }
  };

  const handleDelete = async (noteId: number) => {
    if (window.confirm("Are you sure you want to burn this scroll?")) {
      try {
        await api.delete(`/library/notes/${noteId}`);
        setNotes(notes.filter(n => n.id !== noteId));
        showFlash("Scroll burned.");
      } catch (error) { showFlash("You do not have permission.", 'error'); }
    }
  };

  const processedNotes = notes.filter(note => {
    const role = String(note.creator_role).replace('UserRole.', '');
    const isNoOne = role === 'noOne' || role === 'NO_ONE';
    const isVerified = role === 'verified' || role === 'VERIFIED' || role === 'admin' || role === 'ADMIN' || isNoOne;

    if (filterVerified && !isVerified) return false;
    if (filterNoOne && !isNoOne) return false;
    if (filterMyUploads && note.uploader_id !== currentUser?.id) return false;
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'nameAsc') return a.title.localeCompare(b.title);
    if (sortOrder === 'nameDesc') return b.title.localeCompare(a.title);
    return b.id - a.id; 
  }).sort((a, b) => Number(b.is_pinned || false) - Number(a.is_pinned || false)); 

  return (
    <div className="page-container" style={{ position: 'relative' }}>

      {/* PDF Viewer Modal */}
      {pdfNote && (
        <PdfViewer
          noteId={pdfNote.id}
          title={pdfNote.title}
          onClose={() => setPdfNote(null)}
        />
      )}
      
      {flashMessage && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: flashMessage.type === 'success' ? '#2e7d32' : '#c62828', color: '#fff',
          padding: '1rem 2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          {flashMessage.message}
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div>
          {selectedNotes.length > 0 && (
            <button onClick={() => openCollectionModal(null)} className="btn-solid-gold">
              <FolderPlus size={18} /> Save {selectedNotes.length} Selected to Archive
            </button>
          )}
        </div>

        <button onClick={() => navigate(`/upload-note?moduleId=${moduleId}`)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} /> Forge New Scroll
        </button>
      </div>

      <div className="control-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)' }}>
          <Filter size={20} /> <strong style={{ marginRight: '1rem' }}>Filter Archives</strong>
        </div>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="auth-input" style={{ width: 'auto', padding: '0.4rem', margin: 0, fontSize: '0.9rem' }}>
          <option value="newest">Last Updated</option>
          <option value="nameAsc">Name (A-Z)</option>
          <option value="nameDesc">Name (Z-A)</option>
        </select>
        
        <select value={filterUnit} onChange={(e) => { setFilterUnit(e.target.value); setFilterTopic(''); }} className="auth-input" style={{ width: 'auto', padding: '0.4rem', margin: 0, fontSize: '0.9rem' }}>
           <option value="">All Units</option>
           {availableUnits.map(u => <option key={u.id} value={u.id}>{u.unit_identifier} - {u.name}</option>)}
        </select>

        {filterUnit && (
          <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)} className="auth-input" style={{ width: 'auto', padding: '0.4rem', margin: 0, fontSize: '0.9rem' }}>
            <option value="">All Topics</option>
            {availableTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}

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
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-gold)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
            <input type="checkbox" checked={filterMyUploads} onChange={e => setFilterMyUploads(e.target.checked)} style={{ accentColor: 'var(--accent-gold)' }}/>
            <Upload size={16} color="var(--accent-gold)" /> My Uploads
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

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <FileText size={20} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
                      {/* Clickable title */}
                      <button
                        onClick={() => openNote(note)}
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          color: 'var(--text-primary)', textAlign: 'left', fontWeight: 700,
                          fontSize: '1rem', fontFamily: 'inherit',
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-gold)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                        title={note.file_type === 'pdf' ? 'Read online' : 'Download'}
                      >
                        {note.title}
                      </button>
                      {/* READ ONLINE badge for PDFs */}
                      {note.file_type === 'pdf' && (
                        <span style={{
                          fontSize: '0.68rem', background: 'rgba(212,175,55,0.12)', color: 'var(--accent-gold)',
                          border: '1px solid rgba(212,175,55,0.3)', borderRadius: '4px', padding: '1px 6px',
                          flexShrink: 0,
                        }}>
                          READ ONLINE
                        </span>
                      )}
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {note.is_recommended && <span title="Recommended"><Award size={18} color="var(--accent-gold)" /></span>}
                        {isNoOne && <span title="Forged by No One"><VenetianMask size={18} color="var(--accent-purple, #b39ddb)" /></span>}
                        {isVerified && <span title="Verified Scholar"><BadgeCheck size={18} color="#4caf50" /></span>}
                        {note.is_pinned && <span title="Pinned"><Pin size={18} color="var(--accent-red)" fill="var(--accent-red)" style={{ transform: 'rotate(45deg)' }} /></span>}
                      </div>
                    </div>
                    <p className="text-desc" style={{ marginBottom: '0.4rem' }}>{note.description}</p>
                    <p className="text-desc" style={{ fontSize: '0.85rem' }}>
                      Forged by: <Link to={`/user/${note.uploader_id}`} style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600 }}>{note.uploader_name}</Link>
                    </p>
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

                  {/* Read Online button for PDFs */}
                  {note.file_type === 'pdf' && (
                    <button onClick={() => openNote(note)} className="btn-ghost" title="Read online">
                      <BookOpen size={18} />
                    </button>
                  )}

                  <button onClick={() => handleDownload(note.id, note.title, note.file_type)} className="btn-solid-gold" title="Download">
                    <Download size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- 📁 THE "SAVE TO ARCHIVE" MODAL OVERLAY --- */}
      {isCollectionModalOpen && myCollections && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="modal-content">
            
            <button onClick={() => { setIsCollectionModalOpen(false); setActiveNoteForCollection(null); setIsCreatingCol(false); }} className="close-btn" style={{ top: '15px', right: '15px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem' }}>Year</label>
                    <input type="number" value={newColYear} onChange={e => setNewColYear(Number(e.target.value))} className="auth-input" min={1} />
                  </div>
                  <div>
                    <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem' }}>Semester</label>
                    <input type="number" value={newColSem} onChange={e => setNewColSem(Number(e.target.value))} className="auth-input" min={1} />
                  </div>
                </div>
                <div>
                  <label className="text-desc" style={{ display: 'block', marginBottom: '0.5rem' }}>Module mapping</label>
                  <select value={newColMod} onChange={e => setNewColMod(e.target.value ? Number(e.target.value) : '')} className="auth-input" style={{ width: '100%' }}>
                    <option value="">Across all modules</option>
                    {allModules.map(m => (
                      <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
                    ))}
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