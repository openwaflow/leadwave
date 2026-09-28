import React, { useState } from 'react';

export default function GenerateLicenseModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    user_code: '',
    mobile: '',
    email: '',
    plan_type: 'Pro',
    validity_days: '365',
    max_devices: '1',
    price: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_code || !formData.user_code.trim()) {
      alert('Device ID / User Code is required! Please enter the customer’s Device Code from their WAGrow app.');
      return;
    }
    setLoading(true);
    try {
      const res = await onCreated(formData);
      if (res && res.success) {
        setCreatedResult(res.license);
      }
    } catch (err) {
      alert('Error creating license: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (createdResult) {
      navigator.clipboard.writeText(createdResult.license_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getWhatsAppShareUrl = () => {
    if (!createdResult) return '#';
    const cleanPhone = String(formData.mobile || '').replace(/[^0-9]/g, '');
    const userCodeText = createdResult.user_code || formData.user_code;
    const msg = encodeURIComponent(
      `🎉 Hello ${formData.customer_name},\n\n` +
      `Your WAGrow WhatsApp CRM License is ready!\n\n` +
      `🔑 License Key: ${createdResult.license_key}\n` +
      `💻 Device ID: ${userCodeText}\n` +
      `📦 Plan: ${formData.plan_type}\n` +
      `⏳ Valid Till: ${new Date(createdResult.expires_at).toLocaleDateString()}\n` +
      `👥 Allowed Devices: ${formData.max_devices}\n\n` +
      `Download App: https://github.com/openwaflow/leadwave/releases\n\n` +
      `Thank you for choosing WAGrow CRM! 🚀`
    );
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
  };

  const handleResetAndClose = () => {
    setCreatedResult(null);
    setFormData({
      customer_name: '',
      user_code: '',
      mobile: '',
      email: '',
      plan_type: 'Pro',
      validity_days: '365',
      max_devices: '1',
      price: '',
      notes: ''
    });
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Generate License Key</h3>
              <p className="text-xs text-slate-400">Issue an authentic WAGrow software license</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        {createdResult ? (
          /* Success Screen */
          <div className="p-6 space-y-5 text-center">
            <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>

            <div>
              <h4 className="font-bold text-xl text-white">License Generated!</h4>
              <p className="text-sm text-slate-400 mt-1">Saved directly to Google Sheets database</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left space-y-2">
              <p className="text-xs text-slate-400 font-semibold uppercase">License Key</p>
              <div className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="mono-text font-bold text-emerald-400 text-sm tracking-wide">
                  {createdResult.license_key}
                </span>
                <button
                  onClick={handleCopy}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {copied ? 'Copied! ✓' : 'Copy'}
                </button>
              </div>
              <div className="text-xs text-slate-400 pt-2 flex flex-col gap-1.5 border-t border-slate-800/80">
                <div className="flex justify-between">
                  <span>Client: <strong className="text-slate-200">{createdResult.customer_name}</strong></span>
                  <span>Plan: <strong className="text-slate-200">{createdResult.plan_type}</strong></span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Device Bound:</span>
                  <span className="mono-text font-semibold text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {createdResult.user_code || formData.user_code}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {formData.mobile && (
                <a
                  href={getWhatsAppShareUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary flex-1 justify-center bg-gradient-to-r from-emerald-600 to-green-600"
                >
                  <span>Share on WhatsApp 💬</span>
                </a>
              )}
              <button
                onClick={handleResetAndClose}
                className="btn-secondary flex-1 justify-center"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Client / Business Name <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                className="glass-input"
                placeholder="e.g. Rahul Sharma / Tech Solutions"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              />
            </div>

            {/* Device ID / User Code (Mandatory) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Device ID / User Code <span className="text-emerald-400">*</span>
                </label>
                <span className="text-[10px] text-emerald-400/80">From customer's WAGrow app</span>
              </div>
              <input
                type="text"
                required
                className="glass-input mono-text font-semibold uppercase tracking-wider text-emerald-400 placeholder:text-slate-600"
                placeholder="e.g. USER-A0C2E4C7-CDC90AFB"
                value={formData.user_code}
                onChange={(e) => setFormData({ ...formData, user_code: e.target.value.trim().toUpperCase() })}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Client PC ka Device Code daalein. Bina Device ID ke license dusre PC par kaam nahi karega.
              </p>
            </div>

            {/* Mobile & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  WhatsApp Number (with Country Code)
                </label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="+91 9876543210"
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
                  placeholder="client@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Plan & Validity */}
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
                  Validity Duration
                </label>
                <select
                  className="glass-input"
                  value={formData.validity_days}
                  onChange={(e) => setFormData({ ...formData, validity_days: e.target.value })}
                >
                  <option value="7">7 Days Trial</option>
                  <option value="30">1 Month (30 Days)</option>
                  <option value="90">3 Months (90 Days)</option>
                  <option value="180">6 Months (180 Days)</option>
                  <option value="365">1 Year (365 Days)</option>
                  <option value="3650">Lifetime (10 Years)</option>
                </select>
              </div>
            </div>

            {/* Devices Limit, Price & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Max Allowed PCs / Devices
                </label>
                <select
                  className="glass-input"
                  value={formData.max_devices}
                  onChange={(e) => setFormData({ ...formData, max_devices: e.target.value })}
                >
                  <option value="1">1 PC (Standard)</option>
                  <option value="2">2 PCs</option>
                  <option value="3">3 PCs</option>
                  <option value="5">5 PCs (Office)</option>
                  <option value="10">10 PCs (Enterprise)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sale Price (₹) <span style={{ color: '#10b981', fontSize: '10px' }}>for commission tracking</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="glass-input"
                  placeholder="e.g. 2999"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Internal Notes
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="e.g. Paid via UPI, Referral from Amit"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Generating...' : 'Generate & Save License'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
