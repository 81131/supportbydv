import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Library, Heart, FileText, Download, DownloadCloud,
  ArrowLeft, Award, VenetianMask, BadgeCheck, Pin, Lock, Globe,
  GripVertical, Trash2, BookOpen,
} from 'lucide-react';
import api from '../api';
import PdfViewer from '../components/PdfViewer';

// ─── Main Page ───────────────────────────────────────────────────────────────
const CollectionView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [collection, setCollection] = useState<any | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [pdfNote, setPdfNote] = useState<{ id: number; title: string } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragIndex = useRef<number | null>(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isFavorites = id === 'favorites';
  const isOwner = collection && !isFavorites && collection.creator_id === currentUser.id;

  const showFlash = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFlash({ message, type });
    setTimeout(() => setFlash(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        if (isFavorites) {
          setCollection({
            id: 'favorites', title: 'Liked Scrolls',
            description: 'All the scrolls you have favorited across the realm.',
            visibility: 'private', is_special: true,
            creator_name: currentUser.first_name, creator_id: currentUser.id,
          });
          const res = await api.get('/library/notes/favorites/me');
          setNotes(res.data);
        } else {
          const [metaRes, notesRes] = await Promise.all([
            api.get(`/library/collections/${id}`),
            api.get(`/library/collections/${id}/notes`),
          ]);
          setCollection(metaRes.data);
          setNotes(notesRes.data);
        }
      } catch (err: any) {
        if (err?.response?.status === 403) showFlash('This archive is sealed.', 'error');
        else showFlash('Failed to open this archive.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  // ── Drag-to-reorder ────────────────────────────────────────────────────────
  const handleDragStart = (_e: React.DragEvent, index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null;
    setDragOverIndex(null);
    if (from === null || from === dropIndex) return;
    // Optimistic re-order
    const reordered = [...notes];
    const [removed] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, removed);
    setNotes(reordered);
    // Persist to backend
    try {
      await api.patch(`/library/collections/${id}/notes/reorder`, {
        note_ids: reordered.map((n) => n.id),
      });
    } catch {
      showFlash('Could not save order.', 'error');
    }
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setDragOverIndex(null);
  };

  // ── Remove ─────────────────────────────────────────────────────────────────
  const removeNote = async (noteId: number) => {
    if (!window.confirm('Remove this scroll from the archive?')) return;
    try {
      await api.delete(`/library/collections/${id}/notes/${noteId}`);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      showFlash('Scroll removed from archive.', 'success');
    } catch {
      showFlash('Could not remove scroll.', 'error');
    }
  };

  // ── Download (url to blob) ────────────────────────────────────────────────────────
  const handleDownload = async (noteId: number, title: string, ext: string) => {
    try {
      const res = await api.get(`/library/notes/download/${noteId}`);
      
      const pdfReq = await fetch(res.data.url);
      if (!pdfReq.ok) throw new Error("Network request failed.");
      const blob = await pdfReq.blob();
      
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = `${title}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch { showFlash('Scroll sealed or lost to time.', 'error'); }
  };

  // ── ZIP ────────────────────────────────────────────────────────────────────
  const handleZipDownload = async () => {
    if (!collection) return;
    try {
      const res = await api.get(`/library/collections/${collection.id}/zip`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `${collection.title.replace(/\s+/g, '_')}_Archive.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch { showFlash('Failed to compile the archive ZIP.', 'error'); }
  };

  // ── Favorite ───────────────────────────────────────────────────────────────
  const handleFavoriteToggle = async (noteId: number) => {
    try {
      const res = await api.post(`/library/notes/${noteId}/favorite`);
      setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, is_favorited: res.data.is_favorited } : n));
    } catch { showFlash('Could not toggle favorite.', 'error'); }
  };


  return (
    <div className="page-container" style={{ position: 'relative' }}>

      {/* PDF Viewer */}
      {pdfNote && (
        <PdfViewer
          noteId={pdfNote.id}
          title={pdfNote.title}
          onClose={() => setPdfNote(null)}
        />
      )}

      {/* Flash */}
      {flash && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 8888,
          background: flash.type === 'error' ? '#c62828' : flash.type === 'info' ? 'var(--bg-deep)' : '#2e7d32',
          color: flash.type === 'info' ? 'var(--accent-gold)' : '#fff',
          padding: '0.85rem 1.75rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          fontWeight: 'bold', fontSize: '0.95rem',
        }}>
          {flash.message}
        </div>
      )}

      {/* Back + Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate(-1)} className="btn-ghost" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back
        </button>

        {collection && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                {collection.is_special
                  ? <Heart size={32} color="var(--accent-red)" fill="var(--accent-red)" />
                  : <Library size={32} color="var(--accent-gold)" />}
                <h1 className="brand-font" style={{ margin: 0, fontSize: '2rem', color: 'var(--accent-gold)' }}>
                  {collection.title}
                </h1>
                {!collection.is_special && (
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {collection.is_recommended && <span title="Recommended"><Award size={20} color="var(--accent-gold)" /></span>}
                    {collection.is_pinned && <span title="Pinned"><Pin size={20} color="var(--accent-red)" fill="var(--accent-red)" style={{ transform: 'rotate(45deg)' }} /></span>}
                  </div>
                )}
              </div>

              {collection.description && (
                <p className="text-desc" style={{ marginBottom: '0.5rem', maxWidth: '640px' }}>{collection.description}</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {collection.creator_id && (
                  <span className="text-desc" style={{ fontSize: '0.9rem' }}>
                    Forged by{' '}
                    <Link to={`/user/${collection.creator_id}`} style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600 }}>
                      {collection.creator_name || 'Scholar'}
                    </Link>
                  </span>
                )}
                {!collection.is_special && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {collection.visibility === 'private'
                      ? <><Lock size={13} /> Private</>
                      : <><Globe size={13} color="#42a5f5" /><span style={{ color: '#42a5f5' }}>Public</span></>}
                  </span>
                )}
                {isOwner && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <GripVertical size={13} /> Drag scrolls to reorder
                  </span>
                )}
              </div>
            </div>

            {!isFavorites && (
              <button onClick={handleZipDownload} className="btn-ghost-gold" disabled={notes.length === 0} style={{ opacity: notes.length === 0 ? 0.5 : 1 }}>
                <DownloadCloud size={18} /> Download ZIP
              </button>
            )}
          </div>
        )}
      </div>

      <div className="panel-divider" style={{ marginBottom: '2rem' }} />

      {/* Notes list */}
      {isLoading ? (
        <p style={{ color: 'var(--accent-gold)', textAlign: 'center' }}>Unrolling the scrolls…</p>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-dark)', borderRadius: '8px' }}>
          <FileText size={48} color="var(--border-dark)" style={{ marginBottom: '1rem' }} />
          <p className="text-desc">This archive contains no scrolls yet.</p>
        </div>
      ) : (
        <div className="list-view">
          {notes.map((note, idx) => {
            const role = String(note.creator_role || '').replace('UserRole.', '');
            const isNoOne = role === 'noOne' || role === 'NO_ONE';
            const isVerified = role === 'verified' || role === 'VERIFIED' || role === 'admin' || role === 'ADMIN' || isNoOne;
            const isPdf = note.file_type === 'pdf';
            const isDragTarget = dragOverIndex === idx;

            return (
              <div
                key={note.id}
                className="item-card row"
                style={{
                  alignItems: 'center',
                  transition: 'border-color 0.15s, transform 0.15s',
                  borderLeft: isDragTarget ? '3px solid var(--accent-gold)' : '3px solid transparent',
                  cursor: isOwner ? 'default' : 'auto',
                }}
                onDragOver={isOwner ? (e) => handleDragOver(e, idx) : undefined}
                onDrop={isOwner ? (e) => handleDrop(e, idx) : undefined}
              >

                {/* ── Drag grip (owner only) ── */}
                {isOwner && (
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnd={handleDragEnd}
                    style={{
                      cursor: 'grab',
                      color: 'var(--text-muted)',
                      flexShrink: 0,
                      marginRight: '0.25rem',
                      padding: '0.25rem',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Drag to reorder"
                  >
                    <GripVertical size={18} />
                  </div>
                )}

                {/* ── Note info ── */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                  <FileText size={22} color="var(--accent-gold)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      {/* Clickable title → navigate to permalink */}
                      <Link
                        to={`/notes/view/${note.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--text-primary)', fontWeight: 700,
                          fontSize: '1rem', textDecoration: 'none',
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-gold)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                        title="Open note page"
                      >
                        {note.title}
                      </Link>
                      {/* Badge: PDF readable */}
                      {isPdf && (
                        <span style={{
                          fontSize: '0.68rem', background: 'rgba(212,175,55,0.12)', color: 'var(--accent-gold)',
                          border: '1px solid rgba(212,175,55,0.3)', borderRadius: '4px', padding: '1px 6px',
                        }}>
                          READ ONLINE
                        </span>
                      )}
                      {note.is_recommended && <span title="Recommended"><Award size={15} color="var(--accent-gold)" /></span>}
                      {isNoOne && <span title="Forged by No One"><VenetianMask size={15} color="var(--accent-purple, #b39ddb)" /></span>}
                      {isVerified && <span title="Verified Scholar"><BadgeCheck size={15} color="#4caf50" /></span>}
                      {note.is_pinned && <span title="Pinned"><Pin size={15} color="var(--accent-red)" fill="var(--accent-red)" style={{ transform: 'rotate(45deg)' }} /></span>}
                    </div>
                    {note.description && (
                      <p className="text-desc" style={{ margin: '0 0 0.2rem', fontSize: '0.88rem' }}>{note.description}</p>
                    )}
                    {note.uploader_id && (
                      <p className="text-desc" style={{ fontSize: '0.8rem', margin: 0 }}>
                        Forged by{' '}
                        <Link to={`/user/${note.uploader_id}`} style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600 }}>
                          {note.uploader_name || 'Scholar'}
                        </Link>
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Actions ── */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                  {!isFavorites && (
                    <button
                      onClick={() => handleFavoriteToggle(note.id)}
                      className="btn-ghost"
                      title={note.is_favorited ? 'Remove from Favorites' : 'Favorite'}
                      style={{ borderColor: note.is_favorited ? 'var(--accent-red)' : '', color: note.is_favorited ? 'var(--accent-red)' : '' }}
                    >
                      <Heart size={16} fill={note.is_favorited ? 'var(--accent-red)' : 'transparent'} />
                    </button>
                  )}

                  {isPdf && (
                    <Link to={`/notes/view/${note.id}`} target="_blank" rel="noopener noreferrer" className="btn-ghost" title="Read online">
                      <BookOpen size={16} />
                    </Link>
                  )}

                  <button
                    onClick={() => handleDownload(note.id, note.title, note.file_type || 'pdf')}
                    className="btn-solid-gold"
                    title="Download"
                  >
                    <Download size={15} />
                  </button>

                  {isOwner && (
                    <button onClick={() => removeNote(note.id)} className="btn-ghost-danger" title="Remove from archive">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export default CollectionView;
