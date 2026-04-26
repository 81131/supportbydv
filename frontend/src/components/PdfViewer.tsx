import React, { useEffect, useState, useRef } from 'react';
import {
  BookOpen, Download, X, Loader2, Volume2, VolumeX, Globe, RefreshCw, Play
} from 'lucide-react';
import api from '../api';

export interface PdfViewerProps {
  noteId: number;
  title: string;
  onClose: () => void;
}

// ─── Available TTS Voices ──────────────────────────────────────────────────────
const TTS_VOICES = [
  { id: 'en-US-JennyNeural',   label: 'Jenny (US · Female)' },
  { id: 'en-US-GuyNeural',     label: 'Guy (US · Male)' },
  { id: 'en-US-AriaNeural',    label: 'Aria (US · Female)' },
  { id: 'en-GB-SoniaNeural',   label: 'Sonia (British · Female)' },
  { id: 'en-GB-RyanNeural',    label: 'Ryan (British · Male)' },
  { id: 'en-AU-NatashaNeural', label: 'Natasha (Australian · Female)' },
  { id: 'en-AU-WilliamNeural', label: 'William (Australian · Male)' },
  { id: 'en-IN-NeerjaNeural',  label: 'Neerja (Indian · Female)' },
  { id: 'en-IN-PrabhatNeural', label: 'Prabhat (Indian · Male)' },
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

// ─── PDF Viewer Modal ──────────────────────────────────────────────────────────
const PdfViewer: React.FC<PdfViewerProps> = ({ noteId, title, onClose }) => {
  const [blobUrl, setBlobUrl]           = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(true);
  const [pdfError, setPdfError]         = useState<string | null>(null);

  // TTS state
  const [showTTS, setShowTTS]           = useState(false);
  const [voice, setVoice]               = useState('en-US-JennyNeural');
  const [rate, setRate]                 = useState('+0%');
  const [audioUrl, setAudioUrl]         = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [ttsError, setTtsError]         = useState<string | null>(null);
  const audioRef                         = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let url = '';
    (async () => {
      try {
        const res = await api.get(`/library/notes/download/${noteId}`);
        // Now returns a JSON object containing the presigned Cloudflare URL
        const presignedUrl = res.data.url;
        
        // Fetch the object directly via the frontend to secure it into a blob
        const pdfReq = await fetch(presignedUrl);
        if (!pdfReq.ok) throw new Error("Failed to retrieve scroll from vault.");
        const pdfBlob = await pdfReq.blob();
        
        url = URL.createObjectURL(pdfBlob);
        setBlobUrl(url);
      } catch (err) {
        console.error("Failed to load PDF:", err);
        setPdfError('Could not load this scroll. It may be sealed or lost to time.');
      } finally {
        setIsLoadingPdf(false);
      }
    })();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [noteId]);

  // Revoke audio blob on unmount
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

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

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Header ─────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.65rem 1.25rem',
        background: 'var(--bg-deep)',
        borderBottom: '1px solid var(--border-dark)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <BookOpen size={18} color="var(--accent-gold)" style={{ flexShrink: 0 }} />
        <span style={{
          color: 'var(--accent-gold)', fontWeight: 700, fontSize: '0.95rem',
          flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </span>

        <button
          onClick={() => setShowTTS(v => !v)}
          className={showTTS ? 'btn-solid-gold' : 'btn-ghost'}
          style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', flexShrink: 0 }}
          title="Read Aloud"
        >
          <Volume2 size={15} /> Read Aloud
        </button>

        {blobUrl && (
          <a href={blobUrl} download={`${title}.pdf`} className="btn-ghost"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', flexShrink: 0 }}>
            <Download size={15} /> Download
          </a>
        )}

        <button onClick={onClose} className="btn-ghost"
          style={{ padding: '0.35rem', borderRadius: '50%', flexShrink: 0 }} title="Close (Esc)">
          <X size={18} />
        </button>
      </div>

      {/* ── TTS Panel ──────────────────────── */}
      {showTTS && (
        <div style={{
          background: 'rgba(8,8,14,0.99)',
          borderBottom: '1px solid var(--border-dark)',
          padding: '0.8rem 1.25rem',
          flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: '0.65rem',
        }}>
          {/* Controls row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Voice */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <Globe size={13} />
              <select value={voice} onChange={e => { setVoice(e.target.value); setAudioUrl(null); }}
                className="auth-input" style={{ margin: 0, padding: '0.25rem 0.4rem', fontSize: '0.8rem', width: 'auto' }}>
                {TTS_VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </label>

            {/* Speed */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Speed
              <select value={rate} onChange={e => { setRate(e.target.value); setAudioUrl(null); }}
                className="auth-input" style={{ margin: 0, padding: '0.25rem 0.4rem', fontSize: '0.8rem', width: 'auto' }}>
                {TTS_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>

            {/* Generate / Regenerate */}
            <button onClick={generateAudio} disabled={isGenerating}
              className="btn-solid-gold"
              style={{ padding: '0.35rem 0.9rem', fontSize: '0.82rem', opacity: isGenerating ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {isGenerating
                ? <><Loader2 size={14} style={{ animation: 'pdfspin 1s linear infinite' }} /> Generating…</>
                : audioUrl ? <><RefreshCw size={14} /> Regenerate</> : <><Play size={14} /> Generate Audio</>}
            </button>

            {isGenerating && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                This may take 10–30 seconds for long scrolls…
              </span>
            )}
          </div>

          {/* Error */}
          {ttsError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(198,40,40,0.1)', border: '1px solid rgba(198,40,40,0.25)',
              borderRadius: '6px', padding: '0.5rem 0.8rem', color: '#ef5350', fontSize: '0.83rem',
            }}>
              <VolumeX size={14} /> {ttsError}
            </div>
          )}

          {/* Audio player */}
          {audioUrl && !ttsError && (
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              autoPlay
              style={{ width: '100%', height: '36px', accentColor: 'var(--accent-gold)' }}
            />
          )}
        </div>
      )}

      {/* ── PDF Content ─────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {isLoadingPdf && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: 'var(--accent-gold)',
          }}>
            <Loader2 size={40} style={{ animation: 'pdfspin 1s linear infinite', marginBottom: '1rem' }} />
            <p style={{ margin: 0 }}>Loading scroll…</p>
          </div>
        )}
        {pdfError && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#ef5350', textAlign: 'center', padding: '2rem', maxWidth: '480px' }}>{pdfError}</p>
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

      <style>{`@keyframes pdfspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PdfViewer;
