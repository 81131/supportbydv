import React, { useState, useEffect, useRef } from 'react';
import { X, Send, AlertCircle, Bird, Loader2, ChevronLeft, Search, Users, MessageSquare, CheckCircle, Sparkles, Trophy, BookOpen, Key, Plus, Trash2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import ReactMarkdown from 'react-markdown';

const FloatingRaven: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const endRef = useRef<HTMLDivElement>(null);

  // Global Context
  const currentUserData = localStorage.getItem('user');
  const currentUser = currentUserData ? JSON.parse(currentUserData) : null;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'noOne';

  const [activeTab, setActiveTab] = useState<'ai' | 'maester' | 'tickets' | 'keys' | 'phonebook' | 'ongoing' | 'closed'>(isAdmin ? 'ongoing' : 'ai');

  const [isLoading, setIsLoading] = useState(false);
  
  // Shared state
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [ticketReply, setTicketReply] = useState('');
  
  // User Side state
  const [messages, setMessages] = useState<{role: 'user' | 'model', parts: string}[]>([
    { role: 'model', parts: "I am the Citadel AI Raven. How may I assist your journey today? (Billing, Issues, Subscriptions)" }
  ]);
  const [directIssue, setDirectIssue] = useState('');

  // Maester Chat state
  const [maesterMessages, setMaesterMessages] = useState<{role: 'user' | 'model', parts: string}[]>([
    { role: 'model', parts: "I am The Maester. I have access to your trial records. How may I guide your study today?" }
  ]);
  const [maesterInput, setMaesterInput] = useState('');

  // API Keys state
  const [personalKeys, setPersonalKeys] = useState<any[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  // Admin Side state
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newChatInput, setNewChatInput] = useState('');

  // Maester Specific
  const [hasMaester, setHasMaester] = useState(false);
  const [scholarStatus, setScholarStatus] = useState<{accuracy: number, attempts: number, weak: string[]} | null>(null);

  useEffect(() => {
     endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTicket?.messages, isOpen, activeTab, selectedUser, showDirectContact]);

  // Hook into URL search params to auto-open tickets if navigated from a notification
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tId = params.get('ticketID');
    if (tId) {
      setIsOpen(true);
      openTicket(parseInt(tId, 10));
    }
  }, [location.search]);

  useEffect(() => {
    fetchTickets();
    const inv = setInterval(fetchTickets, 10000);
    return () => clearInterval(inv);
  }, [isAdmin, currentUser?.id]);

  useEffect(() => {
    const checkMaester = async () => {
      if (!currentUser || isAdmin) return;
      try {
        const res = await api.get('/api-keys/me');
        setPersonalKeys(res.data);
        const active = res.data.some((k: any) => k.is_active);
        setHasMaester(active);
        
        if (active) {
          const statsRes = await api.get('/auth/profile/stats');
          setScholarStatus({
            accuracy: statsRes.data.accuracy_percentage || 0,
            attempts: statsRes.data.total_quizzes_taken || 0,
            weak: []
          });
        }
      } catch (e) {
        setHasMaester(false);
      }
    };
    checkMaester();
  }, [currentUser?.id, isOpen]); // Refresh when opened

  useEffect(() => {
    let interval: number;
    if (activeTicket) {
      interval = window.setInterval(() => {
        api.get(`/support/tickets/${activeTicket.ticket.id}`).then(res => setActiveTicket(res.data)).catch(() => {});
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [activeTicket?.ticket?.id]);

  const fetchTickets = async () => {
    if (!currentUser) return;
    try {
      if (isAdmin) {
        const res = await api.get('/support/tickets/all?category=Direct Chat');
        setTickets(res.data);
      } else {
        const res = await api.get('/support/tickets/me');
        setTickets(res.data);
      }
    } catch { }
  };

  const openTicket = async (id: number) => {
    try {
      setIsLoading(true);
      const res = await api.get(`/support/tickets/${id}`);
      setActiveTicket(res.data);
      if (isAdmin) setActiveTab(res.data.ticket.status === 'resolved' ? 'closed' : 'ongoing');
      else setActiveTab('tickets');
    } catch { } finally { setIsLoading(false); }
  };

  const handleTicketReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ticketReply.trim() || !activeTicket) return;
    
    setIsLoading(true);
    try {
      await api.post(`/support/tickets/${activeTicket.ticket.id}/reply`, { content: ticketReply });
      setTicketReply('');
      openTicket(activeTicket.ticket.id);
    } catch { } finally { setIsLoading(false); }
  };

  const handleResolveTicket = async () => {
    if (!activeTicket) return;
    setIsLoading(true);
    try {
      await api.put(`/support/tickets/${activeTicket.ticket.id}/resolve`);
      openTicket(activeTicket.ticket.id);
      fetchTickets();
    } catch {} finally { setIsLoading(false); }
  };

  const startDirectChat = async (targetUserId?: number, initialMessage?: string) => {
    const msg = initialMessage || newChatInput;
    if (!msg.trim()) return;
    setIsLoading(true);
    try {
      const res = await api.post('/support/tickets/direct', {
        user_id: targetUserId || currentUser.id,
        message: msg
      });
      setNewChatInput('');
      fetchTickets();
      if (!isAdmin) {
         setShowDirectContact(false);
         setDirectIssue('');
         setActiveTab('tickets');
      }
      openTicket(res.data.ticket_id);
    } catch {} finally { setIsLoading(false); }
  };

  // ----- User AI Specific -----
  const handleSendAI = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const newChat = [...messages, { role: 'user' as const, parts: userMessage }];
    setMessages(newChat);
    setInput('');
    setIsLoading(true);

    try {
      const historyToPass = newChat.slice(1, -1); 
      const res = await api.post('/support/chat', {
        message: userMessage,
        history: historyToPass
      });
      setMessages([...newChat, { role: 'model', parts: res.data.reply }]);
      if (res.data.escalated) fetchTickets();
    } catch (err: any) {
      setMessages([...newChat, { role: 'model', parts: "The raven lost its way. Connection error." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMaester = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!maesterInput.trim() || isLoading) return;

    const userMessage = maesterInput.trim();
    const newChat = [...maesterMessages, { role: 'user' as const, parts: userMessage }];
    setMaesterMessages(newChat);
    setMaesterInput('');
    setIsLoading(true);

    try {
      const historyForMaester = maesterMessages.slice(1).map(m => ({
        role: m.role,
        content: m.parts
      }));
      const res = await api.post('/ai-assistant/chat', {
        message: userMessage,
        history: historyForMaester
      });
      setMaesterMessages([...newChat, { role: 'model', parts: res.data.reply }]);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "The Maester is consulting the ancients. Try again later.";
      setMaesterMessages([...newChat, { role: 'model', parts: detail }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKey = async () => {
    if (!newKeyValue.trim()) return;
    setIsLoading(true);
    try {
      await api.post('/api-keys', { label: newKeyLabel || 'Raven Key', key: newKeyValue });
      setNewKeyLabel('');
      setNewKeyValue('');
      // refresh
      const res = await api.get('/api-keys/me');
      setPersonalKeys(res.data);
      setHasMaester(res.data.some((k: any) => k.is_active));
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to add key.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (!confirm("Are you sure? This will disable The Maester.")) return;
    setIsLoading(true);
    try {
      await api.delete(`/api-keys/${id}`);
      const res = await api.get('/api-keys/me');
      setPersonalKeys(res.data);
      setHasMaester(res.data.some((k: any) => k.is_active));
    } catch { } finally { setIsLoading(false); }
  };

  // ----- Admin Specific -----
  const handleSearchUsers = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/users?q=${searchQuery}`);
      setUsers(res.data);
    } catch {} finally { setIsLoading(false); }
  };

  if (location.pathname.includes('/take-quiz')) return null;

  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="floating-raven-button"
          style={{
            zIndex: 9999,
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
          {tickets.filter(t => t.status === 'in_progress' || (isAdmin && t.status === 'open')).length > 0 && (
            <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', padding: '4px 8px', fontSize: '10px', fontWeight: 'bold' }}>
              {tickets.filter(t => t.status === 'in_progress' || (isAdmin && t.status === 'open')).length}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="floating-raven-window" style={{
          zIndex: 9999,
          background: 'var(--bg-surface)', border: '1px solid var(--border-dark)',
          borderRadius: 16, display: 'flex', flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ background: 'var(--bg-deep)', padding: '1rem', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
              <Bird size={20} /> 
              {isAdmin ? 'Council Directory' : 'Citadel Raven'}
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* User Multi-Tabs */}
          {!isAdmin && !activeTicket && !showDirectContact && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-dark)', overflowX: 'auto', background: 'var(--bg-deep)' }}>
              <button onClick={() => setActiveTab('ai')} style={{ flex: 1, padding: '0.8rem', background: activeTab === 'ai' ? 'var(--bg-surface)' : 'transparent', color: activeTab === 'ai' ? 'var(--accent-gold)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', minWidth: '80px' }}>Raven</button>
              <button onClick={() => setActiveTab('maester')} style={{ flex: 1, padding: '0.8rem', background: activeTab === 'maester' ? 'var(--bg-surface)' : 'transparent', color: activeTab === 'maester' ? 'var(--accent-gold)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', minWidth: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                 <Sparkles size={12}/> Maester
              </button>
              <button onClick={() => setActiveTab('tickets')} style={{ flex: 1, padding: '0.8rem', background: activeTab === 'tickets' ? 'var(--bg-surface)' : 'transparent', color: activeTab === 'tickets' ? 'var(--accent-gold)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', minWidth: '80px', position: 'relative' }}>
                Help
                {tickets.filter(t => t.status === 'in_progress').length > 0 && (
                  <span style={{ position: 'absolute', top: '5px', right: '5px', background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '9px' }}>
                    {tickets.filter(t => t.status === 'in_progress').length}
                  </span>
                )}
              </button>
              <button onClick={() => setActiveTab('keys')} style={{ flex: 1, padding: '0.8rem', background: activeTab === 'keys' ? 'var(--bg-surface)' : 'transparent', color: activeTab === 'keys' ? 'var(--accent-gold)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', minWidth: '70px' }} title="API Keys">Keys</button>
            </div>
          )}

          {/* Admin Multi-Tabs */}
          {isAdmin && !activeTicket && !selectedUser && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-dark)' }}>
              <button onClick={() => setActiveTab('ongoing')} style={{ flex: 1, padding: '0.8rem', background: activeTab === 'ongoing' ? 'var(--bg-surface)' : 'var(--bg-deep)', color: activeTab === 'ongoing' ? 'var(--accent-gold)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', position: 'relative' }}>
                <MessageSquare size={14} style={{ marginRight: '4px' }}/> Ongoing
                {tickets.filter(t => t.status === 'open').length > 0 && (
                  <span style={{ position: 'absolute', top: '2px', right: '5px', background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '9px' }}>
                    {tickets.filter(t => t.status === 'open').length}
                  </span>
                )}
              </button>
              <button onClick={() => setActiveTab('closed')} style={{ flex: 1, padding: '0.8rem', background: activeTab === 'closed' ? 'var(--bg-surface)' : 'var(--bg-deep)', color: activeTab === 'closed' ? 'var(--accent-gold)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                <CheckCircle size={14} style={{ marginRight: '4px' }}/> Closed
              </button>
              <button onClick={() => setActiveTab('phonebook')} style={{ flex: 1, padding: '0.8rem', background: activeTab === 'phonebook' ? 'var(--bg-surface)' : 'var(--bg-deep)', color: activeTab === 'phonebook' ? 'var(--accent-gold)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>
                 <Users size={14} style={{ marginRight: '4px' }}/> Directory
              </button>
            </div>
          )}

          {/* ================= USER VIEWS ================= */}
          {!isAdmin && activeTab === 'ai' && !activeTicket && !showDirectContact && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.map((m, i) => (
                  <div key={i} style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    background: m.role === 'user' ? 'var(--accent-gold)' : 'var(--bg-deep)',
                    color: m.role === 'user' ? 'black' : 'var(--text-main)',
                    padding: '0.8rem 1rem', borderRadius: 12, border: m.role === 'user' ? 'none' : '1px solid var(--border-dark)',
                    maxWidth: '85%', fontSize: '0.9rem', lineHeight: 1.4, whiteSpace: 'pre-wrap'
                  }}>
                     {m.parts}
                  </div>
                ))}
                {isLoading && <Loader2 size={16} className="lucide-spin" style={{ color: 'var(--accent-gold)', animation: 'spin 2s linear infinite' }} />}
                <div ref={endRef} />
              </div>
              <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', borderTop: '1px solid var(--border-dark)', background: '#1a1a1a' }}>
                 <button onClick={() => setInput("How do subscriptions work?")} style={{ whiteSpace: 'nowrap', border: '1px solid var(--text-muted)', background: 'transparent', color: 'var(--text-muted)', borderRadius: 20, padding: '0.3rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer' }}>Subscriptions</button>
                 <button onClick={() => setInput("I found a bug!")} style={{ whiteSpace: 'nowrap', border: '1px solid var(--text-muted)', background: 'transparent', color: 'var(--text-muted)', borderRadius: 20, padding: '0.3rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer' }}>Report Bug</button>
                 <button onClick={() => setShowDirectContact(true)} style={{ whiteSpace: 'nowrap', border: '1px solid #e74c3c', background: 'transparent', color: '#e74c3c', borderRadius: 20, padding: '0.3rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><AlertCircle size={12}/> Talk to Admin</button>
              </div>
              <form onSubmit={handleSendAI} style={{ padding: '1rem', display: 'flex', gap: '0.5rem', background: 'var(--bg-deep)' }}>
                <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask the raven..." style={{ flex: 1, padding: '0.8rem', borderRadius: 20, border: '1px solid var(--border-dark)', background: 'var(--bg-surface)', color: 'var(--text-main)', outline: 'none' }} />
                <button type="submit" disabled={!input.trim() || isLoading} style={{ background: 'var(--accent-gold)', color: 'black', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={18} /></button>
              </form>
            </>
          )}

          {!isAdmin && activeTab === 'maester' && !activeTicket && !showDirectContact && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {!hasMaester ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <Sparkles size={40} color="var(--accent-gold)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <h3 className="brand-font" style={{ color: 'var(--accent-gold)' }}>The Maester is Silent</h3>
                    <p className="text-desc" style={{ fontSize: '0.85rem' }}>Add a Gemini API key in the <strong>Keys</strong> tab to unlock your personal study assistant.</p>
                  </div>
                ) : (
                  <>
                    {scholarStatus && (
                      <div style={{ 
                        background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, transparent 100%)',
                        border: '1px solid rgba(212,175,55,0.3)',
                        borderRadius: '12px',
                        padding: '0.8rem',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accuracy</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Trophy size={14} color="var(--accent-gold)" />
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-gold)', fontSize: '0.9rem' }}>{scholarStatus.accuracy}%</span>
                          </div>
                        </div>
                        <div style={{ width: '1px', height: '20px', background: 'var(--border-dark)' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trials</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <BookOpen size={14} color="var(--accent-gold)" />
                            <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '0.9rem' }}>{scholarStatus.attempts}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {maesterMessages.map((m, i) => (
                      <div key={i} style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        background: m.role === 'user' ? 'var(--accent-gold)' : 'var(--bg-deep)',
                        color: m.role === 'user' ? 'black' : 'var(--text-main)',
                        padding: '0.8rem 1rem', borderRadius: 12, border: m.role === 'user' ? 'none' : '1px solid var(--border-dark)',
                        maxWidth: '85%', fontSize: '0.9rem', lineHeight: 1.4, whiteSpace: 'pre-wrap'
                      }}>
                        <ReactMarkdown>{m.parts}</ReactMarkdown>
                      </div>
                    ))}
                  </>
                )}
                {isLoading && activeTab === 'maester' && <Loader2 size={16} className="lucide-spin" style={{ color: 'var(--accent-gold)', animation: 'spin 2s linear infinite' }} />}
                <div ref={endRef} />
              </div>
              {hasMaester && (
                <form onSubmit={handleSendMaester} style={{ padding: '1rem', display: 'flex', gap: '0.5rem', background: 'var(--bg-deep)' }}>
                  <input value={maesterInput} onChange={e => setMaesterInput(e.target.value)} placeholder="Consult the Maester..." style={{ flex: 1, padding: '0.8rem', borderRadius: 20, border: '1px solid var(--border-dark)', background: 'var(--bg-surface)', color: 'var(--text-main)', outline: 'none' }} />
                  <button type="submit" disabled={!maesterInput.trim() || isLoading} style={{ background: 'var(--accent-gold)', color: 'black', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={18} /></button>
                </form>
              )}
            </>
          )}

          {!isAdmin && activeTab === 'keys' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid var(--border-dark)', borderRadius: '12px', padding: '1rem' }}>
                <h4 className="brand-font" style={{ color: 'var(--accent-gold)', margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Plus size={16}/> Add Gemini Key
                </h4>
                <input 
                  className="auth-input" 
                  placeholder="Key Label (e.g. Primary)" 
                  value={newKeyLabel} 
                  onChange={e => setNewKeyLabel(e.target.value)}
                  style={{ marginBottom: '0.6rem' }}
                />
                <input 
                  className="auth-input" 
                  type="password"
                  placeholder="Paste AIza... key here" 
                  value={newKeyValue} 
                  onChange={e => setNewKeyValue(e.target.value)}
                  style={{ marginBottom: '0.8rem' }}
                />
                <button 
                  onClick={handleAddKey} 
                  disabled={!newKeyValue.trim() || isLoading}
                  className="btn-primary" 
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  {isLoading ? 'Processing...' : 'Secure Key'}
                </button>
              </div>

              <div>
                <h4 className="brand-font" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.8rem' }}>Your Secure Keys</h4>
                {personalKeys.length === 0 ? (
                  <p className="text-desc" style={{ fontSize: '0.8rem' }}>No keys found. Add one to activate AI features.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {personalKeys.map(k => (
                      <div key={k.id} style={{ 
                        padding: '0.8rem', background: 'var(--bg-deep)', borderRadius: '8px', 
                        border: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: k.is_active ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{k.label}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Masked: AIza...****</div>
                        </div>
                        <button onClick={() => handleDeleteKey(k.id)} className="btn-ghost" style={{ padding: '0.3rem', color: '#ff6b6b' }}><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                Keys are encrypted server-side and never exposed to the frontend.
              </p>
            </div>
          )}

          {!isAdmin && showDirectContact && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem' }}>
               <button onClick={() => setShowDirectContact(false)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: '1rem' }}><ChevronLeft size={20}/> Back to AI</button>
               <h4 style={{ margin: '0 0 1rem 0', color: 'var(--accent-gold)' }}>Contact Admins Directly</h4>
               <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Send a direct message to the Council. A human Maester will reply to you here.</p>
               <textarea value={directIssue} onChange={(e) => setDirectIssue(e.target.value)} placeholder="Describe your issue..." style={{ flex: 1, padding: '1rem', background: 'var(--bg-deep)', border: '1px solid var(--border-dark)', color: 'var(--text-main)', borderRadius: 8, outline: 'none', resize: 'none' }} />
               <button onClick={() => startDirectChat(undefined, directIssue)} disabled={!directIssue.trim() || isLoading} style={{ marginTop: '1rem', padding: '1rem', background: 'var(--accent-gold)', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: 8, cursor: directIssue.trim() ? 'pointer' : 'default' }}>{isLoading ? 'SENDING...' : 'DISPATCH RAVEN'}</button>
            </div>
          )}

          {!isAdmin && activeTab === 'tickets' && !activeTicket && !showDirectContact && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
               {tickets.length === 0 ? <p className="text-desc" style={{ fontSize: '0.9rem' }}>No open scrolls with the Maesters.</p> : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                   {tickets.map(t => (
                     <div key={t.id} onClick={() => openTicket(t.id)} style={{ padding: '1rem', background: 'var(--bg-deep)', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border-dark)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Ticket #{t.id} {t.category === 'Direct Chat' && <Users size={12} color="var(--accent-gold)"/>}</span>
                         <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 12, border: '1px solid var(--text-muted)' }}>{t.status.toUpperCase()}</span>
                       </div>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.category}</span>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          )}

          {/* ================= ADMIN VIEWS ================= */}
          {isAdmin && activeTab === 'phonebook' && !activeTicket && !selectedUser && (
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <form onSubmit={handleSearchUsers} style={{ padding: '1rem', borderBottom: '1px solid var(--border-dark)', display: 'flex', gap: '0.5rem' }}>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search ID, Name, Email..." style={{ flex: 1, padding: '0.8rem', borderRadius: 8, border: '1px solid var(--border-dark)', background: 'var(--bg-deep)', color: 'var(--text-main)', outline: 'none' }} />
                  <button type="submit" disabled={!searchQuery.trim() || isLoading} style={{ background: 'var(--accent-gold)', color: 'black', border: 'none', borderRadius: 8, padding: '0 1rem' }}><Search size={20}/></button>
                </form>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {users.length === 0 && !isLoading && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>Search for users to message directly.</p>}
                  {users.map(u => (
                    <div key={u.id} onClick={() => setSelectedUser(u)} style={{ padding: '1rem', background: 'var(--bg-deep)', border: '1px solid var(--border-dark)', borderRadius: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                       <strong style={{ color: 'var(--accent-gold)' }}>{u.first_name} {u.last_name}</strong>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email} | ID: {u.id}</span>
                    </div>
                  ))}
                </div>
             </div>
          )}

          {isAdmin && selectedUser && !activeTicket && (
             <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
               <button onClick={() => setSelectedUser(null)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: '1rem' }}><ChevronLeft size={20}/> Directory</button>
               <h4 style={{ margin: '0 0 1rem 0' }}>{selectedUser.first_name}'s Direct Threads</h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
                  {tickets.filter(t => t.user_id === selectedUser.id).map(t => (
                     <div key={t.id} onClick={() => openTicket(t.id)} style={{ padding: '0.8rem', background: 'var(--bg-deep)', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border-dark)', fontSize: '0.85rem' }}>
                       <strong>Ticket #{t.id}</strong> — <span style={{ color: t.status === 'resolved' ? '#2ecc71' : 'var(--accent-gold)' }}>{t.status.toUpperCase()}</span>
                     </div>
                  ))}
                  {tickets.filter(t => t.user_id === selectedUser.id).length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No previous direct threads.</span>}
               </div>

               <div style={{ padding: '1rem', background: '#111', borderRadius: 8, border: '1px solid var(--border-dark)' }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)' }}>Start New Chat</h5>
                  <textarea value={newChatInput} onChange={e => setNewChatInput(e.target.value)} placeholder="Type opening message..." style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-deep)', border: '1px solid var(--border-dark)', color: 'var(--text-main)', borderRadius: 8, resize: 'none', marginBottom: '0.5rem', outline: 'none' }} />
                  <button onClick={() => startDirectChat(selectedUser.id)} disabled={!newChatInput.trim()} style={{ width: '100%', padding: '0.8rem', background: 'var(--accent-gold)', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: 8, cursor: newChatInput.trim() ? 'pointer' : 'default' }}>START CHAT</button>
               </div>
             </div>
          )}

          {isAdmin && (activeTab === 'ongoing' || activeTab === 'closed') && !activeTicket && !selectedUser && (
             <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
               {tickets.filter(t => activeTab === 'ongoing' ? t.status !== 'resolved' : t.status === 'resolved').length === 0 ? (
                 <p className="text-desc" style={{ fontSize: '0.9rem' }}>No {activeTab} direct threads.</p>
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                   {tickets.filter(t => activeTab === 'ongoing' ? t.status !== 'resolved' : t.status === 'resolved').map(t => (
                     <div key={t.id} onClick={() => openTicket(t.id)} style={{ padding: '1rem', background: 'var(--bg-deep)', borderRadius: 8, cursor: 'pointer', border: t.status === 'open' ? '1px solid var(--accent-gold)' : '1px solid var(--border-dark)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Ticket #{t.id} (Direct)</span>
                         <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 12, border: '1px solid var(--text-muted)' }}>{t.status.toUpperCase()}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          )}

          {/* ================= SHARED ACTIVE TICKET MODAL ================= */}
          {activeTicket ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '0.8rem', background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={() => setActiveTicket(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><ChevronLeft size={20} /></button>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent-gold)' }}>Ticket #{activeTicket.ticket.id}</div>
                </div>
                {activeTicket.ticket.status !== 'resolved' && (
                  <button onClick={handleResolveTicket} style={{ background: '#2ecc71', color: 'black', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>RESOLVE</button>
                )}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Embedded system header for context */}
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', background: '#111', padding: '0.5rem', borderRadius: 8 }}>
                  Category: <strong>{activeTicket.ticket.category}</strong> | User ID: <strong>{activeTicket.ticket.user_id}</strong>
                </div>

                {activeTicket.messages.map((m: any) => {
                   const isMe = m.sender_role === (isAdmin ? 'admin' : 'user');
                   return (
                    <div key={m.id} style={{ 
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      background: isMe ? 'var(--dark-gold)' : 'var(--bg-deep)',
                      color: isMe ? '#fff' : 'var(--text-main)',
                      padding: '0.8rem 1rem', borderRadius: 12, maxWidth: '85%', fontSize: '0.9rem',
                      border: isMe ? 'none' : '1px solid var(--border-dark)'
                    }}>
                      <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.7rem', color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--accent-gold)', fontWeight: 'bold' }}>
                        {isMe ? 'YOU' : m.sender_role.toUpperCase() === 'ADMIN' ? 'MAESTER' : 'SCHOLAR'}
                      </p>
                      {m.content}
                    </div>
                  );
                })}
                {isLoading && <Loader2 size={16} className="lucide-spin" style={{ alignSelf: 'flex-start', color: 'var(--accent-gold)', animation: 'spin 2s linear infinite' }} />}
                <div ref={endRef} />
              </div>

              {activeTicket.ticket.status !== 'resolved' && (
                <form onSubmit={handleTicketReply} style={{ padding: '0.8rem', display: 'flex', gap: '0.5rem', background: 'var(--bg-deep)', borderTop: '1px solid var(--border-dark)' }}>
                  <input 
                    value={ticketReply} onChange={e => setTicketReply(e.target.value)}
                    placeholder="Type reply..."
                    style={{ flex: 1, padding: '0.8rem', borderRadius: 20, border: '1px solid var(--border-dark)', background: '#111', color: 'var(--text-main)', outline: 'none' }}
                  />
                  <button type="submit" disabled={!ticketReply.trim() || isLoading} style={{ background: 'var(--accent-gold)', color: 'black', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Send size={18} />
                  </button>
                </form>
              )}
            </div>
          ) : null}

        </div>
      )}
    </>
  );
};

export default FloatingRaven;
