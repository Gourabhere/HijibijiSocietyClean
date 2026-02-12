"use client"
import React, { useMemo } from 'react';
import { TaskLog, StaffMember, TaskType } from '../types';
import { getTaskIcon } from '../constants';
import { Activity, Calendar, Award, Trash2, Wind, Sparkles } from 'lucide-react';

interface StaffLogsViewProps {
    currentUser: number;
    logs: TaskLog[];
    staffMembers: StaffMember[];
    isAdmin?: boolean;
}

const StaffLogsView: React.FC<StaffLogsViewProps> = ({ currentUser, logs, staffMembers, isAdmin = false }) => {
    // Filter logs for current user (or all if admin)
    const displayLogs = useMemo(() => {
        if (isAdmin) return logs.sort((a, b) => b.timestamp - a.timestamp);
        return logs.filter(l => l.staffId === currentUser).sort((a, b) => b.timestamp - a.timestamp);
    }, [logs, currentUser, isAdmin]);

    const today = new Date().setHours(0, 0, 0, 0);
    const weekAgo = new Date().setDate(new Date().getDate() - 7);

    // Stats calculation
    const stats = useMemo(() => {
        const todayCount = displayLogs.filter(l => l.timestamp >= today).length;
        const weekCount = displayLogs.filter(l => l.timestamp >= weekAgo).length;

        // Breakdown
        const garbage = displayLogs.filter(l => l.taskId.includes('Routine') || l.taskId.includes('Garbage')).length;
        const brooming = displayLogs.filter(l => l.taskId.includes('broom') || l.taskId.includes('sweep')).length;
        const mopping = displayLogs.filter(l => l.taskId.includes('mop')).length;
        const other = displayLogs.length - garbage - brooming - mopping;

        return { todayCount, weekCount, breakdown: { garbage, brooming, mopping, other } };
    }, [displayLogs, today, weekAgo]);

    // Group logs by date
    const groupedLogs = useMemo(() => {
        const groups: { [key: string]: TaskLog[] } = {};
        displayLogs.forEach(log => {
            const date = new Date(log.timestamp).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(log);
        });
        return groups;
    }, [displayLogs]);

    // Helper to determine task label from ID (simple heuristic since task definitions are dynamic now)
    const getTaskLabel = (taskId: string) => {
        if (taskId.includes('garbage')) return 'Garbage Collection';
        if (taskId.includes('broom')) return 'Brooming';
        if (taskId.includes('mop')) return 'Mopping';
        if (taskId.includes('glass')) return 'Glass Cleaning';
        if (taskId.includes('driveway')) return 'Driveway Cleaning';
        return 'Task Completed';
    };

    const getTaskType = (taskId: string): TaskType => {
        if (taskId.includes('Routine') || taskId.includes('Garbage')) return TaskType.ROUTINE_HOUSEKEEPING;
        if (taskId.includes('broom')) return TaskType.BROOMING;
        if (taskId.includes('mop')) return TaskType.MOPPING;
        if (taskId.includes('glass')) return TaskType.GLASS_CLEANING;
        if (taskId.includes('driveway')) return TaskType.DRIVEWAY;
        return TaskType.GLASS_CLEANING; // Default fallback
    };

    return (
        <div className="animate-in">
            <div className="section-header">
                <span className="section-title">Performance Overview</span>
                <span className="section-label">LIVE STATS</span>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div className="neu-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 16px' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%', background: 'var(--green-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                        color: 'var(--green)'
                    }}>
                        <Activity size={24} />
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{stats.todayCount}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>Tasks Today</div>
                </div>

                <div className="neu-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 16px' }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%', background: 'var(--blue-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                        color: 'var(--blue)'
                    }}>
                        <Calendar size={24} />
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{stats.weekCount}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 4 }}>Tasks This Week</div>
                </div>
            </div>

            {/* Breakdown */}
            <div className="neu-card-inset" style={{ padding: 20, marginBottom: 24 }}>
                <div className="section-header" style={{ marginBottom: 16 }}>
                    <span className="section-label">WORK BREAKDOWN</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                    <StatItem icon={<Trash2 size={16} />} count={stats.breakdown.garbage} label="Garbage" color="var(--red)" />
                    <StatItem icon={<Wind size={16} />} count={stats.breakdown.brooming} label="Brooming" color="var(--orange)" />
                    <StatItem icon={<Sparkles size={16} />} count={stats.breakdown.mopping} label="Mopping" color="var(--blue)" />
                </div>
            </div>

            <div className="section-header">
                <span className="section-title">Activity History</span>
            </div>

            {/* History List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            </div>


            {/* Simplified Calendar View Placeholder (since actual calendar component is complex, simplified to date picker style for now or just list) 
                    Reverting to list as per user request for "Calendar Format" which implies a visual calendar is desired.
                    Implementing a simple month view.
                */}
            <CalendarView logs={displayLogs} staffMembers={staffMembers} isAdmin={isAdmin} />

            {displayLogs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 40, marginBottom: 10 }}>📜</div>
                    <div style={{ fontWeight: 600 }}>No logs found</div>
                    <div style={{ fontSize: 12 }}>Get started by completing tasks!</div>
                </div>
            )}
        </div>

    );
};

