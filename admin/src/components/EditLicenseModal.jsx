import React, { useState, useEffect } from 'react';
import {
  Edit2,
  X,
  Save,
  Calendar,
  Shield,
  Laptop,
  Copy,
  Check,
  User,
  Phone,
  Mail,
  Clock
} from 'lucide-react';

export default function EditLicenseModal({ isOpen, onClose, license, onSave, onUpdated }) {
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
  const [copiedKey, setCopiedKey] = useState(false);

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

  if (!license && !isOpen) return null;
  if (!license) return null;

  const saveFn = onUpdated || onSave;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (saveFn) {
        await saveFn({
          ...formData,
          expires_at: new Date(formData.expires_at).toISOString()
        });
      }
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

  const handleCopyKey = () => {
    if (license?.license_key) {
      navigator.clipboard.writeText(license.license_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content max-w-xl">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Edit License Details</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400 mono-text">
                  {license.license_key && license.license_key.length > 32
                    ? `${license.license_key.substring(0, 18)}...${license.license_key.substring(license.license_key.length - 8)}`
                    : license.license_key}
                </span>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="text-slate-400 hover:text-white p-0.5"
                  title="Copy full key"
                >
                  {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Client / Business Name
            </label>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                WhatsApp Mobile
              </label>
              <input
                type="text"
                className="glass-input"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                className="glass-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* Expiry Date with quick extend buttons */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Expiry Date</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddDays(30)}
                  className="text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition-colors"
                >
                  +30 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleAddDays(365)}
                  className="text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition-colors"
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

          {/* Plan Tier & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Plan Tier
              </label>
              <select
                className="glass-input"
                value={formData.plan_type}
                onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
              >
                <option value="Starter">Starter Plan</option>
                <option value="Pro">Pro Plan</option>
                <option value="Business">Business Plan</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Lifetime">Lifetime Unlimited</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                License Status
              </label>
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
          </div>

          {/* Max Devices & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Max Allowed Devices
              </label>
              <input
                type="number"
                min="1"
                max="50"
                className="glass-input"
                value={formData.max_devices}
                onChange={(e) => setFormData({ ...formData, max_devices: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Internal Notes
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="Optional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
