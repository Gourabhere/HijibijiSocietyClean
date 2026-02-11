import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Package, BarChart3, Moon, Sun, ClipboardList, LogOut, Loader2, Clock } from 'lucide-react';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import StaffTaskView from './components/StaffTaskView';
import SupplyRequestView from './components/SupplyRequest';
import StaffAttendance from './components/StaffAttendance';
import { TaskLog, SupplyRequest, PunchLog, StaffMember } from './types';
import {
  fetchStaffMembers,
  fetchTaskLogs, insertTaskLog,
  fetchPunchLogs, insertPunchLog,
  fetchSupplyRequests, insertSupplyRequest, updateSupplyStatus
} from './services/supabaseDB';

type ManagerTab = 'HOME' | 'STAFF' | 'STOCK' | 'LOGS';
type StaffTab = 'TASKS' | 'ATTENDANCE' | 'STOCK' | 'LOGS';

const App: React.FC = () => {
  const { isLoggedIn, role, staffId, staffName, loading: authLoading, logout } = useAuth();

  const [currentUser, setCurrentUser] = useState<number>(1);
  const [managerTab, setManagerTab] = useState<ManagerTab>('HOME');
  const [staffTab, setStaffTab] = useState<StaffTab>('TASKS');
  const [darkMode, setDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // All data from Supabase
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>([]);
  const [punchLogs, setPunchLogs] = useState<PunchLog[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Set currentUser from auth context
  useEffect(() => {
    if (staffId) setCurrentUser(staffId);
  }, [staffId]);

  // Fetch ALL data from Supabase when logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    setDataLoading(true);
    Promise.all([
      fetchStaffMembers().catch(() => []),
      fetchTaskLogs().catch(() => []),
      fetchPunchLogs().catch(() => []),
      fetchSupplyRequests().catch(() => []),
    ]).then(([staff, taskLogs, punchData, supplyData]) => {
      setStaffMembers(staff);
      setLogs(taskLogs);
      setPunchLogs(punchData);
      setSupplyRequests(supplyData);
      setDataLoading(false);
    });
  }, [isLoggedIn]);

  // Dark mode toggle
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle('dark-mode');
  };

  const handleLogTask = async (log: Omit<TaskLog, 'id'>) => {
    try {
      const saved = await insertTaskLog(log);
      setLogs(prev => [saved, ...prev]);
    } catch {
      const newLog: TaskLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
      setLogs(prev => [newLog, ...prev]);
    }
  };

  const handleSupplyRequest = async (req: Omit<SupplyRequest, 'id'>) => {
    try {
      const saved = await insertSupplyRequest(req);
      setSupplyRequests(prev => [saved, ...prev]);
    } catch {
      const newReq: SupplyRequest = { ...req, id: Math.random().toString(36).substr(2, 9) };
      setSupplyRequests(prev => [newReq, ...prev]);
    }
  };

  const handleApproveSupply = async (id: string) => {
    try {
      await updateSupplyStatus(id, 'FULFILLED');
    } catch { /* continue with local update */ }
    setSupplyRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'FULFILLED' as const } : r));
  };

  const handlePunch = async (log: Omit<PunchLog, 'id'>) => {
    try {
      const saved = await insertPunchLog(log);
      setPunchLogs(prev => [saved, ...prev]);
    } catch {
      const newLog: PunchLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
      setPunchLogs(prev => [newLog, ...prev]);
    }
  };

  // Auth loading
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={40} className="spin" style={{ color: 'var(--blue)', marginBottom: 16 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  const isAdmin = role === 'admin';
  const displayName = staffName || 'User';

  const getTitle = () => {
    if (isAdmin) {
      if (managerTab === 'HOME') return 'Admin\nManagement Hub';
      if (managerTab === 'STAFF') return 'Staff Attendance';
      if (managerTab === 'STOCK') return 'Supplies';
      return 'Reports';
    }
    if (staffTab === 'ATTENDANCE') return 'Staff Attendance';
    if (staffTab === 'STOCK') return 'Supplies';
    return 'My Tasks';
  };

  const getSubtitle = () => {
    if (isAdmin) {
      if (managerTab === 'HOME') return 'MANAGEMENT';
      if (managerTab === 'STAFF') return 'STAFF ATTENDANCE';
      return '';
    }
    if (staffTab === 'ATTENDANCE') return 'STAFF ATTENDANCE';
    return displayName;
  };

  const renderContent = () => {
    if (dataLoading) {
      return (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Loader2 size={32} className="spin" style={{ color: 'var(--blue)' }} />
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>Loading data...</div>
        </div>
      );
    }

    if (isAdmin) {
      switch (managerTab) {
        case 'HOME':
          return <Dashboard logs={logs} tasks={[]} supplyRequests={supplyRequests} onApproveSupply={handleApproveSupply} staffMembers={staffMembers} />;
        case 'STAFF':
          return <StaffAttendance currentUser={currentUser} punchLogs={punchLogs} onPunch={handlePunch} staffMembers={staffMembers} />;
        case 'STOCK':
          return <SupplyRequestView currentUser={currentUser} requests={supplyRequests} onRequest={handleSupplyRequest} staffMembers={staffMembers} />;
        default:
          return <Dashboard logs={logs} tasks={[]} supplyRequests={supplyRequests} onApproveSupply={handleApproveSupply} staffMembers={staffMembers} />;
      }
    }

    // Staff view
    switch (staffTab) {
      case 'ATTENDANCE':
        return <StaffAttendance currentUser={currentUser} punchLogs={punchLogs} onPunch={handlePunch} staffMembers={staffMembers} />;
      case 'STOCK':
        return <SupplyRequestView currentUser={currentUser} requests={supplyRequests} onRequest={handleSupplyRequest} staffMembers={staffMembers} />;
      case 'TASKS':
      default:
        return <StaffTaskView currentUser={currentUser} logs={logs} onLogTask={handleLogTask} staffMembers={staffMembers} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto', position: 'relative' }}>
      <header className="app-header">
        <div>
          {getSubtitle() && (
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 2 }}>
              {getSubtitle()}
            </div>
          )}
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'pre-line' }}>
            {getTitle()}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Clock size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
              {currentTime.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' · '}
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="neu-dark-toggle" onClick={toggleDarkMode}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="neu-logout-btn" onClick={logout}>
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '0 16px 100px', overflowY: 'auto' }}>
        {renderContent()}
        <SpeedInsights />
      </main>

      {isAdmin ? (
        <div className="bottom-nav">
          <NavItem icon={<LayoutDashboard size={22} />} label="Home" active={managerTab === 'HOME'} onClick={() => setManagerTab('HOME')} />
          <NavItem icon={<Users size={22} />} label="Staff" active={managerTab === 'STAFF'} onClick={() => setManagerTab('STAFF')} />
          <NavItem icon={<Package size={22} />} label="Stock" active={managerTab === 'STOCK'} onClick={() => setManagerTab('STOCK')} />
          <NavItem icon={<BarChart3 size={22} />} label="Logs" active={managerTab === 'LOGS'} onClick={() => setManagerTab('LOGS')} />
        </div>
      ) : (
        <div className="bottom-nav">
          <NavItem icon={<ClipboardList size={22} />} label="Tasks" active={staffTab === 'TASKS'} onClick={() => setStaffTab('TASKS')} />
          <NavItem icon={<Users size={22} />} label="Staff" active={staffTab === 'ATTENDANCE'} onClick={() => setStaffTab('ATTENDANCE')} />
          <NavItem icon={<Package size={22} />} label="Stock" active={staffTab === 'STOCK'} onClick={() => setStaffTab('STOCK')} />
          <NavItem icon={<BarChart3 size={22} />} label="Logs" active={staffTab === 'LOGS'} onClick={() => setStaffTab('LOGS')} />
        </div>
      )}
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
    {icon}
    <span>{label}</span>
  </button>
);

export default App;
