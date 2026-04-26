import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, Download, Heart, Award, VenetianMask,
  BadgeCheck, Pin, Volume2, VolumeX, Loader2, ExternalLink,
} from 'lucide-react';
import api from '../api';

// ─── TTS Voice / Rate options (mirrors backend allowlist) ─────────────────────
const TTS_VOICES = [
  { id: 'en-US-JennyNeural',   label: '🇺🇸 Jenny (US · Female)' },
  { id: 'en-US-GuyNeural',     label: '🇺🇸 Guy (US · Male)' },
  { id: 'en-US-AriaNeural',    label: '🇺🇸 Aria (US · Female)' },
  { id: 'en-GB-SoniaNeural',   label: '🇬🇧 Sonia (British · Female)' },
  { id: 'en-GB-RyanNeural',    label: '🇬🇧 Ryan (British · Male)' },
  { id: 'en-AU-NatashaNeural', label: '🇦🇺 Natasha (Australian · Female)' },
  { id: 'en-AU-WilliamNeural', label: '🇦🇺 William (Australian · Male)' },
  { id: 'en-IN-NeerjaNeural',  label: '🇮🇳 Neerja (Indian · Female)' },
  { id: 'en-IN-PrabhatNeural', label: '🇮🇳 Prabhat (Indian · Male)' },
];

const TTS_RATES = [
  { value: '-50%',  label: '0.5×' },
  { value: '-25%',  label: '0.75×' },
  { value: '+0%',   label: '1× (Normal)' },
  { value: '+25%',  label: '1.25×' },
  { value: '+50%',  label: '1.5×' },
  { value: '+75%',  label: '1.75×' },
  { value: '+100%', label: '2×' },
];

