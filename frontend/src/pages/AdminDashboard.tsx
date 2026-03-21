import React, { useEffect, useState } from 'react';
import api from '../api';
import { 
  ShieldAlert, Users, ScrollText, Lock, Unlock, 
  VenetianMask, BadgeCheck, Shield, User as UserIcon, Activity, AlertTriangle
} from 'lucide-react';

// 👇 1. Import the new Forbidden page
import Forbidden from './Forbidden'; 

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [isLoading, setIsLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // 👇 2. THE SHIELD: Render the 403 page if they don't have the right role!
  if (currentUser?.role !== 'noOne' && currentUser?.role !== 'admin') {
    return <Forbidden />;
  }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, logsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/audit-logs')
      ]);
      setUsers(usersRes.data);
      setLogs(logsRes.data);
    } catch (error) {
      console.error("Failed to fetch admin data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (!window.confirm(`Are you sure you want to change this scholar's role to ${newRole.toUpperCase()}?`)) return;
    
    try {
      await api.put(`/admin/users/${userId}/role`, { new_role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      fetchData(); // Refresh logs
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
      fetchData(); // Refresh logs
    } catch (error: any) {
      alert(error.response?.data?.detail || `Failed to ${action} user.`);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'noOne': return <VenetianMask size={18} color="#b39ddb" />;
      case 'admin': return <Shield size={18} color="#ff9800" />;
      case 'verified': return <BadgeCheck size={18} color="#4caf50" />;
      case 'faceless': return <VenetianMask size={18} color="var(--text-muted)" />;
      default: return <UserIcon size={18} color="var(--text-muted)" />;
    }
  };

  // Hierarchy Helpers
  const isSuperAdmin = currentUser?.role === 'noOne';

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="brand-font" style={{ color: 'var(--accent-gold)', fontSize: '3rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <ShieldAlert size={36} /> The Small Council
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>
          Oversee the scholars, manage access, and review the ledger of actions.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-dark)', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('users')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'users' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'users' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <Users size={20} /> Scholars Management
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          style={{ padding: '1rem 2rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'logs' ? '2px solid var(--accent-gold)' : '2px solid transparent', color: activeTab === 'logs' ? 'var(--accent-gold)' : 'var(--text-muted)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}
        >
          <ScrollText size={20} /> Audit Ledger
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--accent-gold)', padding: '3rem' }}>
          Consulting the archives...
        </div>
      ) : activeTab === 'users' ? (
        
        /* --- USERS TABLE --- */
        <div style={{ backgroundColor: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border-dark)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-dark)' }}>
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
                          <img src={u.picture} alt="profile" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border-dark)' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--border-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <UserIcon size={20} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{u.first_name} {u.last_name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td style={{ padding: '1rem' }}>
                      {u.is_suspended ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#ff4d4d20', color: '#ff4d4d', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          <Lock size={14} /> Exiled
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#4caf5020', color: '#4caf50', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          <Unlock size={14} /> Active
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'capitalize' }}>
                        {getRoleIcon(u.role)} 
                        <span style={{ color: u.role === 'noOne' ? '#b39ddb' : 'var(--text-main)' }}>
                          {u.role === 'noOne' ? 'No One' : u.role}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {formatDate(u.last_active_at)}
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        
                        {/* Role Selector */}
                        <select 
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={!canModify}
                          style={{ padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.5)', color: 'var(--text-main)', border: '1px solid var(--border-dark)', borderRadius: '4px', outline: 'none', cursor: canModify ? 'pointer' : 'not-allowed', opacity: canModify ? 1 : 0.5 }}
                        >
                          <option value="user">User</option>
                          <option value="faceless">Faceless</option>
                          <option value="verified">Verified</option>
                          <option value="admin">Admin</option>
                          {isSuperAdmin && <option value="noOne">No One</option>}
                        </select>

                        {/* Suspend Toggle */}
                        <button 
                          onClick={() => handleSuspendToggle(u.id, u.is_suspended)}
                          disabled={!canModify || isTargetSuperAdmin}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'transparent', border: `1px solid ${u.is_suspended ? '#4caf50' : '#ff4d4d'}`, color: u.is_suspended ? '#4caf50' : '#ff4d4d', borderRadius: '4px', cursor: (!canModify || isTargetSuperAdmin) ? 'not-allowed' : 'pointer', opacity: (!canModify || isTargetSuperAdmin) ? 0.3 : 1 }}
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
      ) : (

        /* --- AUDIT LOGS TABLE --- */
        <div style={{ backgroundColor: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border-dark)', padding: '1rem' }}>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Activity size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>The ledger is empty. No actions have been taken.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {logs.map((log) => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.5rem', borderBottom: '1px dashed var(--border-dark)' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: 'rgba(255, 215, 0, 0.1)', borderRadius: '50%' }}>
                    <AlertTriangle size={20} color="var(--accent-gold)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>
                      <strong style={{ color: 'var(--accent-gold)' }}>{log.admin_name}</strong> performed action: <strong>{log.action}</strong>
                    </p>
                    <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
                      Target: <span style={{ fontWeight: 'bold' }}>{log.target_name}</span>
                    </p>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                      Details: {log.details}
                    </p>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                    {formatDate(log.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;