import React, { useState, useEffect } from 'react';

export default function EditLicenseModal({ isOpen, onClose, license, onSave }) {
  const [formData, setFormData] = useState({
    id: '',
    customer_name: '',
    mobile: '',
    email: '',
    plan_type: 'Pro',
    expires_at: '',
    status: 'active',
    max_devices: 1,
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (license) {
      setFormData({
        id: license.id,
        license_key: license.license_key,
        customer_name: license.customer_name ? String(license.customer_name) : '',
        mobile: license.mobile ? String(license.mobile) : '',
        email: license.email ? String(license.email) : '',
        plan_type: license.plan_type || 'Pro',
        expires_at: (() => {
          if (!license.expires_at) return '';
          try {
            const d = new Date(license.expires_at);
            return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
          } catch (_) { return ''; }
        })(),
        status: license.status || 'active',
        max_devices: license.max_devices || 1,
        notes: license.notes || ''
      });
    }
  }, [license]);

  if (!isOpen || !license) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        ...formData,
        expires_at: new Date(formData.expires_at).toISOString()
      });
      onClose();
    } catch (err) {
      alert('Error updating license: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDays = (days) => {
    const current = formData.expires_at ? new Date(formData.expires_at) : new Date();
    current.setDate(current.getDate() + days);
    setFormData({
      ...formData,
      expires_at: current.toISOString().split('T')[0]
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-white">Edit License</h3>
            <p className="text-xs text-slate-400 mono-text mt-0.5">{license.license_key}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Customer Name</label>
            <input
              type="text"
              required
              className="glass-input"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mobile</label>
              <input
                type="text"
                className="glass-input"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                className="glass-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* Expiry Date with quick buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Expiry Date</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddDays(30)}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                >
                  +30 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleAddDays(365)}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700"
                >
                  +1 Year
                </button>
              </div>
            </div>
            <input
              type="date"
              required
              className="glass-input"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
            />
          </div>

          {/* Status & Max Devices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Status</label>
              <select
                className="glass-input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended / Blocked</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Max Devices</label>
              <input
                type="number"
                min="1"
                max="50"
                className="glass-input"
                value={formData.max_devices}
                onChange={(e) => setFormData({ ...formData, max_devices: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
