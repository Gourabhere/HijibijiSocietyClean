import React, { useState } from 'react';
import { SupplyRequest, StaffMember } from '../types';
import { Package, Send, Clock, Check } from 'lucide-react';

interface SupplyRequestViewProps {
  currentUser: number;
  requests: SupplyRequest[];
  onRequest: (req: Omit<SupplyRequest, 'id'>) => void;
  staffMembers: StaffMember[];
  isManagerView?: boolean;
}

const PRESET_ITEMS = [
  'Floor Cleaner Liquid',
  'Garbage Bags (Large)',
  'Heavy Broom',
  'Glass Detergent',
  'Mop Refills',
  'Disinfectant Spray',
];

const SupplyRequestView: React.FC<SupplyRequestViewProps> = ({ currentUser, requests, onRequest, staffMembers, isManagerView = false }) => {
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !quantity) return;

    onRequest({
      item,
      quantity,
      urgency,
      status: 'OPEN',
      requesterId: currentUser,
      timestamp: Date.now()
    });

    setItem('');
    setQuantity('');
    setUrgency('LOW');
  };

  return (
    <div style={{ paddingBottom: 16 }}>

      {/* Quick Select */}
      <div className="animate-in" style={{ marginBottom: 20 }}>
        <div className="section-header">
          <span className="section-title">Quick Request</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESET_ITEMS.map(preset => (
            <button
              key={preset}
              onClick={() => setItem(preset)}
              style={{
                padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: item === preset ? 'var(--green-light)' : 'var(--bg-card)',
                color: item === preset ? '#059669' : 'var(--text-secondary)',
                boxShadow: item === preset ? 'var(--neu-inset-sm)' : 'var(--neu-raised-sm)',
                transition: 'all 0.2s'
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Request Form - Hide for Managers */}
      {!isManagerView && (
        <form onSubmit={handleSubmit}>
          <div className="neu-card animate-in animate-in-delay-1" style={{ marginBottom: 20, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--neu-dark)' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, background: 'var(--coral)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
              }}>
                <Package size={16} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>New Request</span>
            </div>

            <div className="neu-input-group" style={{ marginBottom: 14 }}>
              <label className="neu-label">Item Name</label>
              <div className="neu-input-wrapper">
                <input
                  type="text"
                  className="neu-input"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="e.g. Floor Cleaner Liquid"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              <div className="neu-input-group" style={{ flex: 1 }}>
                <label className="neu-label">Quantity</label>
                <div className="neu-input-wrapper">
                  <input
                    type="text"
                    className="neu-input"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 5 Liters"
                  />
                </div>
              </div>
              <div className="neu-input-group" style={{ width: 110 }}>
                <label className="neu-label">Urgency</label>
                <div className="neu-input-wrapper">
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="neu-input"
                    style={{ cursor: 'pointer', appearance: 'none' }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Med</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!item || !quantity}
              className="btn btn-coral"
              style={{
                width: '100%', padding: '14px', fontSize: 14, fontWeight: 700, borderRadius: 14,
                opacity: item && quantity ? 1 : 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              <Send size={16} /> Submit Request
            </button>
          </div>
        </form>
      )}

      {/* Request History */}
      <div className="animate-in animate-in-delay-2">
        <div className="section-header">
          <span className="section-title">Recent Requests</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.slice().reverse().map(req => (
            <div key={req.id} className="neu-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{req.item}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', background: 'var(--bg-card)', boxShadow: 'var(--neu-inset-sm)', padding: '2px 10px', borderRadius: 8 }}>{req.quantity}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: req.urgency === 'HIGH' ? 'var(--coral)' : req.urgency === 'MEDIUM' ? 'var(--yellow)' : 'var(--text-muted)' }}>
                    {req.urgency}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  By {staffMembers.find(s => s.id === req.requesterId)?.name || 'Staff'}
                </div>
              </div>
              <div>
                {req.status === 'FULFILLED' ? (
                  <span className="badge badge-green" style={{ gap: 4 }}>
                    <Check size={12} /> Done
                  </span>
                ) : (
                  <span className="badge badge-yellow" style={{ gap: 4 }}>
                    <Clock size={12} /> Open
                  </span>
                )}
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="neu-card-inset" style={{
              textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)',
              fontSize: 13, fontWeight: 500, fontStyle: 'italic'
            }}>
              No supply requests yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplyRequestView;
