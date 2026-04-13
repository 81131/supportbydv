import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { 
  ShieldAlert, Users, ScrollText, Lock, Unlock, 
  VenetianMask, BadgeCheck, Shield, User as UserIcon, Activity, AlertTriangle, Edit3, CheckCircle, XCircle, FileText, Send
} from 'lucide-react';

import Forbidden from './Forbidden'; 

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [adRequests, setAdRequests] = useState<any[]>([]);
  const [businessRequests, setBusinessRequests] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [ticketReply, setTicketReply] = useState("");
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'modules' | 'requests' | 'support' | 'ads' | 'business'>((tab as any) || 'users');
  const [isLoading, setIsLoading] = useState(true);

  // New Module Form State
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleCode, setNewModuleCode] = useState('');
  const [newModuleYear, setNewModuleYear] = useState(1);
  const [newModuleSemester, setNewModuleSemester] = useState(1);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  if (currentUser?.role !== 'noOne' && currentUser?.role !== 'admin') {
    return <Forbidden />;
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (tab) {
      setActiveTab(tab as any);
    } else {
      setActiveTab('users');
    }
  }, [tab]);

  useEffect(() => {
    let interval: number;
    if (activeTicket) {
      interval = window.setInterval(() => {
        api.get(`/support/tickets/${activeTicket.ticket.id}`).then(res => setActiveTicket(res.data)).catch(() => {});
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeTicket?.ticket?.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const isNoOne = currentUser?.role === 'noOne';
      const [usersRes, logsRes, modulesRes, requestsRes, ticketsRes, adsRes, bizRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/audit-logs'),
        api.get('/modules'),
        api.get('/subscriptions/requests/all'),
        api.get('/support/tickets/all?category=General Escalation'),
        isNoOne ? api.get('/ads/requests/pending') : Promise.resolve({ data: [] }),
        isNoOne ? api.get('/support/business/pending') : Promise.resolve({ data: [] })
      ]);
      setUsers(usersRes.data);
      setLogs(logsRes.data);
      setModules(modulesRes.data);
      setAllRequests(requestsRes.data);
      setSupportTickets(ticketsRes.data);
      setAdRequests(adsRes.data);
      setBusinessRequests(bizRes.data);
    } catch (error) {
      console.error("Failed to fetch admin data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/modules', {
        name: newModuleName,
        code: newModuleCode,
        year: newModuleYear,
        semester: newModuleSemester
      });
      alert("New module forged in the archives!");
      setNewModuleName('');
      setNewModuleCode('');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to create module.");
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (!window.confirm(`Are you sure you want to change this scholar's role to ${newRole.toUpperCase()}?`)) return;
    
    try {
      await api.put(`/admin/users/${userId}/role`, { new_role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      fetchData(); 
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to update role.");
    }
  };

  const handleSuspendToggle = async (userId: number, currentStatus: boolean) => {
    const action = currentStatus ? "restore" : "suspend";
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      await api.put(`/admin/users/${userId}/suspend`, { is_suspended: !currentStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, is_suspended: !currentStatus } : u));
      fetchData(); 
    } catch (error: any) {
      alert(error.response?.data?.detail || `Failed to ${action} user.`);
    }
  };

  const handleApproveReq = async (id: number) => {
    try {
      await api.put(`/subscriptions/requests/${id}/approve`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error approving request.'); }
  };

  const handleRejectReq = async (id: number) => {
    try {
      await api.put(`/subscriptions/requests/${id}/reject`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error rejecting request.'); }
  };

  const handleApproveAd = async (id: number) => {
    try {
      await api.put(`/ads/requests/${id}/approve`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error approving ad.'); }
  };

  const handleRejectAd = async (id: number) => {
    try {
      await api.put(`/ads/requests/${id}/reject`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error rejecting ad.'); }
  };

  const handleApproveBiz = async (id: number) => {
    try {
      await api.put(`/support/business/${id}/approve`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error approving business req.'); }
  };

  const handleRejectBiz = async (id: number) => {
    try {
      await api.put(`/support/business/${id}/reject`);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.detail || 'Error rejecting business req.'); }
  };

  const handleOpenTicket = async (id: number) => {
    try {
      const res = await api.get(`/support/tickets/${id}`);
      setActiveTicket(res.data);
    } catch (err: any) { alert(err.response?.data?.detail || 'Error opening ticket.'); }
  };

  const handleReplyTicket = async () => {
    if (!ticketReply.trim() || !activeTicket) return;
    try {
      await api.post(`/support/tickets/${activeTicket.ticket.id}/reply`, { content: ticketReply });
      setTicketReply("");
      handleOpenTicket(activeTicket.ticket.id); // Refresh ticket
    } catch (err: any) { alert(err.response?.data?.detail || 'Error sending reply.'); }
  };

  const handleResolveTicket = async () => {
    if (!activeTicket) return;
    try {
      await api.put(`/support/tickets/${activeTicket.ticket.id}/resolve`);
      handleOpenTicket(activeTicket.ticket.id); // Refresh ticket
      fetchData(); // Refresh list to update status pill
    } catch (err: any) { alert(err.response?.data?.detail || 'Error resolving ticket.'); }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'noOne': return <VenetianMask size={18} color="var(--accent-purple, #b39ddb)" />;
      case 'admin': return <Shield size={18} color="#ff9800" />;
      case 'verified': return <BadgeCheck size={18} color="#4caf50" />;
      case 'faceless': return <VenetianMask size={18} color="var(--text-muted)" />;
      default: return <UserIcon size={18} color="var(--text-muted)" />;
    }
  };

  const isSuperAdmin = currentUser?.role === 'noOne';

  return (
    <div className="page-container">
      
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', fontSize: '3rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <ShieldAlert size={36} /> The Small Council
        </h1>
        <p className="text-desc" style={{ fontSize: '1.2rem' }}>
          Oversee the scholars, manage access, and review the ledger of actions.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-dark)', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => navigate('/admin-dashboard/users')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'users' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'users' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <Users size={20} /> Scholars
        </button>
        <button 
          onClick={() => navigate('/admin-dashboard/modules')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'modules' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'modules' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <ScrollText size={20} /> Modules
        </button>
        <button 
          onClick={() => navigate('/admin-dashboard/logs')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'logs' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'logs' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <Activity size={20} /> Audit Ledger
        </button>
        <button 
          onClick={() => navigate('/admin-dashboard/requests')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'requests' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'requests' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', position: 'relative' }}
        >
          <FileText size={20} /> Purchase Requests
          {allRequests.filter(r => r.status === 'pending').length > 0 && (
            <span style={{ position: 'absolute', top: '5px', right: '5px', background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>
              {allRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => navigate('/admin-dashboard/support')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'support' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'support' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', position: 'relative' }}
        >
          <AlertTriangle size={20} /> Escalations
          {supportTickets.filter(t => t.status === 'open').length > 0 && (
            <span style={{ position: 'absolute', top: '5px', right: '5px', background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>
              {supportTickets.filter(t => t.status === 'open').length}
            </span>
          )}
        </button>
        {isSuperAdmin && (
          <>
            <button 
              onClick={() => navigate('/admin-dashboard/ads')}
              style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'ads' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'ads' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', position: 'relative' }}
            >
              <AlertTriangle size={20} /> Ad Requests
              {adRequests.length > 0 && (
                <span style={{ position: 'absolute', top: '5px', right: '5px', background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>
                  {adRequests.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => navigate('/admin-dashboard/business')}
              style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'business' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'business' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', position: 'relative' }}
            >
              <Users size={20} /> Business Inquiries
              {businessRequests.length > 0 && (
                <span style={{ position: 'absolute', top: '5px', right: '0px', background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>
                  {businessRequests.length}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--accent-gold)', padding: '3rem' }}>
          Consulting the archives...
        </div>
      ) : activeTab === 'users' ? (
        
        /* --- USERS TABLE --- */
        <div className="module-section" style={{ overflowX: 'auto', padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-deep)', borderBottom: '1px solid var(--border-dark)' }}>
                <th style={{ padding: '1.5rem 1rem', color: 'var(--accent-gold)' }}>Scholar</th>
                <th style={{ padding: '1.5rem 1rem', color: 'var(--accent-gold)' }}>Status</th>
                <th style={{ padding: '1.5rem 1rem', color: 'var(--accent-gold)' }}>Role</th>
                <th style={{ padding: '1.5rem 1rem', color: 'var(--accent-gold)' }}>Active Tiers</th>
                <th style={{ padding: '1.5rem 1rem', color: 'var(--accent-gold)' }}>Last Seen</th>
                <th style={{ padding: '1.5rem 1rem', color: 'var(--accent-gold)', textAlign: 'right' }}>Decree</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isTargetSuperAdmin = u.role === 'noOne';
                const canModify = isSuperAdmin || (!isTargetSuperAdmin && u.id !== currentUser.id);

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-dark)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {u.picture ? (
                          <img src={u.picture} alt="profile" referrerPolicy="no-referrer" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border-dark)' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <UserIcon size={20} color="var(--text-muted)" />
                          </div>
                        )}
                        <div>
                          <div className="text-title" style={{ fontSize: '1.1rem' }}>{u.first_name} {u.last_name}</div>
                          <div className="text-desc" style={{ fontSize: '0.9rem' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td style={{ padding: '1rem' }}>
                      {u.is_suspended ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(255, 77, 77, 0.1)', color: 'var(--accent-red)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          <Lock size={14} /> Exiled
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          <Unlock size={14} /> Active
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'capitalize' }}>
                        {getRoleIcon(u.role)} 
                        <span style={{ color: u.role === 'noOne' ? 'var(--accent-purple, #b39ddb)' : 'var(--text-main)' }}>
                          {u.role === 'noOne' ? 'No One' : u.role}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '1rem', textTransform: 'capitalize' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {u.active_tiers?.map((tier: string) => (
                          <span key={tier} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-dark)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', color: tier === 'free' ? 'var(--text-muted)' : 'var(--accent-gold)' }}>
                            {tier}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="text-desc" style={{ padding: '1rem', fontSize: '0.9rem' }}>
                      {formatDate(u.last_active_at)}
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <select 
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={!canModify}
                          className="auth-input"
                          style={{ margin: 0, padding: '0.5rem', width: 'auto', cursor: canModify ? 'pointer' : 'not-allowed', opacity: canModify ? 1 : 0.5 }}
                        >
                          <option value="user">User</option>
                          <option value="faceless">Faceless</option>
                          <option value="verified">Verified</option>
                          <option value="admin">Admin</option>
                          {isSuperAdmin && <option value="noOne">No One</option>}
                        </select>

                        <button 
                          onClick={() => handleSuspendToggle(u.id, u.is_suspended)}
                          disabled={!canModify || isTargetSuperAdmin}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'transparent', border: `1px solid ${u.is_suspended ? '#4caf50' : 'var(--accent-red)'}`, color: u.is_suspended ? '#4caf50' : 'var(--accent-red)', borderRadius: '4px', cursor: (!canModify || isTargetSuperAdmin) ? 'not-allowed' : 'pointer', opacity: (!canModify || isTargetSuperAdmin) ? 0.3 : 1 }}
                          title={u.is_suspended ? "Restore Access" : "Exile User"}
                        >
                          {u.is_suspended ? <Unlock size={16} /> : <Lock size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'modules' ? (
        
        /* --- MODULES MANAGEMENT --- */
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
          {/* Create Module Form */}
          <div className="module-section">
            <h3 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>Forge New Module</h3>
            <form onSubmit={handleCreateModule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="text-desc">Module Name</label>
                <input type="text" className="auth-input" value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)} placeholder="e.g. Logic and Reasoning" required />
              </div>
              <div>
                <label className="text-desc">Module Code</label>
                <input type="text" className="auth-input" value={newModuleCode} onChange={(e) => setNewModuleCode(e.target.value)} placeholder="e.g. LOG101" required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="text-desc">Year</label>
                  <input type="number" className="auth-input" value={newModuleYear} onChange={(e) => setNewModuleYear(parseInt(e.target.value))} min={1} max={4} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-desc">Semester</label>
                  <input type="number" className="auth-input" value={newModuleSemester} onChange={(e) => setNewModuleSemester(parseInt(e.target.value))} min={1} max={2} required />
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Forge Module</button>
            </form>
          </div>

          {/* Modules List */}
          <div className="module-section">
            <h3 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>Existing Modules</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {modules?.map(mod => (
                <div key={mod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-deep)', borderRadius: '4px', border: '1px solid var(--border-dark)' }}>
                  <div>
                    <div 
                      className="text-title" 
                      style={{ fontSize: '1rem', cursor: 'pointer', color: 'var(--accent-gold)' }}
                      onClick={() => window.location.href = `/edit-module/${mod.id}`}
                    >
                      {mod.name} <Edit3 size={12} style={{ display: 'inline', marginLeft: '0.2rem' }} />
                    </div>
                    <div className="text-desc" style={{ fontSize: '0.8rem' }}>{mod.code} • Year {mod.year} Semester {mod.semester}</div>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', fontWeight: 'bold' }}>
                    Y{mod.year}S{mod.semester}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'logs' ? (

        /* --- AUDIT LOGS TABLE --- */
        <div className="module-section">
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Activity size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>The ledger is empty. No actions have been taken.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {logs.slice(0, 50).map((log, index) => (
                <div key={log.id || index} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.5rem', borderBottom: '1px dashed var(--border-dark)' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: 'rgba(212, 175, 55, 0.1)', borderRadius: '50%' }}>
                    <AlertTriangle size={20} color="var(--accent-gold)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="text-title" style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                      <strong style={{ color: 'var(--accent-gold)' }}>{log.admin_name}</strong> performed action: <strong>{log.action}</strong>
                    </p>
                    <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
                      Target: <span style={{ fontWeight: 'bold' }}>{log.target_name}</span>
                    </p>
                    <p className="text-desc" style={{ margin: 0, fontSize: '0.95rem' }}>
                      Details: {log.details}
                    </p>
                  </div>
                  <div className="text-desc" style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                    {formatDate(log.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'requests' ? (
        
        /* --- PURCHASE REQUESTS TABLE --- */
        <div className="module-section">
          {/* Pending Requests */}
          <h3 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>Pending Payments & Upgrades</h3>
          {allRequests.filter(r => r.status === 'pending').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <CheckCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>Everything is verified! No pending requests.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
              {allRequests.filter(r => r.status === 'pending').map(req => (
                <div key={req.id} style={{ background: 'var(--bg-surface)', border: req.is_upgrade ? '1px dashed var(--accent-gold)' : '1px solid var(--border-dark)', padding: '1.5rem', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: req.is_upgrade ? 'var(--accent-gold)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {req.is_upgrade && <Shield size={16} />} 
                      {req.is_upgrade ? "UPGRADE REQUESTED" : "NEW SUBSCRIPTION"}
                    </h4>
                    <p style={{ margin: '0 0 0.3rem 0' }}><strong>Scholar ID:</strong> {req.user_id}</p>
                    <p style={{ margin: '0 0 0.3rem 0' }}><strong>Target Tier:</strong> {req.tier.toUpperCase()} ({req.requested_duration} Months)</p>
                    {req.module_id && <p style={{ margin: '0 0 0.3rem 0' }}><strong>Module ID:</strong> {req.module_id}</p>}
                    {req.semester_key && <p style={{ margin: '0 0 0.3rem 0' }}><strong>Semester:</strong> {req.semester_key}</p>}
                    <a href={req.payment_slip_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#3498db', marginTop: '0.5rem', textDecoration: 'none', fontWeight: 'bold' }}>
                      <FileText size={16} /> View Payment Slip
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-ghost" style={{ color: '#2ecc71', borderColor: '#2ecc71', padding: '0.6rem 1rem' }} onClick={() => handleApproveReq(req.id)}>
                      <CheckCircle size={18} style={{ marginRight: '0.4rem' }} /> Approve
                    </button>
                    <button className="btn-ghost" style={{ color: '#e74c3c', borderColor: '#e74c3c', padding: '0.6rem 1rem' }} onClick={() => handleRejectReq(req.id)}>
                      <XCircle size={18} style={{ marginRight: '0.4rem' }} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* History Ledger */}
          <h3 className="brand-font" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', marginTop: '3rem', borderTop: '1px solid var(--border-dark)', paddingTop: '2rem' }}>Payment History Ledger</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {allRequests.filter(r => r.status !== 'pending').map(req => (
              <div key={req.id} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-dark)', padding: '1rem', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent-gold)' }}>Scholar ID: {req.user_id}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatDate(req.created_at)}</span>
                  </div>
                  <div style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {req.is_upgrade ? "Upgrade to " : "Subscription to "} <strong>{req.tier.toUpperCase()}</strong> ({req.requested_duration} Months)
                  </div>
                </div>
                <div>
                  {req.status === 'approved' ? (
                    <span style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle size={14} /> Approved
                    </span>
                  ) : (
                    <span style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <XCircle size={14} /> Declined
                    </span>
                  )}
                </div>
              </div>
            ))}
            {allRequests.filter(r => r.status !== 'pending').length === 0 && (
               <p className="text-desc">No historic payments found.</p>
            )}
          </div>
        </div>
      ) : activeTab === 'support' ? (
        
        /* --- SUPPORT ESCALATIONS --- */
        <div className="module-section">
          <h3 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>AI Support Escalations (Incomplete Reports)</h3>
          {supportTickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <CheckCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>The Citadel is quiet. No user escalations.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {supportTickets.map(t => (
                 <div key={t.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', padding: '1.5rem', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                           <h4>Ticket #{t.id} - {t.category}</h4>
                           <p className="text-desc">Created: {new Date(t.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                           <span style={{ padding: '0.2rem 0.5rem', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--accent-gold)', borderRadius: 4, fontSize: '0.75rem', fontWeight: 'bold', marginRight: '1rem' }}>{t.status.toUpperCase()}</span>
                           <button className="btn-ghost" style={{ padding: '0.4rem 1rem' }} onClick={() => handleOpenTicket(t.id)}>
                             VIEW
                           </button>
                        </div>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      ) : activeTab === 'ads' ? (
        /* --- AD REQUESTS --- */
        <div className="module-section">
          <h3 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>Advertising Proposals</h3>
          {adRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <ScrollText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No pending ad campaign requests.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {adRequests.map(r => (
                 <div key={r.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', padding: '1.5rem', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                           <h4 style={{ margin: '0 0 0.5rem 0' }}>{r.contact_name} &bull; <span style={{ color: 'var(--accent-gold)' }}>{r.contact_number}</span></h4>
                           <p className="text-desc" style={{ margin: 0 }}>Duration: {r.duration_months} Months</p>
                           <p className="text-desc" style={{ margin: '0.2rem 0' }}>Placements: {r.desired_placeholders.split(',').join(' | ').toUpperCase()}</p>
                           <p className="text-desc" style={{ margin: '0.2rem 0', color: 'var(--accent-gold)' }}>Target: {r.target_semester || 'Global'}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                           <span style={{ padding: '0.3rem 0.6rem', border: '1px solid var(--border-dark)', borderRadius: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.status.toUpperCase()}</span>
                           <p className="text-desc" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    {r.additional_details && (
                      <div style={{ background: 'var(--bg-deep)', padding: '1rem', borderRadius: 4, color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                        "{r.additional_details}"
                      </div>
                    )}
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-dark)', display: 'flex', gap: '1rem' }}>
                      <button className="btn-solid-gold" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => handleApproveAd(r.id)}>
                        Approve Campaign
                      </button>
                      <button className="btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => handleRejectAd(r.id)}>
                        Reject
                      </button>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      ) : activeTab === 'business' ? (
        /* --- BUSINESS INQUIRIES --- */
        <div className="module-section">
          <h3 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>Business Inquiries & Platform Deployments</h3>
          {businessRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No pending business messages.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {businessRequests.map(r => (
                 <div key={r.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', padding: '1.5rem', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                           <h4 style={{ margin: '0 0 0.5rem 0' }}>{r.contact_name} &bull; <a href={`mailto:${r.contact_email}`} style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>{r.contact_email}</a></h4>
                           <p className="text-desc" style={{ margin: 0 }}>Company: {r.company || 'N/A'}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                           <span style={{ padding: '0.3rem 0.6rem', border: '1px solid var(--border-dark)', borderRadius: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.status.toUpperCase()}</span>
                           <p className="text-desc" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div style={{ background: 'var(--bg-deep)', padding: '1rem', borderRadius: 4, color: 'var(--text-muted)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                      {r.message}
                    </div>
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-dark)', display: 'flex', gap: '1rem' }}>
                      <button className="btn-solid-gold" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => handleApproveBiz(r.id)}>
                        Mark as Reviewed (Notify)
                      </button>
                      <button className="btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#e74c3c', borderColor: '#e74c3c' }} onClick={() => handleRejectBiz(r.id)}>
                        Decline & Archive
                      </button>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Ticket Modal */}
      {activeTicket && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dark)', borderRadius: 16, width: '700px', maxWidth: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-dark)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Ticket #{activeTicket.ticket.id} <span style={{ color: 'var(--accent-gold)' }}>[{activeTicket.ticket.status.toUpperCase()}]</span></h3>
              <button className="btn-ghost" style={{ padding: '0.3rem', border: 'none' }} onClick={() => setActiveTicket(null)}><XCircle size={24} /></button>
            </div>
            
            <div style={{ padding: '1rem 1.5rem', background: '#111', borderBottom: '1px solid var(--border-dark)', display: 'flex', gap: '2rem', fontSize: '0.85rem' }}>
               <div><span style={{ color: 'var(--text-muted)' }}>User:</span> <strong>{activeTicket.ticket.user_name}</strong> (ID: {activeTicket.ticket.user_id})</div>
               <div><span style={{ color: 'var(--text-muted)' }}>Role:</span> <strong>{activeTicket.ticket.user_role?.toUpperCase()}</strong></div>
               <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <strong style={{ color: activeTicket.ticket.user_suspended ? '#e74c3c' : '#2ecc71' }}>{activeTicket.ticket.user_suspended ? 'SUSPENDED' : 'ACTIVE'}</strong></div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeTicket.ticket.chat_history && (
                 <div style={{ background: 'var(--bg-deep)', padding: '1rem', borderRadius: 8, fontSize: '0.9rem' }}>
                   <p style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-gold)' }}><strong>Initial Chat Context:</strong></p>
                   <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--text-muted)', margin: 0, fontFamily: 'inherit' }}>
                     {(() => {
                        try {
                          const history = JSON.parse(activeTicket.ticket.chat_history);
                          return history.map((h: any) => `(${h.role.toUpperCase()}): ${h.parts}`).join('\n\n');
                        } catch { return activeTicket.ticket.chat_history; }
                     })()}
                   </pre>
                 </div>
              )}

              {activeTicket.messages.map((m: any) => (
                <div key={m.id} style={{ 
                  alignSelf: m.sender_role === 'admin' ? 'flex-end' : 'flex-start',
                  background: m.sender_role === 'admin' ? 'var(--dark-gold)' : 'var(--bg-deep)',
                  padding: '1rem', borderRadius: 12, maxWidth: '80%'
                }}>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.8rem', color: m.sender_role === 'admin' ? '#fff' : 'var(--accent-gold)', fontWeight: 'bold' }}>
                    {m.sender_role.toUpperCase() === 'USER' ? 'SCHOLAR' : m.sender_role.toUpperCase()} 
                    <span style={{ fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{new Date(m.created_at).toLocaleTimeString()}</span>
                  </p>
                  <p style={{ margin: 0, color: m.sender_role === 'admin' ? '#fff' : 'var(--text-main)' }}>{m.content}</p>
                </div>
              ))}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-dark)', display: 'flex', gap: '0.5rem' }}>
              <input 
                value={ticketReply}
                onChange={e => setTicketReply(e.target.value)}
                placeholder="Type your reply to the scholar..."
                style={{ flex: 1, padding: '0.8rem', background: 'var(--bg-deep)', border: '1px solid var(--border-dark)', borderRadius: 8, color: 'var(--text-main)' }}
                onKeyDown={e => e.key === 'Enter' ? handleReplyTicket() : null}
                disabled={activeTicket.ticket.status === 'resolved'}
              />
              {activeTicket.ticket.status !== 'resolved' && (
                <>
                  <button className="btn-solid-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleReplyTicket}>
                    <Send size={18} /> Send
                  </button>
                  <button onClick={handleResolveTicket} style={{ background: '#2ecc71', color: 'black', border: 'none', borderRadius: 8, padding: '0 1rem', cursor: 'pointer', fontWeight: 'bold' }}>
                    RESOLVE
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;