// ─── NoteViewer ───────────────────────────────────────────────────────────────
const NoteViewer: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();

  const [note, setNote]               = useState<any>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError]     = useState<string | null>(null);

  const [blobUrl, setBlobUrl]         = useState<string | null>(null);
  const [pdfLoading, setPdfLoading]   = useState(true);
  const [pdfError, setPdfError]       = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  const [showTTS, setShowTTS]         = useState(false);
  const [voice, setVoice]             = useState('en-US-JennyNeural');
  const [rate, setRate]               = useState('+0%');
  const [audioUrl, setAudioUrl]       = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ttsError, setTtsError]       = useState<string | null>(null);
  const audioRef                       = useRef<HTMLAudioElement>(null);

  const [isFav, setIsFav]             = useState(false);

  // ── Load metadata ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!noteId) return;
    setMetaLoading(true);
    api.get(`/library/notes/${noteId}/info`)
      .then(res => {
        setNote(res.data);
        setIsFav(res.data.is_favorited);
      })
      .catch(err => setMetaError(
        err?.response?.status === 404
          ? 'This scroll does not exist or has been lost to time.'
          : 'Failed to load scroll info.',
      ))
      .finally(() => setMetaLoading(false));
  }, [noteId]);

  // ── Load PDF ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!noteId) return;
    let url = '';
    setPdfLoading(true);
    setDownloadProgress(0);
    api.get(`/library/notes/download/${noteId}`)
      .then(async (res) => {
        const response = await fetch(res.data.url);
        if (!response.ok) throw new Error("Failed to retrieve scroll from vault.");
        
        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        
        if (!response.body) {
          const blob = await response.blob();
          url = URL.createObjectURL(blob);
          setBlobUrl(url);
          return;
        }

        const reader = response.body.getReader();
        const chunks = [];
        let receivedLength = 0;

        while(true) {
          const {done, value} = await reader.read();
          if (done) break;
          chunks.push(value);
          receivedLength += value.length;
          if (total > 0) {
            setDownloadProgress(Math.round((receivedLength / total) * 100));
          } else {
            setDownloadProgress(p => (p < 90 ? p + 10 : 90));
          }
        }

        const blob = new Blob(chunks, { type: 'application/pdf' });
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      })
      .catch(() => setPdfError('Could not load this scroll.'))
      .finally(() => setPdfLoading(false));
      
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [noteId]);

  // ── Revoke audio blob on unmount / change ───────────────────────────────────
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  // ── Favorite toggle ──────────────────────────────────────────────────────────
  const toggleFav = async () => {
    try {
      const res = await api.post(`/library/notes/${noteId}/favorite`);
      setIsFav(res.data.is_favorited);
    } catch { /* silent */ }
  };

  // ── Generate TTS audio ───────────────────────────────────────────────────────
  const generateAudio = async () => {
    setIsGenerating(true);
    setTtsError(null);
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    try {
      const res = await api.get(
        `/library/notes/tts/${noteId}?voice=${voice}&rate=${encodeURIComponent(rate)}`,
        { responseType: 'blob', timeout: 180_000 },
      );
      setAudioUrl(URL.createObjectURL(new Blob([res.data], { type: 'audio/mpeg' })));
    } catch (err: any) {
      setTtsError(err?.response?.data?.detail ?? 'Audio generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const role         = String(note?.creator_role ?? note?.uploader_role ?? '').replace('UserRole.', '');
  const isNoOne      = role === 'noOne' || role === 'NO_ONE';
  const isVerified   = role === 'verified' || role === 'admin' || isNoOne;
  const isPdf        = note?.file_type === 'pdf';

  if (metaLoading) return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={36} color="var(--accent-gold)" style={{ animation: 'nvspin 1s linear infinite' }} />
      <style>{`@keyframes nvspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (metaError) return (
    <div className="page-container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <p style={{ color: '#ef5350', marginBottom: '1.5rem' }}>{metaError}</p>
      <button onClick={() => navigate(-1)} className="btn-ghost"><ArrowLeft size={16} /> Go Back</button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--quiz-topbar-h))' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.65rem 1.5rem',
        background: 'var(--bg-deep)',
        borderBottom: '1px solid var(--border-dark)',
        flexShrink: 0, flexWrap: 'wrap',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => navigate(-1)} className="btn-ghost"
          style={{ padding: '0.3rem 0.6rem', fontSize: '0.82rem', flexShrink: 0 }}
          title="Go back">
          <ArrowLeft size={15} />
        </button>

        <BookOpen size={18} color="var(--accent-gold)" style={{ flexShrink: 0 }} />

        {/* Title + badges */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{
            fontWeight: 700, color: 'var(--accent-gold)',
            fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {note?.title}
          </span>
          {note?.is_recommended && <span title="Recommended"><Award size={15} color="var(--accent-gold)" /></span>}
          {isNoOne && <span title="Forged by No One"><VenetianMask size={15} color="#b39ddb" /></span>}
          {isVerified && <span title="Verified Scholar"><BadgeCheck size={15} color="#4caf50" /></span>}
          {note?.is_pinned && <span title="Pinned"><Pin size={14} color="var(--accent-red)" fill="var(--accent-red)" style={{ transform: 'rotate(45deg)' }} /></span>}
          {isPdf && (
            <span style={{
              fontSize: '0.66rem', padding: '1px 6px', borderRadius: '4px',
              background: 'rgba(212,175,55,0.12)', color: 'var(--accent-gold)',
              border: '1px solid rgba(212,175,55,0.25)',
            }}>PDF</span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={toggleFav} className="btn-ghost"
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            style={{ color: isFav ? 'var(--accent-red)' : '', borderColor: isFav ? 'var(--accent-red)' : '' }}>
            <Heart size={15} fill={isFav ? 'var(--accent-red)' : 'transparent'} />
          </button>

          {isPdf && (
            <button onClick={() => setShowTTS(v => !v)}
              className={showTTS ? 'btn-solid-gold' : 'btn-ghost'}
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.7rem' }}>
              <Volume2 size={15} /> Read Aloud
            </button>
          )}

          {blobUrl && (
            <a href={blobUrl} download={`${note?.title}.pdf`} className="btn-ghost"
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.7rem' }}>
              <Download size={15} /> Download
            </a>
          )}
        </div>
      </div>

      {/* ── Note info strip ──────────────────────────────────────────────────── */}
      {note?.description && (
        <div style={{
          padding: '0.6rem 1.5rem',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-dark)',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', flex: 1, minWidth: 0 }}>
            {note.description}
          </span>
          {note.uploader_id && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              By{' '}
              <Link to={`/user/${note.uploader_id}`}
                style={{ color: 'var(--accent-gold)', fontWeight: 600, textDecoration: 'none' }}>
                {note.uploader_name}
              </Link>
            </span>
          )}
          {/* Shareable link hint */}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <ExternalLink size={12} />
            Shareable: <code style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', userSelect: 'all' }}>{window.location.href}</code>
          </span>
        </div>
      )}

      {/* ── TTS Panel ───────────────────────────────────────────────────────── */}
      {showTTS && (
        <div style={{
          background: 'rgba(8,8,14,0.99)',
          borderBottom: '1px solid var(--border-dark)',
          padding: '0.75rem 1.5rem',
          flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Voice
              <select value={voice} onChange={e => { setVoice(e.target.value); setAudioUrl(null); }}
                className="auth-input" style={{ margin: 0, padding: '0.25rem 0.4rem', fontSize: '0.8rem', width: 'auto' }}>
                {TTS_VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Speed
              <select value={rate} onChange={e => { setRate(e.target.value); setAudioUrl(null); }}
                className="auth-input" style={{ margin: 0, padding: '0.25rem 0.4rem', fontSize: '0.8rem', width: 'auto' }}>
                {TTS_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>

            <button onClick={generateAudio} disabled={isGenerating}
              className="btn-solid-gold"
              style={{ padding: '0.35rem 0.9rem', fontSize: '0.82rem', opacity: isGenerating ? 0.65 : 1 }}>
              {isGenerating
                ? <><Loader2 size={14} style={{ animation: 'nvspin 1s linear infinite' }} /> Generating…</>
                : audioUrl ? '↻ Regenerate' : '▶ Generate Audio'}
            </button>

            {isGenerating && (
              <span style={{ fontSize: '0.77rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                May take 15–45 s for long scrolls…
              </span>
            )}
          </div>

          {ttsError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem',
              background: 'rgba(198,40,40,0.1)', border: '1px solid rgba(198,40,40,0.25)',
              borderRadius: '6px', padding: '0.5rem 0.8rem', color: '#ef5350',
            }}>
              <VolumeX size={14} /> {ttsError}
            </div>
          )}

          {audioUrl && !ttsError && (
            <audio ref={audioRef} src={audioUrl} controls autoPlay
              style={{ width: '100%', height: '38px' }} />
          )}
        </div>
      )}

      {/* ── PDF Viewer ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        {pdfLoading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)',
          }}>
            <Loader2 size={36} style={{ animation: 'nvspin 1s linear infinite', marginBottom: '1rem' }} />
            <p style={{ margin: '0 0 0.75rem 0' }}>Loading scroll…</p>
            {downloadProgress > 0 && (
              <>
                <div style={{ width: '200px', background: 'var(--bg-deep)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent-gold)', width: `${downloadProgress}%`, transition: 'width 0.2s' }} />
                </div>
                <span style={{ fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 500 }}>{downloadProgress}%</span>
              </>
            )}
          </div>
        )}
        {pdfError && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#ef5350', textAlign: 'center', padding: '2rem' }}>{pdfError}</p>
          </div>
        )}
        {blobUrl && !pdfError && (
          <embed
            src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            type="application/pdf"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        )}
      </div>

      <style>{`@keyframes nvspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default NoteViewer;
