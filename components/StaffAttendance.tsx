import React, { useState, useEffect } from 'react';
import { PunchLog, StaffMember } from '../types';
import { Clock, LogIn, LogOut } from 'lucide-react';

interface StaffAttendanceProps {
    currentUser: number;
    punchLogs: PunchLog[];
    onPunch: (log: Omit<PunchLog, 'id'>) => void;
    staffMembers: StaffMember[];
    isManagerView?: boolean;
}

const StaffAttendance: React.FC<StaffAttendanceProps> = ({ currentUser, punchLogs, onPunch, staffMembers, isManagerView = false }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const staff = staffMembers.find(s => s.id === currentUser);

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const todayStart = new Date().setHours(0, 0, 0, 0);

    // If Manager View, show list of all staff statuses
    if (isManagerView) {
        return (
            <div className="animate-in" style={{ paddingBottom: 20 }}>
                <div className="section-header">
                    <span className="section-title">Staff Attendance Overview</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {staffMembers.map(s => {
                        const sLogs = punchLogs
                            .filter(l => l.staffId === s.id && l.timestamp >= todayStart)
                            .sort((a, b) => b.timestamp - a.timestamp);
                        const isPunchedIn = sLogs[0]?.type === 'IN';
                        const lastPunchTime = sLogs[0] ? new Date(sLogs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

                        // Calculate hours
                        let totalMs = 0;
                        const sorted = [...sLogs].sort((a, b) => a.timestamp - b.timestamp);
                        for (let i = 0; i < sorted.length; i++) {
                            if (sorted[i].type === 'IN') {
                                const outTime = sorted[i + 1]?.type === 'OUT' ? sorted[i + 1].timestamp : Date.now();
                                totalMs += outTime - sorted[i].timestamp;
                            }
                        }
                        const hours = Math.floor(totalMs / 3600000); // Simple hours for list

                        return (
                            <div key={s.id} className="neu-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <img src={s.avatar} alt={s.name} className="avatar" />
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{s.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.role}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        fontSize: 12, fontWeight: 700,
                                        color: isPunchedIn ? 'var(--green)' : 'var(--text-muted)',
                                        background: isPunchedIn ? 'var(--green-light)' : 'var(--bg-inset)',
                                        padding: '4px 8px', borderRadius: 6, display: 'inline-block', marginBottom: 4
                                    }}>
                                        {isPunchedIn ? 'ON DUTY' : 'OFF DUTY'}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {isPunchedIn ? `Since ${lastPunchTime}` : `Last: ${lastPunchTime}`}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    const todaysLogs = punchLogs
        .filter(l => l.staffId === currentUser && l.timestamp >= todayStart)
        .sort((a, b) => b.timestamp - a.timestamp);

    const lastPunch = todaysLogs[0];
    const isPunchedIn = lastPunch?.type === 'IN';

    const calculateHoursWorked = (): { hours: number; minutes: number } => {
        let totalMs = 0;
        const sorted = [...todaysLogs].sort((a, b) => a.timestamp - b.timestamp);
        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i].type === 'IN') {
                const outTime = sorted[i + 1]?.type === 'OUT' ? sorted[i + 1].timestamp : Date.now();
                totalMs += outTime - sorted[i].timestamp;
            }
        }
        const totalMin = Math.floor(totalMs / 60000);
        return { hours: Math.floor(totalMin / 60), minutes: totalMin % 60 };
    };

    const worked = calculateHoursWorked();
    const workPercent = Math.min(100, Math.round(((worked.hours * 60 + worked.minutes) / 480) * 100));

    const handlePunch = () => {
        onPunch({
            staffId: currentUser,
            type: isPunchedIn ? 'OUT' : 'IN',
            timestamp: Date.now(),
        });
    };

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const ringSize = 200;
    const strokeWidth = 16;
    const radius = (ringSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (workPercent / 100) * circumference;

    return (
        <div style={{ paddingBottom: 16 }}>

            {/* Staff Name */}
            <div className="animate-in" style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 4 }}>
                    STAFF ATTENDANCE
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {staff?.name || 'Staff'}
                </h2>
            </div>

            {/* Punch Button */}
            <div className="animate-in animate-in-delay-1" style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
                <button
                    onClick={handlePunch}
                    className={`neu-punch-btn ${isPunchedIn ? 'punch-out' : 'punch-in'}`}
                >
                    {isPunchedIn ? <LogOut size={36} /> : <LogIn size={36} />}
                    <span style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                        {isPunchedIn ? 'PUNCH OUT' : 'PUNCH IN'}
                    </span>
                </button>
            </div>

            {/* Hours Worked */}
            <div className="neu-card-inset animate-in animate-in-delay-2" style={{ marginBottom: 24, textAlign: 'center', padding: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 16 }}>
                    HOURS WORKED TODAY:
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <div className="progress-ring-container" style={{ width: ringSize, height: ringSize }}>
                        <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none" stroke="var(--neu-dark)" strokeWidth={strokeWidth} />
                            <circle
                                cx={ringSize / 2} cy={ringSize / 2} r={radius} fill="none"
                                stroke="url(#attendanceGradient)" strokeWidth={strokeWidth}
                                strokeDasharray={circumference} strokeDashoffset={offset}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                            />
                            <defs>
                                <linearGradient id="attendanceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#1d4ed8" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: '50%', background: 'var(--blue-light)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8
                            }}>
                                <Clock size={18} color="#3b82f6" />
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                                {worked.hours}h {worked.minutes.toString().padStart(2, '0')}m
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginTop: 4 }}>
                                PROGRESS
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Logs */}
            <div className="animate-in animate-in-delay-3">
                <div className="section-header">
                    <span className="section-title">Recent Logs</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {todaysLogs.length === 0 ? (
                        <>
                            <PunchEntry type="IN" time="9:00 AM" label="Punch In: 9:00 AM" />
                            <PunchEntry type="OUT" time="1:00 PM" label="Punch Out: 1:00 PM" />
                            <PunchEntry type="IN" time="2:00 PM" label="Punch In: 2:00 PM" />
                        </>
                    ) : (
                        todaysLogs.map(log => (
                            <PunchEntry
                                key={log.id}
                                type={log.type}
                                time={formatTime(log.timestamp)}
                                label={`Punch ${log.type === 'IN' ? 'In' : 'Out'}: ${formatTime(log.timestamp)}`}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const PunchEntry: React.FC<{ type: 'IN' | 'OUT'; time: string; label: string }> = ({ type, label }) => (
    <div className="neu-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
        <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: type === 'IN' ? 'var(--green-light)' : 'var(--coral-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
            {type === 'IN'
                ? <LogIn size={18} color="#10b981" />
                : <LogOut size={18} color="#f97066" />
            }
        </div>
        <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                {type === 'IN' ? 'Clocked in' : 'Clocked out'}
            </div>
        </div>
    </div>
);

export default StaffAttendance;
