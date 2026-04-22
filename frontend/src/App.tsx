import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Bell } from 'lucide-react';
import './App.css';
import api from './api';
import ProtectedRoute from './components/ProtectedRoute';
import PrivilegedRoute from './components/PrivilegedRoute';
import Home from './pages/Home';
import Year01 from './pages/Year01';

import NotFound from './pages/NotFound';
import QuizMaker from './pages/QuizMaker';
import TakeQuiz from './pages/TakeQuiz';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/AdminDashboard';
import Forbidden from './pages/Forbidden';
import About from './pages/About';
import NoteUploader from './pages/NoteUploader';
import MyVault from './pages/MyVault';
import Semester from './pages/Semester';
import ModuleView from './pages/ModuleView';
import ReviewEssays from './pages/ReviewEssays';
import CreateModule from './pages/CreateModule';
import EditModule from './pages/EditModule';
import ThemeToggle from './components/ThemeToggle';
import MyQuizzes from './pages/MyQuizzes';
import PerformanceAnalytics from './pages/PerformanceAnalytics';
import MyProfile from './pages/MyProfile';
import PublicProfile from './pages/PublicProfile';
import CollectionView from './pages/CollectionView';
import NoteViewer from './pages/NoteViewer';
import Subscriptions from './pages/Subscriptions';
import FloatingRaven from './components/FloatingRaven';
import Footer from './components/Footer';
import SubmitAd from './pages/SubmitAd';
import BusinessContact from './pages/BusinessContact';
import VideoUploader from './pages/VideoUploader';
import VideoViewer from './pages/VideoViewer';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ApiKeySettings from './pages/ApiKeySettings';

