import React, { useState, useEffect, useRef } from 'react';
import { X, Send, AlertCircle, Bird, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import api from '../api';

const FloatingRaven: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', parts: string}[]>([
    { role: 'model', parts: "I am the Citadel AI Raven. How may I assist your journey today? (Billing, Issues, Subscriptions)" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Hide on Quiz Take
  if (location.pathname.includes('/take-quiz')) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const newChat = [...messages, { role: 'user' as const, parts: userMessage }];
    setMessages(newChat);
    setInput('');
    setIsLoading(true);

    try {
      // Pass history excluding the very first welcome message just to be clean, or pass all
      const historyToPass = newChat.slice(1, -1); 
      const res = await api.post('/support/chat', {
        message: userMessage,
        history: historyToPass
      });
      setMessages([...newChat, { role: 'model', parts: res.data.reply }]);
    } catch (err) {
      setMessages([...newChat, { role: 'model', parts: "The raven lost its way. Connection error." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const escalateToAdmin = async () => {
    setIsLoading(true);
    try {
        await api.post('/support/escalate', {
            category: "General Escalation",
            description: "User requested human intervention via Citadel Raven.",
            chat_history: JSON.stringify(messages)
        });
        setMessages([...messages, { role: 'model', parts: "A scroll has been dispatched to the Small Council. A Maester will review your request soon."}]);
    } catch (e) {
        setMessages([...messages, { role: 'model', parts: "Failed to dispatch scroll to the council."}]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      {/* Start Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
            background: 'var(--bg-deep)', border: '2px solid var(--accent-gold)',
            color: 'var(--accent-gold)', borderRadius: '50%', width: 60, height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(212,175,55,0.3)', cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Bird size={30} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
          width: '350px', background: 'var(--bg-surface)', border: '1px solid var(--border-dark)',
          borderRadius: 16, display: 'flex', flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden',
          height: '500px', maxHeight: '80vh'
        }}>
          {/* Header */}
          <div style={{ background: 'var(--bg-deep)', padding: '1rem', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
              <Bird size={20} /> Citadel Raven
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((m, i) => {
              const parseMessage = (text: string, role: string) => {
                let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                if (role === 'model') {
                   safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                      .replace(/\*(.*?)\*/g, '<em>$1</em>');
                }
                return safeText;
              };
              
              return (
                <div key={i} style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  background: m.role === 'user' ? 'var(--accent-gold)' : 'var(--bg-deep)',
                  color: m.role === 'user' ? 'black' : 'var(--text-main)',
                  padding: '0.8rem 1rem', borderRadius: 12, border: m.role === 'user' ? 'none' : '1px solid var(--border-dark)',
                  maxWidth: '85%', fontSize: '0.9rem', lineHeight: 1.4, whiteSpace: 'pre-wrap'
                }} dangerouslySetInnerHTML={{ __html: parseMessage(m.parts, m.role) }} />
              );
            })}
            {isLoading && (
               <div style={{ alignSelf: 'flex-start', color: 'var(--accent-gold)' }}>
                 <Loader2 size={16} className="lucide-spin" style={{ animation: 'spin 2s linear infinite' }} />
               </div>
            )}
            <div ref={endRef} />
          </div>

          {/* FAQ / Quick Actions */}
          <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', borderTop: '1px solid var(--border-dark)', background: '#1a1a1a' }}>
             <button onClick={() => setInput("How do subscriptions work?")} style={{ whiteSpace: 'nowrap', border: '1px solid var(--text-muted)', background: 'transparent', color: 'var(--text-muted)', borderRadius: 20, padding: '0.3rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer' }}>Subscriptions</button>
             <button onClick={() => setInput("I found a bug!")} style={{ whiteSpace: 'nowrap', border: '1px solid var(--text-muted)', background: 'transparent', color: 'var(--text-muted)', borderRadius: 20, padding: '0.3rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer' }}>Report Bug</button>
             <button onClick={escalateToAdmin} style={{ whiteSpace: 'nowrap', border: '1px solid #e74c3c', background: 'transparent', color: '#e74c3c', borderRadius: 20, padding: '0.3rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><AlertCircle size={12}/> Talk to Admin</button>
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ display: 'flex', padding: '1rem', background: 'var(--bg-deep)', borderTop: '1px solid var(--border-dark)', gap: '0.5rem' }}>
            <input 
              value={input} onChange={e => setInput(e.target.value)}
              placeholder="Dispatch a message..."
              style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', color: 'white', padding: '0.8rem', borderRadius: 8, outline: 'none' }}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()} style={{ background: 'var(--accent-gold)', color: 'black', border: 'none', borderRadius: 8, padding: '0 1rem', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
               <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default FloatingRaven;
