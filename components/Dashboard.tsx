import React from 'react';
import { TaskLog, StaffMember, TaskDefinition, Frequency, SupplyRequest, PunchLog, BUILDING_STRUCTURE, FLOORS, FLOOR_TASKS, BLOCK_TASKS, COMMON_TASKS, TaskType } from '../types';
import { Check, X, MapPin, TrendingUp, Download, Plus, UserPlus } from 'lucide-react';
import { insertStaffMember, verifyStaffPin } from '../services/supabaseDB';
import { fetchFlatPaymentStatus } from '../services/collectionsClient';

interface DashboardProps {
  logs: TaskLog[];
  tasks: TaskDefinition[];
  supplyRequests: SupplyRequest[];
  onApproveSupply: (id: string) => void;
  onRejectSupply: (id: string) => void;
  staffMembers: StaffMember[];
  punchLogs: PunchLog[];
  onNavigate: (tab: string) => void;
  onExport: () => void;
}

const DonutChart: React.FC<{ percentage: number; size?: number; strokeWidth?: number }> = ({
  percentage, size = 160, strokeWidth = 14
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="progress-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--neu-dark)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="url(#gradient)" strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
          <TrendingUp size={22} color="#3b82f6" />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Live Feed</span>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({
  logs, tasks, supplyRequests, onApproveSupply, onRejectSupply, staffMembers, punchLogs, onNavigate, onExport
}) => {
  const [showAddStaffModal, setShowAddStaffModal] = React.useState(false);
  const [selectedStaff, setSelectedStaff] = React.useState<StaffMember | null>(null);
  const [pin, setPin] = React.useState('');
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [newStaff, setNewStaff] = React.useState({ name: '', role: 'Housekeeper', blockAssignment: '', avatar: '' });
  const [addingStaff, setAddingStaff] = React.useState(false);
  const [paymentStatus, setPaymentStatus] = React.useState<Map<string, boolean>>(new Map());
  const [loadingPayment, setLoadingPayment] = React.useState(true);
  const today = new Date().setHours(0, 0, 0, 0);
  const todaysLogs = logs.filter(l => l.timestamp >= today);

  React.useEffect(() => {
    fetchFlatPaymentStatus().then((map) => {
      setPaymentStatus(map);
      setLoadingPayment(false);
    });
  }, []);

  const totalDailyTasks = React.useMemo(() => {
    if (loadingPayment) return 0;
    let total = 0;
    // 1. Common Area Tasks
    total += COMMON_TASKS.length;

    BUILDING_STRUCTURE.forEach(block => {
      // 2. Block Level Tasks
      total += BLOCK_TASKS.length;

      FLOORS.forEach(floor => {
        const flats = block.flatsPerFloor(floor);
        // 3. Per-Flat Tasks (Active ONLY)
        const activeFlats = flats.filter(flat => {
          const key = `${block.block}${flat}${floor}`;
          return paymentStatus.has(key) && paymentStatus.get(key) === true;
        });
        total += FLOOR_TASKS.filter(t => t.perFlat).length * activeFlats.length;
        // 4. Per-Floor Tasks
        total += FLOOR_TASKS.filter(t => !t.perFlat).length;
      });
    });
    return total;
  }, [loadingPayment, paymentStatus]);

  const completedDaily = todaysLogs.filter(l => {
    if (l.status !== 'COMPLETED') return false;
    // If it's a flat task, valid only if flat is active
    if (l.flat && l.block && l.floor) {
      const key = `${l.block}${l.flat}${l.floor}`;
      // If we have payment status loaded, restrict to active.
      // If map is empty (loading or error), maybe be lenient?
      // But for "progress" consistency, let's match the total: strict check.
      if (!loadingPayment && paymentStatus.size > 0) {
        return paymentStatus.get(key) === true;
      }
    }
    return true;
  }).length;

  const progress = totalDailyTasks > 0 ? Math.round((completedDaily / totalDailyTasks) * 100) : 0;

  const activeStats = React.useMemo(() => {
    if (loadingPayment) return { garbage: { done: 0, total: 0 }, brooming: { done: 0, total: 0 } };

    let garbageTotal = 0;
    let broomingTotal = 0;

    // Calculate Totals based on Active Flats / Floors
    BUILDING_STRUCTURE.forEach(block => {
      FLOORS.forEach(floor => {
        // Garbage: Per Active Flat
        const flats = block.flatsPerFloor(floor);
        const activeFlats = flats.filter(flat => {
          const key = `${block.block}${flat}${floor}`;
          return paymentStatus.has(key) && paymentStatus.get(key) === true;
        });
        // Assuming 1 Routine Housekeeping task per flat
        garbageTotal += activeFlats.length;

        // Brooming: Per Floor
        // Check if Brooming exists in FLOOR_TASKS
        if (FLOOR_TASKS.some(t => t.type === TaskType.BROOMING)) {
          broomingTotal += 1;
        }
      });
    });

    // Calculate Done counts
    // Garbage Done: Status Completed AND TaskType Routine/Garbage AND Flat is Active
    const garbageDone = todaysLogs.filter(l => {
      if (l.status !== 'COMPLETED') return false;
      const isRoutine = l.taskId === TaskType.ROUTINE_HOUSEKEEPING || l.taskId.includes('Routine') || l.taskId.includes('Garbage');
      if (!isRoutine) return false;

      // Strict Active Check
      if (l.flat && l.block && l.floor) {
        const key = `${l.block}${l.flat}${l.floor}`;
        return paymentStatus.get(key) === true;
      }
      return false;
    }).length;

    // Brooming Done: Status Completed AND TaskType Brooming
    const broomingDone = todaysLogs.filter(l => {
      return l.status === 'COMPLETED' && (l.taskId === TaskType.BROOMING || l.taskId.includes('Brooming'));
    }).length;

    return {
      garbage: { done: garbageDone, total: garbageTotal },
      brooming: { done: broomingDone, total: broomingTotal }
    };
  }, [loadingPayment, paymentStatus, todaysLogs]);

  const garbagePercent = activeStats.garbage.total > 0 ? Math.round((activeStats.garbage.done / activeStats.garbage.total) * 100) : 0;
  const broomingPercent = activeStats.brooming.total > 0 ? Math.round((activeStats.brooming.done / activeStats.brooming.total) * 100) : 0;


  const openRequests = supplyRequests.filter(r => r.status === 'OPEN');

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.blockAssignment) {
      alert("Name and Block Assignment are required");
      return;
    }
    setAddingStaff(true);
    try {
      await insertStaffMember({
        name: newStaff.name,
        role: 'Housekeeper',
        avatar: newStaff.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(newStaff.name)}&background=random`,
        blockAssignment: newStaff.blockAssignment
      });
      setShowAddStaffModal(false);
      setPin('');
      setIsAuthenticated(false);
      setNewStaff({ name: '', role: 'Housekeeper', blockAssignment: '', avatar: '' });
      // Trigger a refresh ideally, but for now relies on parent update or HMR
      alert("Staff added successfully!");
    } catch (e: any) {
      alert("Failed to add staff: " + e.message);
    } finally {
      setAddingStaff(false);
    }
  };

  const handlePinSubmit = () => {
    if (pin === '1234') { // Hardcoded credential check as requested
      setIsAuthenticated(true);
    } else {
      alert("Invalid Credential");
    }
  };

  return (
    <div style={{ paddingBottom: 16 }}>

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="neu-card" style={{ width: 320, padding: 24, background: 'var(--bg-card)' }}>
            {!isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ margin: 0, textAlign: 'center' }}>Admin Access</h3>
                <input
                  type="password"
                  placeholder="Enter Credential PIN"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  style={{
                    padding: 12, borderRadius: 8, border: '1px solid var(--text-muted)',
                    background: 'var(--bg-inset)', color: 'var(--text-primary)', outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowAddStaffModal(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                  <button onClick={handlePinSubmit} className="neu-button" style={{ flex: 1, color: 'white', background: 'var(--blue)' }}>Verify</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ margin: 0 }}>Add New Staff</h3>
                <input
                  placeholder="Staff Name"
                  value={newStaff.name}
                  onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                  style={{ padding: 12, borderRadius: 8, border: 'none', background: 'var(--bg-inset)', color: 'var(--text-primary)' }}
                />
                <input
                  placeholder="Block Assignment (e.g., Block 1)"
                  value={newStaff.blockAssignment}
                  onChange={e => setNewStaff({ ...newStaff, blockAssignment: e.target.value })}
                  style={{ padding: 12, borderRadius: 8, border: 'none', background: 'var(--bg-inset)', color: 'var(--text-primary)' }}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button onClick={() => setShowAddStaffModal(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
                  <button onClick={handleAddStaff} className="neu-button" disabled={addingStaff} style={{ flex: 1, color: 'white', background: 'var(--green)' }}>
                    {addingStaff ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {selectedStaff && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setSelectedStaff(null)}>
          <div className="neu-card" style={{ width: 300, padding: 24, background: 'var(--bg-card)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedStaff(null)}
              style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
              <img src={selectedStaff.avatar} alt={selectedStaff.name} className="avatar" style={{ width: 80, height: 80, marginBottom: 12 }} />
              <h3 style={{ margin: 0, fontSize: 18 }}>{selectedStaff.name}</h3>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedStaff.role}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-inset)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Block Assignment</span>
                <span style={{ fontSize: 13 }}>{selectedStaff.blockAssignment}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-inset)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Tasks Today</span>
                <span style={{ fontSize: 13 }}>
                  {logs.filter(l => l.staffId === selectedStaff.id && l.timestamp >= today && l.status === 'COMPLETED').length}
                </span>
              </div>
            </div>
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button className="neu-button" style={{ width: '100%' }} onClick={() => setSelectedStaff(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* On-Duty Staff */}
      <div className="animate-in" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <span className="section-title">On-Duty Staff</span>
          <button className="btn-ghost" style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', padding: '4px 8px' }}>View All</button>
        </div>
        <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
          <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 4 }} className="no-scrollbar">
            {staffMembers.filter(s => {
              // Check if staff is punched in today
              const staffPunches = punchLogs
                .filter(p => p.staffId === s.id && p.timestamp >= today)
                .sort((a, b) => b.timestamp - a.timestamp);
              return staffPunches.length > 0 && staffPunches[0].type === 'IN';
            }).length === 0 ? (
              <div style={{ padding: '0 8px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No staff currently on duty.
              </div>
            ) : (
              <>
                {staffMembers.map(s => {
                  const staffPunches = punchLogs
                    .filter(p => p.staffId === s.id && p.timestamp >= today)
                    .sort((a, b) => b.timestamp - a.timestamp);
                  const isOnDuty = staffPunches.length > 0 && staffPunches[0].type === 'IN';
                  if (!isOnDuty) return null;

                  const staffTaskCount = todaysLogs.filter(l => l.staffId === s.id && l.status === 'COMPLETED').length;

                  return (
                    <div key={s.id} onClick={() => setSelectedStaff(s)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 72, cursor: 'pointer' }}>
                      <img src={s.avatar} alt={s.name} className="avatar avatar-lg" style={{ width: 56, height: 56 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.2 }}>
                        {s.name.split(' ')[0]} {s.name.split(' ')[1]?.[0]}.
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--green)' }}>{staffTaskCount} tasks today</span>
                    </div>
                  );
                })}

                {/* Add Staff Tile */}
                <button
                  onClick={() => setShowAddStaffModal(true)}
                  style={{
                    minWidth: 72, height: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'transparent', border: 'none', cursor: 'pointer'
                  }}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-inset)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)',
                    border: '1px dashed var(--text-muted)'
                  }}>
                    <Plus size={24} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Add New</span>
                </button>
              </>
            )}

          </div>
        </div>
      </div>

      {/* Daily Progress */}
      <div className="neu-card-inset animate-in animate-in-delay-1" style={{ marginBottom: 24, textAlign: 'center', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <span className="section-title">Daily Progress</span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{progress}%</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Average</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <DonutChart percentage={progress} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Garbage: {garbagePercent}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Brooming: {broomingPercent}%</span>
          </div>
        </div>
      </div>

      {/* Supplies Status */}
      <div className="animate-in animate-in-delay-2" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <span className="section-title">Supplies Status</span>
          {openRequests.length > 0 && (
            <span className="badge badge-green">{openRequests.length} New Requests</span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {openRequests.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-inset)', borderRadius: 12 }}>
              No pending supply requests.
            </div>
          ) : (
            openRequests.map(req => {
              const staff = staffMembers.find(s => s.id === req.requesterId);
              const ago = Math.round((Date.now() - req.timestamp) / 60000);
              return (
                <SupplyCard
                  key={req.id}
                  item={`${req.item} (${req.quantity})`}
                  requester={staff?.name.split(' ')[0] || 'Staff'}
                  time={`${ago}m ago`}
                  onApprove={() => onApproveSupply(req.id)}
                  onReject={() => onRejectSupply(req.id)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Zone Monitoring */}
      <div className="animate-in animate-in-delay-3" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <span className="section-title">Zone Monitoring</span>
        </div>
        <div className="neu-card" style={{ padding: 0, overflow: 'hidden', position: 'relative', height: 180 }}>
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, var(--blue-bg) 0%, var(--green-bg) 50%, var(--yellow-bg) 100%)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: 16,
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', top: 40, left: '30%', width: 12, height: 12, borderRadius: '50%', background: todaysLogs.some(l => l.block === 1) ? 'var(--green)' : 'var(--red)', boxShadow: '0 0 0 4px rgba(255,255,255,0.2)' }} />
            <div style={{ position: 'absolute', top: 70, left: '50%', width: 12, height: 12, borderRadius: '50%', background: todaysLogs.some(l => l.block === 2) ? 'var(--green)' : 'var(--red)', boxShadow: '0 0 0 4px rgba(255,255,255,0.2)' }} />
            <div style={{ position: 'absolute', top: 55, left: '65%', width: 12, height: 12, borderRadius: '50%', background: todaysLogs.some(l => l.block === 3) ? 'var(--green)' : 'var(--red)', boxShadow: '0 0 0 4px rgba(255,255,255,0.2)' }} />
            <div style={{ position: 'absolute', top: 90, left: '40%', width: 12, height: 12, borderRadius: '50%', background: todaysLogs.some(l => l.block === 4) ? 'var(--green)' : 'var(--red)', boxShadow: '0 0 0 4px rgba(255,255,255,0.2)' }} />
            <div style={{
              background: 'rgba(255,255,255,0.85)', borderRadius: 10, padding: '8px 14px',
              fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
              backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 4,
              boxShadow: 'var(--neu-raised-sm)'
            }}>
              <MapPin size={12} /> Live Zone Coverage
            </div>
            <button style={{
              width: 46, height: 46, borderRadius: '50%', background: 'var(--blue)',
              color: 'white', border: 'none', cursor: 'pointer', fontSize: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(59,130,246,0.4)'
            }}>+</button>
          </div>
        </div>
      </div>

      {/* Management Hub */}
      <div className="animate-in animate-in-delay-4" style={{ marginBottom: 20 }}>
        <div className="section-header">
          <span className="section-title">Management Hub</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <HubCard icon="👤" title="Manage Staff" desc="Add, edit profiles & schedules" color="var(--purple)" bgColor="var(--purple-light)" onClick={() => onNavigate('STAFF')} />
          <HubCard icon="📦" title="Inventory Management" desc="Restock alerts & tracking" color="var(--coral)" bgColor="var(--coral-light)" onClick={() => onNavigate('STOCK')} />
          <HubCard icon="📋" title="System Logs" desc="View all system activities" color="var(--green)" bgColor="var(--green-light)" onClick={() => onNavigate('LOGS')} />

          <button
            className="neu-card"
            onClick={onExport}
            style={{
              textAlign: 'center', padding: '18px 16px', cursor: 'pointer', width: '100%',
              fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'inherit',
              borderRadius: 'var(--radius)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
            }}
          >
            <Download size={18} /> Export Monthly Report
          </button>
        </div>
      </div>
    </div>
  );
};

const HubCard: React.FC<{ icon: string; title: string; desc: string; color: string; bgColor: string; onClick: () => void }> = ({ icon, title, desc, bgColor, onClick }) => (
  <div className="neu-card" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 18px', cursor: 'pointer' }}>
    <div style={{
      width: 46, height: 46, borderRadius: 14, background: bgColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
    </div>
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{desc}</div>
    </div>
  </div>
);

const SupplyCard: React.FC<{ item: string; requester: string; time: string; onApprove: () => void; onReject: () => void }> = ({
  item, requester, time, onApprove, onReject
}) => (
  <div className="neu-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px' }}>
    <div style={{
      width: 42, height: 42, borderRadius: 14, background: 'var(--green-light)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>
      <span style={{ fontSize: 18 }}>📦</span>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>Requested by {requester} · {time}</div>
    </div>
    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
      <button onClick={onReject} className="btn-approve" style={{ background: 'var(--coral-light)', color: 'var(--coral)' }}>
        <X size={14} />
      </button>
      <button onClick={onApprove} className="btn-approve" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>
        <Check size={14} />
      </button>
    </div>
  </div>
);

export default Dashboard;
