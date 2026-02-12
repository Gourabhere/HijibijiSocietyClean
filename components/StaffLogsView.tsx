"use client"
import React, { useMemo, useState } from 'react';
import { TaskLog, StaffMember, TaskType, BUILDING_STRUCTURE, FLOORS } from '../types';
import { getTaskIcon } from '../constants';
import { Activity, Calendar, Award, Trash2, Wind, Sparkles, ChevronLeft, ChevronRight, X, Image as ImageIcon, Grid, List } from 'lucide-react';

interface StaffLogsViewProps {
    currentUser: number;
    logs: TaskLog[];
    staffMembers: StaffMember[];
    isAdmin?: boolean;
}

const StaffLogsView: React.FC<StaffLogsViewProps> = ({ currentUser, logs, staffMembers, isAdmin = false }) => {
    const [viewMode, setViewMode] = useState<'ACTIVITY' | 'REVIEW'>('ACTIVITY');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Filter logs for current user (or all if admin)
    const displayLogs = useMemo(() => {
        let filtered = logs;
        if (!isAdmin) {
            filtered = logs.filter(l => l.staffId === currentUser);
        }
        return filtered.sort((a, b) => b.timestamp - a.timestamp);
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

    const dateFilteredLogs = useMemo(() => {
        return displayLogs.filter(l => {
            const d = new Date(l.timestamp);
            return d.getDate() === selectedDate.getDate() &&
                d.getMonth() === selectedDate.getMonth() &&
                d.getFullYear() === selectedDate.getFullYear();
        });
    }, [displayLogs, selectedDate]);

    // Group logs by date for list view (if needed, but we are focusing on date selection now)

    return (
        <div className="animate-in">
            {/* Image Modal */}
            {selectedImage && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.9)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 20
                }} onClick={() => setSelectedImage(null)}>
                    <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '90%' }}>
                        <button
                            onClick={() => setSelectedImage(null)}
                            style={{
                                position: 'absolute', top: -40, right: 0,
                                background: 'none', border: 'none', color: 'white'
                            }}
                        >
                            <X size={24} />
                        </button>
                        <img src={selectedImage} alt="Proof" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8 }} />
                    </div>
                </div>
            )}

            {/* Calendar Modal */}
            {showCalendar && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setShowCalendar(false)}>
                    <div className="neu-card" style={{ padding: 20, background: 'var(--bg-card)', width: 320 }} onClick={e => e.stopPropagation()}>
                        <CalendarPicker selectedDate={selectedDate} onSelect={(d) => { setSelectedDate(d); setShowCalendar(false); }} logs={displayLogs} />
                        <button className="neu-button" style={{ width: '100%', marginTop: 16 }} onClick={() => setShowCalendar(false)}>Close</button>
                    </div>
                </div>
            )}

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

            {/* View Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 8, background: 'var(--bg-inset)', padding: 4, borderRadius: 12 }}>
                    <button
                        onClick={() => setViewMode('ACTIVITY')}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: 'none',
                            background: viewMode === 'ACTIVITY' ? 'var(--bg-card)' : 'transparent',
                            color: viewMode === 'ACTIVITY' ? 'var(--blue)' : 'var(--text-muted)',
                            fontWeight: 700, fontSize: 12, cursor: 'pointer',
                            boxShadow: viewMode === 'ACTIVITY' ? 'var(--neu-raised-sm)' : 'none',
                            display: 'flex', alignItems: 'center', gap: 6
                        }}
                    >
                        <List size={14} /> Activity
                    </button>
                    {(isAdmin || true) && ( // Allow everyone to see for now, or strict admin check
                        <button
                            onClick={() => setViewMode('REVIEW')}
                            style={{
                                padding: '8px 16px', borderRadius: 8, border: 'none',
                                background: viewMode === 'REVIEW' ? 'var(--bg-card)' : 'transparent',
                                color: viewMode === 'REVIEW' ? 'var(--blue)' : 'var(--text-muted)',
                                fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                boxShadow: viewMode === 'REVIEW' ? 'var(--neu-raised-sm)' : 'none',
                                display: 'flex', alignItems: 'center', gap: 6
                            }}
                        >
                            <Grid size={14} /> Review
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setShowCalendar(true)}
                    className="neu-button"
                    style={{ padding: '8px 12px', fontSize: 12, background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                >
                    📅 {selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </button>
            </div>

            <div className="section-header">
                <span className="section-title">
                    {viewMode === 'ACTIVITY' ? 'Activity Log' : 'Housekeeping Review'}
                </span>
                <span className="section-label">
                    {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
            </div>

            {viewMode === 'ACTIVITY' ? (
                // Activity List View
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {dateFilteredLogs.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 13 }}>
                            No activity recorded for this date
                        </div>
                    ) : (
                        dateFilteredLogs.map(log => {
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
                                    {log.imageUrl && (
                                        <button
                                            onClick={() => setSelectedImage(log.imageUrl || null)}
                                            style={{
                                                width: 32, height: 32, borderRadius: 8, border: 'none',
                                                background: 'var(--blue-light)', color: 'var(--blue)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                            }}
                                        >
                                            <ImageIcon size={16} />
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                // Housekeeping Review Grid
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {BUILDING_STRUCTURE.map(block => (
                        <div key={block.block} className="neu-card" style={{ padding: 16 }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Block {block.block}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {FLOORS.map(floor => {
                                    const flats = block.flatsPerFloor(floor);
                                    return (
                                        <div key={floor} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', width: 24 }}>{floor}F</span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {flats.map(flat => {
                                                    // Find log for this flat
                                                    const log = dateFilteredLogs.find(l =>
                                                        l.block === block.block &&
                                                        l.floor === floor &&
                                                        l.flat === flat &&
                                                        l.status === 'COMPLETED'
                                                    );
                                                    const isDone = !!log;
                                                    return (
                                                        <button
                                                            key={flat}
                                                            onClick={() => log?.imageUrl && setSelectedImage(log.imageUrl)}
                                                            disabled={!log?.imageUrl}
                                                            style={{
                                                                width: 42, height: 36, borderRadius: 6, border: 'none',
                                                                background: isDone ? 'var(--green)' : 'var(--bg-inset)',
                                                                color: isDone ? 'white' : 'var(--text-muted)',
                                                                fontSize: 11, fontWeight: 700,
                                                                cursor: log?.imageUrl ? 'pointer' : 'default',
                                                                opacity: isDone ? 1 : 0.5,
                                                                position: 'relative'
                                                            }}
                                                        >
                                                            {flat}
                                                            {isDone && log?.imageUrl && (
                                                                <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', border: '1px solid white' }} />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
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

const CalendarPicker: React.FC<{ selectedDate: Date; onSelect: (d: Date) => void; logs: TaskLog[] }> = ({ selectedDate, onSelect, logs }) => {
    const [viewDate, setViewDate] = React.useState(new Date(selectedDate));

    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    return (
        <div>
            {/* Month Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <ChevronLeft size={20} />
                </button>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center' }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={`${d}-${i}`} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>{d}</div>)}
                {blanks.map((b, i) => <div key={`blank-${i}`} />)}
                {days.map(d => {
                    const currentDayDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
                    const dateStr = currentDayDate.setHours(0, 0, 0, 0);
                    const hasLogs = logs.some(l => new Date(l.timestamp).setHours(0, 0, 0, 0) === dateStr);
                    const isSelected = d === selectedDate.getDate() && viewDate.getMonth() === selectedDate.getMonth() && viewDate.getFullYear() === selectedDate.getFullYear();

                    return (
                        <button
                            key={d}
                            onClick={() => onSelect(new Date(viewDate.getFullYear(), viewDate.getMonth(), d))}
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
    );
};

export default StaffLogsView;