const StatItem: React.FC<{ icon: React.ReactNode; count: number; label: string; color: string }> = ({ icon, count, label, color }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{
            width: 36, height: 36, borderRadius: 12, background: 'var(--bg-card)',
            boxShadow: 'var(--neu-raised-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: color
        }}>
            {icon}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{count}</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</div>
    </div>
);

const CalendarView: React.FC<{ logs: TaskLog[]; staffMembers: StaffMember[]; isAdmin: boolean }> = ({ logs, staffMembers, isAdmin }) => {
    const [selectedDate, setSelectedDate] = React.useState(new Date());

    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    const selectedDetails = logs.filter(l => {
        const d = new Date(l.timestamp);
        return d.getDate() === selectedDate.getDate() &&
            d.getMonth() === selectedDate.getMonth() &&
            d.getFullYear() === selectedDate.getFullYear();
    });

    return (
        <div className="animate-in">
            <div className="neu-card" style={{ padding: 20, marginBottom: 20 }}>
                {/* Month Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer' }}>←</button>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{selectedDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer' }}>→</button>
                </div>

                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center' }}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{d}</div>)}
                    {blanks.map(b => <div key={`blank-${b}`} />)}
                    {days.map(d => {
                        const dateStr = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d).setHours(0, 0, 0, 0);
                        const hasLogs = logs.some(l => new Date(l.timestamp).setHours(0, 0, 0, 0) === dateStr);
                        const isSelected = d === selectedDate.getDate();

                        return (
                            <button
                                key={d}
                                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d))}
                                style={{
                                    width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                                    background: isSelected ? 'var(--blue)' : hasLogs ? 'var(--green-light)' : 'transparent',
                                    color: isSelected ? 'white' : hasLogs ? 'var(--green)' : 'var(--text-primary)',
                                    fontWeight: isSelected || hasLogs ? 700 : 400,
                                    margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                {d}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Logs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selectedDetails.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20, fontSize: 13 }}>No activity on this date</div>
                ) : (
                    selectedDetails.map(log => {
                        const staff = staffMembers.find(s => s.id === log.staffId);
                        return (
                            <div key={log.id} className="neu-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 12, background: 'var(--bg-inset)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                                    flexShrink: 0
                                }}>
                                    {getTaskIcon(log.taskId.includes('Routine') ? TaskType.ROUTINE_HOUSEKEEPING : TaskType.GLASS_CLEANING)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.taskId}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {isAdmin && staff && (
                                                <span style={{ color: 'var(--blue)', fontWeight: 600, marginLeft: 6 }}>
                                                    • {staff.name.split(' ')[0]}
                                                </span>
                                            )}
                                        </div>
                                        {log.block && (
                                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-inset)', padding: '2px 6px', borderRadius: 4 }}>
                                                B{log.block} {log.flat ? `- ${log.flat}` : ''}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default StaffLogsView;
