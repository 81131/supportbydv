import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 1. Add this import!
import { FileText, Download, Heart, FolderPlus, Trash2, Pin, VenetianMask, BadgeCheck } from 'lucide-react';
import api from '../api';

interface NoteDisplayerProps {
  moduleId: number;
}

const NoteDisplayer: React.FC<NoteDisplayerProps> = ({ moduleId }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate(); // 👈 2. Initialize the hook here!

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchNotes();
  }, [moduleId]);

  const fetchNotes = async () => {
    try {
      const res = await api.get(`/library/notes/module/${moduleId}`);
      setNotes(res.data);
    } catch (error) {
      console.error("Failed to load scrolls", error);
    } finally {
      setIsLoading(false);
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
    } catch (error) {
      alert("This scroll is sealed or lost to time.");
    }
  };

  // 👇 Added the Hard Delete function!
  const handleDelete = async (noteId: number) => {
    if (window.confirm("Are you sure you want to burn this scroll? It will be removed from all collections.")) {
      try {
        await api.delete(`/library/notes/${noteId}`);
        setNotes(notes.filter(n => n.id !== noteId)); 
        alert("Scroll burned to ashes.");
      } catch (error) {
        console.error("Failed to delete", error);
        alert("You do not have permission to burn this scroll.");
      }
    }
  };

  const sortedNotes = [...notes].sort((a, b) => Number(b.is_pinned || false) - Number(a.is_pinned || false));

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <button 
          onClick={() => navigate('/upload-note')} 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <FileText size={20} /> Forge New Scroll
        </button>
      </div>

      {isLoading ? (
        <p style={{ color: 'var(--accent-gold)' }}>Searching the library...</p>
      ) : sortedNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border-dark)', borderRadius: '8px' }}>
          <FileText size={48} color="var(--border-dark)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No scrolls have been archived here yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {sortedNotes.map((note) => {
            const role = String(note.creator_role).replace('UserRole.', '');
            const isNoOne = role === 'noOne' || role === 'NO_ONE';
            const isVerified = role === 'verified' || role === 'VERIFIED' || role === 'admin' || role === 'ADMIN' || isNoOne;

            // Check if current user owns the note, or is admin/noOne
            const canDelete = currentUser?.id === note.uploader_id || currentUser?.role === 'admin' || currentUser?.role === 'noOne';

            return (
              <div key={note.id} style={{ 
                border: note.is_pinned ? '1px solid var(--accent-gold)' : '1px solid var(--border-dark)', 
                padding: '1.5rem', borderRadius: '8px', backgroundColor: 'rgba(15, 15, 15, 0.8)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
                    <FileText size={20} color="var(--accent-gold)" />
                    <h4 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.2rem' }}>{note.title}</h4>
                    
                    {/* 👇 Fixed the TS errors by wrapping the icons in spans! */}
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      {isNoOne && (
                        <span title="Forged by No One" style={{ cursor: 'help', display: 'flex' }}>
                          <VenetianMask size={16} color="#b39ddb" />
                        </span>
                      )}
                      {isVerified && (
                        <span title="Verified Scholar" style={{ cursor: 'help', display: 'flex' }}>
                          <BadgeCheck size={16} color="#4caf50" />
                        </span>
                      )}
                      {note.is_pinned && (
                        <span title="Pinned by No One" style={{ cursor: 'help', display: 'flex', transform: 'rotate(45deg)' }}>
                          <Pin size={16} color="#ff4d4d" fill="#ff4d4d" />
                        </span>
                      )}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>{note.description}</p>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  
                  {/* 👇 The Hard Delete Button */}
                  {canDelete && (
                    <button 
                      onClick={() => handleDelete(note.id)}
                      title="Burn Scroll" 
                      style={{ background: 'transparent', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  <button title="Favorite" style={{ background: 'transparent', border: '1px solid var(--border-dark)', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                    <Heart size={18} />
                  </button>
                  <button title="Add to Collection" style={{ background: 'transparent', border: '1px solid var(--border-dark)', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                    <FolderPlus size={18} />
                  </button>
                  <button 
                    onClick={() => handleDownload(note.id, note.title, note.file_type)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--accent-gold)', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    <Download size={18} /> Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NoteDisplayer;