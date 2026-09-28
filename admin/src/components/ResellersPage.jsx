import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function ResellersPage() {
  const [resellers, setResellers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ name:'', mobile:'', email:'', pin:'1234', commission_percent:'30', notes:'' });
  const [saving, setSaving]         = useState(false);
  const [settleTarget, setSettleTarget] = useState(null);
  const [settleAmt, setSettleAmt]   = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listResellers();
      if (res?.success) setResellers(res.resellers || []);
    } catch(e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await api.createReseller(form);
      if (res?.success) { load(); setShowCreate(false); setForm({ name:'', mobile:'', email:'', pin:'1234', commission_percent:'30', notes:'' }); }
      else alert('Error: ' + res?.error);
    } catch(err) { alert('Error: ' + err.message); }
    setSaving(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await api.updateReseller({ ...editTarget });
      if (res?.success) { load(); setEditTarget(null); }
      else alert('Error: ' + res?.error);
    } catch(err) { alert('Error: ' + err.message); }
    setSaving(false);
  };

  const handleToggleStatus = async (r) => {
    const newStatus = r.status === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`${r.status === 'active' ? 'Block' : 'Activate'} reseller "${r.name}"?`)) return;
    await api.updateReseller({ id: r.id, status: newStatus });
    load();
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`Permanently delete reseller "${r.name}"?`)) return;
    await api.deleteReseller(r.id);
    load();
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    if (!settleAmt || parseFloat(settleAmt) <= 0) { alert('Enter a valid amount'); return; }
    const res = await api.settleCommission(settleTarget.id, settleAmt, 'Commission paid');
    if (res?.success) { alert('Commission settled ✅'); load(); setSettleTarget(null); setSettleAmt(''); }
    else alert('Error: ' + res?.error);
  };

  const fw = { display: 'flex', flexDirection: 'column', gap: '12px' };
  const lbl = { fontSize: '12px', fontWeight: '600', color: '#94a3b8', display: 'block', marginBottom: '6px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0 }}>Reseller Management</h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>Manage your distribution network & commissions</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <span>+</span> Add Reseller
        </button>
      </div>

      {/* Resellers Table */}
      <div className="glass-panel" style={{ overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(15,23,42,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Reseller ID', 'Name / Contact', 'Commission %', 'Total Sales', 'Total Earned', 'Pending Balance', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>Loading resellers...</td></tr>
              ) : resellers.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>
                  <div>🏪</div>
                  <p style={{ margin: '8px 0 4px', color: '#64748b', fontWeight: '600' }}>No resellers yet</p>
                  <p style={{ fontSize: '12px', color: '#334155' }}>Add your first reseller to start your distribution network</p>
                </td></tr>
              ) : resellers.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <span className="mono-text" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', color: '#22d3ee', fontWeight: '600' }}>
                      {r.id}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '600', color: '#f1f5f9', fontSize: '14px' }}>{r.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {r.mobile && <span>📱 {r.mobile}</span>}
                      {r.email && <span style={{ marginLeft: '8px' }}>✉️ {r.email}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', padding: '3px 10px', borderRadius: '20px', fontWeight: '700', fontSize: '13px' }}>
                      {r.commission_percent}%
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#f1f5f9', fontWeight: '600', fontFamily: 'monospace' }}>₹{(parseFloat(r.total_sales)||0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '14px 16px', color: '#34d399', fontWeight: '600', fontFamily: 'monospace' }}>₹{(parseFloat(r.total_earned)||0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: parseFloat(r.balance) > 0 ? '#fbbf24' : '#475569', fontWeight: '700', fontFamily: 'monospace' }}>₹{(parseFloat(r.balance)||0).toLocaleString('en-IN')}</span>
                      {parseFloat(r.balance) > 0 && (
                        <button onClick={() => setSettleTarget(r)} style={{ fontSize: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', padding: '2px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                          Pay
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                      background: r.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${r.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      color: r.status === 'active' ? '#34d399' : '#f87171'
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button onClick={() => setEditTarget({ ...r })} className="btn-secondary" style={{ fontSize: '12px', padding: '5px 10px' }}>Edit</button>
                      <button onClick={() => handleToggleStatus(r)} style={{
                        fontSize: '12px', padding: '5px 10px', borderRadius: '8px', border: '1px solid',
                        cursor: 'pointer', fontWeight: '600',
                        background: r.status === 'active' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                        borderColor: r.status === 'active' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)',
                        color: r.status === 'active' ? '#fbbf24' : '#34d399',
                      }}>
                        {r.status === 'active' ? 'Block' : 'Unblock'}
                      </button>
                      <button onClick={() => handleDelete(r)} className="btn-danger" style={{ padding: '5px 10px' }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Reseller Modal */}
      {showCreate && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontWeight: '800', color: '#fff' }}>Add New Reseller</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px 24px', ...fw }}>
              <div><label style={lbl}>Business / Name *</label><input required className="glass-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Rahul Tech Solutions" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={lbl}>Mobile</label><input className="glass-input" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} placeholder="+91 9876543210" /></div>
                <div><label style={lbl}>Email</label><input className="glass-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@example.com" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={lbl}>Login PIN</label><input className="glass-input" value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} placeholder="e.g. 1234" maxLength={8} /></div>
                <div><label style={lbl}>Commission %</label><input className="glass-input" type="number" min={1} max={90} value={form.commission_percent} onChange={e => setForm({...form, commission_percent: e.target.value})} /></div>
              </div>
              <div><label style={lbl}>Notes</label><input className="glass-input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Internal notes..." /></div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Reseller'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Reseller Modal */}
      {editTarget && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontWeight: '800', color: '#fff' }}>Edit Reseller</h3>
              <button onClick={() => setEditTarget(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <form onSubmit={handleUpdate} style={{ padding: '20px 24px', ...fw }}>
              <div><label style={lbl}>Name</label><input required className="glass-input" value={editTarget.name} onChange={e => setEditTarget({...editTarget, name: e.target.value})} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={lbl}>Mobile</label><input className="glass-input" value={editTarget.mobile} onChange={e => setEditTarget({...editTarget, mobile: e.target.value})} /></div>
                <div><label style={lbl}>Email</label><input className="glass-input" type="email" value={editTarget.email} onChange={e => setEditTarget({...editTarget, email: e.target.value})} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={lbl}>Change PIN</label><input className="glass-input" value={editTarget.pin || ''} onChange={e => setEditTarget({...editTarget, pin: e.target.value})} placeholder="Leave blank to keep" maxLength={8} /></div>
                <div><label style={lbl}>Commission %</label><input className="glass-input" type="number" min={1} max={90} value={editTarget.commission_percent} onChange={e => setEditTarget({...editTarget, commission_percent: e.target.value})} /></div>
              </div>
              <div><label style={lbl}>Status</label>
                <select className="glass-input" value={editTarget.status} onChange={e => setEditTarget({...editTarget, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Commission Modal */}
      {settleTarget && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ margin: 0, fontWeight: '800', color: '#fff' }}>Settle Commission — {settleTarget.name}</h3>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>Pending Balance: <strong style={{ color: '#fbbf24' }}>₹{(parseFloat(settleTarget.balance)||0).toLocaleString('en-IN')}</strong></p>
            </div>
            <form onSubmit={handleSettle} style={{ padding: '20px 24px', ...fw }}>
              <div><label style={lbl}>Amount to Pay (₹)</label>
                <input required className="glass-input" type="number" min={1} max={parseFloat(settleTarget.balance)||0} value={settleAmt} onChange={e => setSettleAmt(e.target.value)} placeholder={`Max: ₹${(parseFloat(settleTarget.balance)||0).toLocaleString('en-IN')}`} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setSettleTarget(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>Mark as Paid ✅</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