// ── NotificationBell: lives inside <Router> so it can use useNavigate ─────────
function NotificationBell({ notifications, onMarkRead, onRefresh }: {
  notifications: any[];
  onMarkRead: (id: number) => Promise<void>;
  onRefresh: () => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleClick = async (n: any) => {
    // Always mark as read
    if (!n.is_read) {
      await onMarkRead(n.id);
      onRefresh();
    }
    setShowDropdown(false);
    // Navigate using React Router (SPA, no full reload)
    if (n.destination_url) {
      navigate(n.destination_url);
    } else if (n.message && n.message.includes('essay') && n.quiz_id) {
      navigate(`/review-essays/${n.quiz_id}`);
    }
  };

  return (
    <div className="notification-container" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setShowDropdown(v => !v)}>
      <Bell size={20} color="var(--accent-gold)" />
      {unreadCount > 0 && (
        <span className="notification-badge" style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', fontSize: '0.7rem', padding: '2px 5px', borderRadius: '50%' }}>
          {unreadCount}
        </span>
      )}
      {showDropdown && (
        <div className="notifications-dropdown" style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border-dark)', padding: '1rem', width: '300px', zIndex: 100, borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent-gold)' }}>Ravens from the Citadel</h4>
          {notifications.length === 0 ? (
            <p style={{ fontSize: '0.9rem' }}>No new messages.</p>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                style={{
                  padding: '8px', borderBottom: '1px solid var(--border-dark)', fontSize: '0.85rem',
                  color: n.is_read ? 'var(--text-muted)' : 'var(--text-main)', cursor: 'pointer',
                  display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
                }}
                onClick={e => { e.stopPropagation(); handleClick(n); }}
              >
                <span style={{ marginTop: '2px', fontSize: '0.6rem', color: n.is_read ? 'var(--text-muted)' : 'var(--accent-gold)' }}>●</span>
                <span>{n.message}</span>
                {n.destination_url && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--accent-gold)', whiteSpace: 'nowrap' }}>→</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [modules, setModules] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const markRead = async (id: number) => {
    await api.put(`/notifications/${id}/read`);
  };

  const fetchModules = async () => {
    try {
      const res = await api.get('/modules');
      setModules(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const res = await api.get('/auth/me');
          const updatedUser = res.data;
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
          window.dispatchEvent(new Event('user-updated'));
          fetchNotifications();
          fetchModules();
        } catch (error) {
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    initApp();
  }, [fetchNotifications]);

  // ── Poll for new notifications every 30s ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const currentPath = window.location.pathname;
  useEffect(() => {
    let rawTitle = "Support by DV";
    if (currentPath.startsWith("/module/")) rawTitle = "Citadel | Module";
    else if (currentPath.includes("quiz-maker")) rawTitle = "Quiz Maker | Citadel";
    else if (currentPath.includes("take-quiz")) rawTitle = "Quiz | Citadel";
    else if (currentPath.includes("leaderboard")) rawTitle = "Throne Room | Citadel";
    else if (currentPath.includes("my-vault")) rawTitle = "My Vault | Citadel";
    else if (currentPath.includes("my-quizzes")) rawTitle = "My Quizzes | Citadel";
    else if (currentPath.includes("analytics")) rawTitle = "Performance | Citadel";
    else if (currentPath.includes("upload-note")) rawTitle = "Upload Note | Citadel";
    else if (currentPath.includes("admin-dashboard")) rawTitle = "Small Council | Citadel";
    else if (currentPath.includes("about")) rawTitle = "About | Citadel";
    else if (currentPath === "/") rawTitle = "Citadel | Home";

    document.title = rawTitle;
  }, [currentPath]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Group modules by Year and Semester for dynamic nav
  const groupedModules = modules.reduce((acc: any, mod) => {
    const key = `Y${mod.year}S${mod.semester}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(mod);
    return acc;
  }, {});

  const openModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const response = await api.post('/auth/google', { token: credentialResponse.credential });
      const loggedInUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      setIsModalOpen(false);
      fetchModules();
    } catch (error: any) {
      console.error("Authentication failed:", error);
      alert(error.response?.data?.detail || "Failed to log in.");
    }
  };

  const handleLocalAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'register' && !agreedToPrivacy) {
      alert("A man must agree to the Privacy Policy before pledging loyalty.");
      return;
    }
    try {
      let response;
      if (authMode === 'register') {
        response = await api.post('/auth/register', { email, password, first_name: firstName, last_name: lastName });
      } else {
        response = await api.post('/auth/login', { email, password });
      }
      const loggedInUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      setIsModalOpen(false);
      fetchNotifications();
      fetchModules();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Authentication Failed.");
    }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); }
    catch (error) { console.error("Failed to clear the session:", error); }
    finally {
      localStorage.removeItem('user');
      setUser(null);
      setIsMenuOpen(false);
      setModules([]);
    }
  };

  // ── Dynamically sync --quiz-topbar-h to actual navbar height ─────────────
  // This fixes content overlap at any unusual resolution where the navbar
  // height grows (e.g., logo wraps to 2 lines, nav items wrap, etc.).
  const navbarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navbarRef.current;
    if (!nav) return;
    const update = () =>
      document.documentElement.style.setProperty('--quiz-topbar-h', `${nav.offsetHeight}px`);
    update(); // set immediately on mount
    const ro = new ResizeObserver(update);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  if (isLoading) return <div className="page-container text-title" style={{ textAlign: 'center', marginTop: '5rem', color: 'var(--accent-gold)' }}>Loading the Citadel... ⏳</div>;

  return (
    <Router>
      <div className="app-container">
        <nav ref={navbarRef} className="navbar">
          <Link to="/" className="logo brand-font">Support by DV</Link>

          <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
            {user && (
              <>
                {Object.keys(groupedModules)
                  .filter(key => key.startsWith(`Y${user.current_year || 2}`))
                  .sort()
                  .map(key => (
                    <Link
                      key={key}
                      to={`/semester/${key}`}
                      className="nav-item"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {key}
                    </Link>
                  ))}
                <Link to="/my-quizzes" className="nav-item" onClick={() => setIsMenuOpen(false)}>My Quizzes</Link>
                <Link to="/my-vault" className="nav-item" onClick={() => setIsMenuOpen(false)}>My Vault</Link>
              </>
            )}
            <Link to="/leaderboard" className="nav-item" onClick={() => setIsMenuOpen(false)}>Throne Room</Link>
            <Link to="/analytics" className="nav-item" onClick={() => setIsMenuOpen(false)}>Performance</Link>
            <Link to="/about" className="nav-item" onClick={() => setIsMenuOpen(false)}>About</Link>
            <Link to="/subscriptions" className="nav-item" style={{ color: 'var(--accent-gold)' }} onClick={() => setIsMenuOpen(false)}>Subscriptions</Link>

            {user && (user.role === 'noOne' || user.role === 'admin') && (
              <>
                <Link to="/admin-dashboard" className="nav-item" style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }} onClick={() => setIsMenuOpen(false)}>Small Council</Link>
                <Link to="/create-module" className="nav-item" style={{ color: 'var(--accent-gold)' }} onClick={() => setIsMenuOpen(false)}>Forge Module</Link>
                {user.role === 'noOne' && <Link to="/forge-video" className="nav-item" style={{ color: 'var(--accent-magenta)' }} onClick={() => setIsMenuOpen(false)}>Forge Video</Link>}
              </>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '1px solid var(--border-dark)', paddingLeft: '1.5rem', marginLeft: '0.5rem' }}>
              <ThemeToggle />
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <NotificationBell
                    notifications={notifications}
                    onMarkRead={markRead}
                    onRefresh={fetchNotifications}
                  />
                  <span className="text-desc" style={{ color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>
                    <Link to="/profile" style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 600 }} onClick={() => setIsMenuOpen(false)}>
                      {user.first_name}
                    </Link>
                  </span>
                  <button onClick={handleLogout} className="btn-logout">Logout</button>
                </div>
              ) : (
                <button onClick={() => openModal('login')} className="btn-primary">Log In</button>
              )}
            </div>
          </div>

          <button className="mobile-toggle" onClick={toggleMenu}>{isMenuOpen ? '✕' : '☰'}</button>
        </nav>

        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home openModal={openModal} user={user} />} />
            <Route path="/semester/:semesterKey" element={<ProtectedRoute user={user}><Semester /></ProtectedRoute>} />
            <Route path="/module/:moduleId" element={<ProtectedRoute user={user}><ModuleView /></ProtectedRoute>} />
            <Route path="/module/:moduleId/:tab" element={<ProtectedRoute user={user}><ModuleView /></ProtectedRoute>} />
            <Route path="/review-essays/:quizId" element={<ProtectedRoute user={user}><ReviewEssays /></ProtectedRoute>} />
            <Route path="/year01" element={<ProtectedRoute user={user}><Year01 /></ProtectedRoute>} />
            <Route path="/quiz-maker" element={<ProtectedRoute user={user}><QuizMaker /></ProtectedRoute>} />
            <Route path="/edit-quiz/:id" element={<ProtectedRoute user={user}><QuizMaker /></ProtectedRoute>} />
            <Route path="/take-quiz/:id" element={<ProtectedRoute user={user}><TakeQuiz /></ProtectedRoute>} />
            <Route path="/take-quiz/:id/q/:questionIndex" element={<ProtectedRoute user={user}><TakeQuiz /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute user={user}><Leaderboard /></ProtectedRoute>} />
            <Route path="/upload-note" element={<ProtectedRoute user={user}><NoteUploader /></ProtectedRoute>} />
            <Route path="/my-vault" element={<ProtectedRoute user={user}><MyVault /></ProtectedRoute>} />
            <Route path="/collection/:id" element={<ProtectedRoute user={user}><CollectionView /></ProtectedRoute>} />
            <Route path="/notes/view/:noteId" element={<ProtectedRoute user={user}><NoteViewer /></ProtectedRoute>} />
            <Route path="/my-quizzes" element={<ProtectedRoute user={user}><MyQuizzes /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute user={user}><PerformanceAnalytics /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute user={user}><MyProfile /></ProtectedRoute>} />
            <Route path="/user/:id" element={<ProtectedRoute user={user}><PublicProfile /></ProtectedRoute>} />
            <Route path="/about" element={<About />} />
            <Route path="/admin-dashboard/:tab?" element={<PrivilegedRoute user={user}><AdminDashboard /></PrivilegedRoute>} />
            <Route path="/create-module" element={<PrivilegedRoute user={user}><CreateModule /></PrivilegedRoute>} />
            <Route path="/edit-module/:id" element={<PrivilegedRoute user={user}><EditModule /></PrivilegedRoute>} />
            <Route path="/subscriptions" element={<ProtectedRoute user={user}><Subscriptions /></ProtectedRoute>} />
            <Route path="/forbidden" element={<Forbidden />} />
            <Route path="/submit-ad" element={<SubmitAd />} />
            <Route path="/business-contact" element={<BusinessContact />} />
            <Route path="/forge-video" element={<PrivilegedRoute user={user}><VideoUploader /></PrivilegedRoute>} />
            <Route path="/videos/watch/:videoId" element={<ProtectedRoute user={user}><VideoViewer /></ProtectedRoute>} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/api-keys" element={<ProtectedRoute user={user}><ApiKeySettings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FloatingRaven />
          <Footer />
        </div>

        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
              <h2 className="brand-font" style={{ marginBottom: '1.5rem', color: 'var(--accent-gold)' }}>
                {authMode === 'login' ? 'A man have an account' : 'A man needs an account'}
              </h2>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => console.error("Google Login Failed")} theme="filled_black" shape="rectangular" text={authMode === 'login' ? 'signin_with' : 'signup_with'} width="300" />
              </div>

              <div style={{ margin: '1rem 0', color: 'var(--border-dark)' }}>──────── OR ────────</div>

              <form onSubmit={handleLocalAuth}>
                {authMode === 'register' && (
                  <>
                    <input type="text" placeholder="First Name" className="auth-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    <input type="text" placeholder="Last Name" className="auth-input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </>
                )}
                <input type="email" placeholder="Email Address" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    placeholder={authMode === 'register' ? 'Password (min. 8 characters)' : 'Password'}
                    className="auth-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={authMode === 'register' ? 8 : undefined}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                 {authMode === 'register' && (
                  <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                    <input 
                      type="checkbox" 
                      id="privacy-check"
                      checked={agreedToPrivacy} 
                      onChange={(e) => setAgreedToPrivacy(e.target.checked)} 
                      required 
                    />
                    <label htmlFor="privacy-check">
                      By pledging loyalty, I agree to the <Link to="/privacy-policy" target="_blank" onClick={(e) => e.stopPropagation()} style={{ color: 'var(--accent-gold)' }}>Privacy Policy</Link>
                    </label>
                  </div>
                )}
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: '100%', opacity: (authMode === 'register' && !agreedToPrivacy) ? 0.5 : 1 }}
                  disabled={authMode === 'register' && !agreedToPrivacy}
                >
                  {authMode === 'login' ? 'Enter the House' : 'Pledge Loyalty'}
                </button>
              </form>

              <div className="auth-switch" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                {authMode === 'login' ? "Don't have an account? A man needs an account." : "Already pledged? A man have an account."}
              </div>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;