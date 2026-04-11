import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  BookOpen, Download, X, Loader2,
  Volume2, VolumeX, Play, Pause, Square,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import api from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PdfViewerProps {
  noteId: number;
  title: string;
  onClose: () => void;
}

// ─── Read-Aloud Panel ─────────────────────────────────────────────────────────
const ReadAloudPanel: React.FC<{ noteId: number; isPdf: boolean }> = ({ noteId, isPdf }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
      if (v.length) { setVoices(v); setSelectedVoice(v[0].voiceURI); }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Fetch text from backend when panel opens
  const loadText = useCallback(async () => {
    if (text !== null) return; // already loaded
    setIsLoadingText(true);
    setTextError(null);
    try {
      const res = await api.get(`/library/notes/text/${noteId}`);
      setText(res.data.text);
      setPageCount(res.data.page_count);
    } catch (err: any) {
      setTextError(err?.response?.data?.detail || 'Could not extract text from this scroll.');
    } finally {
      setIsLoadingText(false);
    }
  }, [noteId, text]);

  const handleTogglePanel = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) loadText();
  };

  const handlePlay = () => {
    if (!text) return;
    if (isPaused && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    const voice = voices.find(v => v.voiceURI === selectedVoice);
    if (voice) utter.voice = voice;
    utter.onstart  = () => { setIsSpeaking(true); setIsPaused(false); };
    utter.onend    = () => { setIsSpeaking(false); setIsPaused(false); };
    utter.onerror  = () => { setIsSpeaking(false); setIsPaused(false); };
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  const handlePause = () => {
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsSpeaking(false);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  // Stop when panel unmounts
  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  if (!isPdf) return null;

  return (
    <div style={{ borderTop: '1px solid var(--border-dark)', flexShrink: 0 }}>
      {/* Toggle button */}
      <button
        onClick={handleTogglePanel}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
          background: 'var(--bg-deep)', border: 'none', cursor: 'pointer',
          padding: '0.6rem 1.5rem', color: 'var(--text-muted)',
          fontSize: '0.85rem', transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-gold)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <Volume2 size={16} color={isOpen ? 'var(--accent-gold)' : undefined} />
        <span style={{ flex: 1, textAlign: 'left', color: isOpen ? 'var(--accent-gold)' : undefined }}>
          Read Aloud
        </span>
        {isSpeaking && !isPaused && (
          <span style={{
            fontSize: '0.7rem', background: 'rgba(212,175,55,0.15)',
            color: 'var(--accent-gold)', border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '4px', padding: '1px 6px', marginRight: '0.5rem',
          }}>
            PLAYING
          </span>
        )}
        {isPaused && (
          <span style={{
            fontSize: '0.7rem', background: 'rgba(100,100,100,0.2)',
            color: 'var(--text-muted)', borderRadius: '4px',
            padding: '1px 6px', marginRight: '0.5rem',
          }}>
            PAUSED
          </span>
        )}
        {isOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
      </button>

      {/* Panel body */}
      {isOpen && (
        <div style={{
          background: 'var(--bg-deep)', padding: '1rem 1.5rem',
          display: 'flex', flexDirection: 'column', gap: '0.85rem',
        }}>
          {isLoadingText && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--accent-gold)', fontSize: '0.88rem' }}>
              <Loader2 size={16} style={{ animation: 'ttspin 1s linear infinite' }} />
              Extracting text from scroll…
            </div>
          )}

          {textError && (
            <div style={{
              background: 'rgba(198,40,40,0.1)', border: '1px solid rgba(198,40,40,0.3)',
              borderRadius: '6px', padding: '0.7rem 1rem', color: '#ef5350', fontSize: '0.85rem',
            }}>
              <VolumeX size={15} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
              {textError}
            </div>
          )}

          {text && !textError && (
            <>
              {/* Status line */}
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {pageCount} page{pageCount !== 1 ? 's' : ''} · {text.split(/\s+/).length.toLocaleString()} words extracted
              </p>

              {/* Controls row */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Play / Resume */}
                {(!isSpeaking || isPaused) && (
                  <button
                    onClick={handlePlay}
                    className="btn-solid-gold"
                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                    title={isPaused ? 'Resume' : 'Play'}
                  >
                    <Play size={15} /> {isPaused ? 'Resume' : 'Play'}
                  </button>
                )}

                {/* Pause */}
                {isSpeaking && !isPaused && (
                  <button
                    onClick={handlePause}
                    className="btn-ghost"
                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                    title="Pause"
                  >
                    <Pause size={15} /> Pause
                  </button>
                )}

                {/* Stop */}
                {(isSpeaking || isPaused) && (
                  <button
                    onClick={handleStop}
                    className="btn-ghost-danger"
                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
                    title="Stop"
                  >
                    <Square size={14} fill="currentColor" /> Stop
                  </button>
                )}

                {/* Speed selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Speed</span>
                  <select
                    value={rate}
                    onChange={e => {
                      const r = parseFloat(e.target.value);
                      setRate(r);
                      // Restart with new rate if speaking
                      if (isSpeaking && !isPaused) {
                        handleStop();
                        setTimeout(() => {
                          const utter = new SpeechSynthesisUtterance(text);
                          utter.rate = r;
                          const voice = voices.find(v => v.voiceURI === selectedVoice);
                          if (voice) utter.voice = voice;
                          utter.onstart  = () => { setIsSpeaking(true); setIsPaused(false); };
                          utter.onend    = () => { setIsSpeaking(false); setIsPaused(false); };
                          utter.onerror  = () => { setIsSpeaking(false); setIsPaused(false); };
                          utteranceRef.current = utter;
                          window.speechSynthesis.speak(utter);
                        }, 100);
                      }
                    }}
                    className="auth-input"
                    style={{ width: 'auto', padding: '0.25rem 0.4rem', margin: 0, fontSize: '0.8rem' }}
                  >
                    <option value={0.75}>0.75×</option>
                    <option value={1.0}>1×</option>
                    <option value={1.25}>1.25×</option>
                    <option value={1.5}>1.5×</option>
                    <option value={2.0}>2×</option>
                  </select>
                </div>
              </div>

              {/* Voice selector */}
              {voices.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>Voice</span>
                  <select
                    value={selectedVoice}
                    onChange={e => setSelectedVoice(e.target.value)}
                    className="auth-input"
                    style={{ flex: 1, margin: 0, padding: '0.25rem 0.4rem', fontSize: '0.8rem' }}
                  >
                    {voices.map(v => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Extracted text preview */}
              <details style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <summary style={{ cursor: 'pointer', userSelect: 'none', marginBottom: '0.4rem' }}>
                  Preview extracted text
                </summary>
                <div style={{
                  maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)',
                  borderRadius: '4px', padding: '0.5rem 0.75rem', lineHeight: 1.5,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {text.slice(0, 800)}{text.length > 800 ? '…' : ''}
                </div>
              </details>
            </>
          )}
        </div>
      )}
      <style>{`@keyframes ttspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ─── PDF Viewer Modal ──────────────────────────────────────────────────────────
const PdfViewer: React.FC<PdfViewerProps> = ({ noteId, title, onClose }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string;
    const load = async () => {
      try {
        const res = await api.get(`/library/notes/download/${noteId}`, { responseType: 'blob' });
        url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        setBlobUrl(url);
      } catch {
        setError('Could not load this scroll. It may be sealed or lost to time.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [noteId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1.5rem',
        background: 'var(--bg-deep)',
        borderBottom: '1px solid var(--border-dark)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BookOpen size={20} color="var(--accent-gold)" />
          <span style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: '1rem' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a
            href={blobUrl || '#'}
            download={`${title}.pdf`}
            className="btn-ghost"
            style={{ fontSize: '0.85rem', opacity: blobUrl ? 1 : 0.4, pointerEvents: blobUrl ? 'auto' : 'none' }}
          >
            <Download size={15} /> Download
          </a>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '0.4rem', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* PDF content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {isLoading && (
          <div style={{ textAlign: 'center', color: 'var(--accent-gold)' }}>
            <Loader2 size={40} style={{ animation: 'ttspin 1s linear infinite', marginBottom: '1rem' }} />
            <p style={{ margin: 0 }}>Loading scroll…</p>
          </div>
        )}
        {error && (
          <p style={{ color: '#ef5350', textAlign: 'center', padding: '2rem' }}>{error}</p>
        )}
        {blobUrl && !error && (
          <embed
            src={blobUrl}
            type="application/pdf"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}
      </div>

      {/* Read-Aloud Panel — docked at the bottom */}
      <ReadAloudPanel noteId={noteId} isPdf={true} />

      <style>{`@keyframes ttspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PdfViewer;
