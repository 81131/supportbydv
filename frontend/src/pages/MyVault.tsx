import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Library, DownloadCloud, Trash2, Lock, Globe, FolderHeart, Heart, Edit2, X, Save } from 'lucide-react';
import api from '../api';

const MyVault: React.FC = () => {
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [flashMessage, setFlashMessage] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [availableModules, setAvailableModules] = useState<any[]>([]);

  // Edit modal state
  const [editingCol, setEditingCol] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVisibility, setEditVisibility] = useState('private');
  const [editModuleId, setEditModuleId] = useState<number | ''>('');
  const [editYear, setEditYear] = useState(2);
  const [editSemester, setEditSemester] = useState(2);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const navigate = useNavigate();

  const showFlash = (message: string, type: 'success' | 'error' = 'success') => {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [colRes, modRes] = await Promise.all([
          api.get('/library/collections/me'),
          api.get('/modules'),
        ]);
        setCollections(colRes.data);
        setAvailableModules(modRes.data);
      } catch (error) {
        showFlash("Failed to open your vault.", 'error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

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

  const handleDelete = async (collectionId: number | string) => {
    if (collectionId === 'favorites') {
        showFlash("You cannot burn the Liked Scrolls archive.", 'error');
        return;
    }
    if (window.confirm("Are you sure you want to burn this archive? All contained records will be unlinked (but not destroyed).")) {
      try {
        await api.delete(`/library/collections/${collectionId}`);
        setCollections(collections.filter(c => c.id !== collectionId));
        showFlash("Archive burned.");
      } catch (error) { showFlash("You do not have permission.", 'error'); }
    }
  };

  const openEditModal = (col: any) => {
    setEditingCol(col);
    setEditTitle(col.title || '');
    setEditDesc(col.description || '');
    setEditVisibility(col.visibility || 'private');
    setEditModuleId(col.module_id || '');
    setEditYear(col.year || 2);
    setEditSemester(col.semester || 2);
  };

  const handleSaveEdit = async () => {
    if (!editingCol) return;
    setIsSavingEdit(true);
    // Normalise module_id: empty string from select means "no module" = null
    const resolvedModuleId = editModuleId !== '' ? Number(editModuleId) : null;
    try {
      await api.patch(`/library/collections/${editingCol.id}/edit`, {
        title: editTitle,
        description: editDesc,
        visibility: editVisibility,
        module_id: resolvedModuleId,
        year: editYear,
        semester: editSemester,
      });
      setCollections(prev => prev.map(c => c.id === editingCol.id
        ? { ...c, title: editTitle, description: editDesc, visibility: editVisibility, module_id: resolvedModuleId, year: editYear, semester: editSemester }
        : c
      ));
      showFlash("Archive updated.");
      setEditingCol(null);
    } catch (error) { showFlash("Failed to update archive.", 'error'); }
    finally { setIsSavingEdit(false); }
  };

  return (
    <div className="page-container" style={{ position: 'relative' }}>
      
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

      {/* ── Edit Modal ── */}
      {editingCol && (
        <div onClick={() => setEditingCol(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9990, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', borderRadius: '16px',
            padding: '2rem', maxWidth: '520px', width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="brand-font" style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '1.3rem' }}>
                <Edit2 size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Edit Archive
              </h2>
              <button className="close-btn" style={{ position: 'static' }} onClick={() => setEditingCol(null)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Archive Name</label>
                <input type="text" className="auth-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ margin: 0 }} />
              </div>

              <div>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Description</label>
                <textarea className="auth-input" value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ margin: 0, minHeight: '70px', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-desc" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Year</label>
                  <select className="auth-input" value={editYear} onChange={e => setEditYear(Number(e.target.value))} style={{ margin: 0 }}>
                    {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-desc" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Semester</label>
                  <select className="auth-input" value={editSemester} onChange={e => setEditSemester(Number(e.target.value))} style={{ margin: 0 }}>
                    {[1, 2].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Module <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(or leave blank for cross-module)</span></label>
                <select className="auth-input" value={editModuleId} onChange={e => setEditModuleId(e.target.value ? Number(e.target.value) : '')} style={{ margin: 0 }}>
                  <option value="">All Modules (Semester-wide)</option>
                  {availableModules.map(m => <option key={m.id} value={m.id}>{m.code} — {m.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-desc" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Visibility</label>
                <select className="auth-input" value={editVisibility} onChange={e => setEditVisibility(e.target.value)} style={{ margin: 0 }}>
                  <option value="private">Private Archive</option>
                  <option value="public">Public Archive</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn-ghost" onClick={() => setEditingCol(null)}>Cancel</button>
              <button className="btn-solid-gold" onClick={handleSaveEdit} disabled={isSavingEdit} style={{ justifyContent: 'center', opacity: isSavingEdit ? 0.6 : 1 }}>
                <Save size={16} style={{ marginRight: '0.4rem' }} /> {isSavingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
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
            <div key={col.id} className={`item-card column ${col.is_special ? 'special' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {col.is_special
                    ? <Heart size={24} color="var(--accent-red)" fill="var(--accent-red)" />
                    : <Library size={24} color="var(--accent-gold)" />}
                  <Link to={`/collection/${col.id}`} style={{ textDecoration: 'none' }}>
                    <h3 className="text-title" style={{ margin: 0, transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-gold)')}
                      onMouseLeave={e => (e.currentTarget.style.color = '')}
                    >{col.title}</h3>
                  </Link>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {!col.is_special && (
                    <button onClick={() => openEditModal(col)} className="btn-ghost" title="Edit Archive" style={{ padding: '0.3rem' }}>
                      <Edit2 size={16} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(col.id)} className="btn-ghost-danger" title="Burn Archive" style={{ padding: '0.3rem' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {col.description && (
                <p className="text-desc" style={{ fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                  {col.description}
                </p>
              )}

              {/* Meta tags row */}
              {!col.is_special && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {col.year && <span style={{ fontSize: '0.75rem', background: 'var(--bg-deep)', border: '1px solid var(--border-dark)', borderRadius: '4px', padding: '0.15rem 0.5rem', color: 'var(--text-muted)' }}>Year {col.year}</span>}
                  {col.semester && <span style={{ fontSize: '0.75rem', background: 'var(--bg-deep)', border: '1px solid var(--border-dark)', borderRadius: '4px', padding: '0.15rem 0.5rem', color: 'var(--text-muted)' }}>Sem {col.semester}</span>}
                  {col.module_id
                    ? <span style={{ fontSize: '0.75rem', background: 'rgba(197,160,89,0.1)', border: '1px solid var(--accent-gold)', borderRadius: '4px', padding: '0.15rem 0.5rem', color: 'var(--accent-gold)' }}>{availableModules.find(m => m.id === col.module_id)?.code || 'Module'}</span>
                    : <span style={{ fontSize: '0.75rem', background: 'var(--bg-deep)', border: '1px solid var(--border-dark)', borderRadius: '4px', padding: '0.15rem 0.5rem', color: 'var(--text-muted)' }}>All Modules</span>}
                </div>
              )}

              {/* Visibility row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.4rem 0.6rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                {col.is_special
                  ? <><Lock size={14} color="var(--accent-red)" /><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Private (Linked Scrolls)</span></>
                  : col.visibility === 'private'
                    ? <><Lock size={14} color="var(--text-muted)" /><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Private Archive</span></>
                    : <><Globe size={14} color="#42a5f5" /><span style={{ color: '#42a5f5', fontSize: '0.85rem' }}>Public Archive</span></>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-dark)', paddingTop: '1rem', marginTop: 'auto' }}>
                <span className="text-stat" style={{ fontSize: '1rem' }}>{col.note_count} Scrolls</span>
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