import React, { useEffect, useState } from 'react';
import api from '../api';
import { 
  ShieldAlert, Users, ScrollText, Lock, Unlock, 
  VenetianMask, BadgeCheck, Shield, User as UserIcon, Activity, AlertTriangle, Edit3, CheckCircle, XCircle, FileText
} from 'lucide-react';

import Forbidden from './Forbidden'; 

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'modules' | 'requests' | 'support'>('users');
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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, logsRes, modulesRes, requestsRes, ticketsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/audit-logs'),
        api.get('/modules'),
        api.get('/subscriptions/requests/pending'),
        api.get('/support/tickets/all') 
      ]);
      setUsers(usersRes.data);
      setLogs(logsRes.data);
      setModules(modulesRes.data);
      setPendingRequests(requestsRes.data);
      setSupportTickets(ticketsRes.data);
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
          onClick={() => setActiveTab('users')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'users' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'users' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <Users size={20} /> Scholars
        </button>
        <button 
          onClick={() => setActiveTab('modules')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'modules' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'modules' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <ScrollText size={20} /> Modules
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'logs' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'logs' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <Activity size={20} /> Audit Ledger
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'requests' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'requests' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', position: 'relative' }}
        >
          <FileText size={20} /> Purchase Requests
          {pendingRequests.length > 0 && (
            <span style={{ position: 'absolute', top: '5px', right: '5px', background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('support')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'support' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'support' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <AlertTriangle size={20} /> Escalations
        </button>
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
          <h3 className="brand-font" style={{ color: 'var(--accent-gold)', marginBottom: '1.5rem' }}>Pending Payments & Upgrades</h3>
          {pendingRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <CheckCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>Everything is verified! No pending requests.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingRequests.map(req => (
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
                           <span style={{ padding: '0.3rem 0.6rem', border: '1px solid var(--accent-gold)', borderRadius: 12, color: 'var(--accent-gold)', fontSize: '0.8rem' }}>{t.status.toUpperCase()}</span>
                        </div>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default AdminDashboard;