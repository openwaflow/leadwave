/**
 * WAGrow Admin API Service
 * Dual-role: Admin + Reseller
 */

const STORAGE = {
  API_URL:       'wg_api_url',
  ADMIN_PIN:     'wg_admin_pin',
  RESELLER_ID:   'wg_reseller_id',
  RESELLER_PIN:  'wg_reseller_pin',
  ROLE:          'wg_role',
};

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbynPdf4uikZeryEdTVTm8Ymc26CtSwLzvGZ7QuVCxVENotWhy_lUM7TES2XTd4JMe4/exec';

export const auth = {
  getApiUrl: () => {
    try {
      const saved = localStorage.getItem(STORAGE.API_URL);
      if (saved && (saved.includes('AKfycbz1XvaCZjCbonh1bqeNycOGFwFD7rApZUMuZb3XMOsIfJtoHlVFUqJILdfOVcRlEpk') || saved.includes('AKfycbyNtMq9Z1h8LL_wnzrt-QMUPPI8yKQyAhPmpDF4SAyM3m5BsLKyRzmfvrYbDO0O1Vc'))) {
        localStorage.setItem(STORAGE.API_URL, DEFAULT_GAS_URL);
        return DEFAULT_GAS_URL;
      }
      if (saved && saved !== 'undefined' && saved !== 'null' && saved.trim() !== '') {
        return saved.trim();
      }
    } catch (_) {}
    return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GAS_API_URL) || DEFAULT_GAS_URL;
  },
  setApiUrl: (u) => {
    try {
      localStorage.setItem(STORAGE.API_URL, (u || '').trim());
    } catch (_) {}
  },
  getRole: () => {
    try {
      const r = sessionStorage.getItem(STORAGE.ROLE) || localStorage.getItem(STORAGE.ROLE) || null;
      if (r === 'admin' || r === 'reseller') return r;
    } catch (_) {}
    return null;
  },
  setRole: (r) => {
    try {
      sessionStorage.setItem(STORAGE.ROLE, r);
      localStorage.setItem(STORAGE.ROLE, r);
    } catch (_) {}
  },
  getAdminPin: () => {
    try {
      return sessionStorage.getItem(STORAGE.ADMIN_PIN) || localStorage.getItem(STORAGE.ADMIN_PIN) || '';
    } catch (_) { return ''; }
  },
  setAdminPin: (p) => {
    try {
      sessionStorage.setItem(STORAGE.ADMIN_PIN, p);
      localStorage.setItem(STORAGE.ADMIN_PIN, p);
    } catch (_) {}
  },
  getResellerId: () => {
    try {
      return localStorage.getItem(STORAGE.RESELLER_ID) || '';
    } catch (_) { return ''; }
  },
  getResellerPin: () => {
    try {
      return sessionStorage.getItem(STORAGE.RESELLER_PIN) || localStorage.getItem(STORAGE.RESELLER_PIN) || '';
    } catch (_) { return ''; }
  },
  setResellerAuth: (id, pin) => {
    try {
      localStorage.setItem(STORAGE.RESELLER_ID, id);
      localStorage.setItem(STORAGE.RESELLER_PIN, pin);
      sessionStorage.setItem(STORAGE.RESELLER_PIN, pin);
    } catch (_) {}
  },
  isAuthenticated: () => !!auth.getRole(),
  clearAuth: () => {
    [STORAGE.ADMIN_PIN, STORAGE.RESELLER_PIN, STORAGE.ROLE].forEach(k => {
      try {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      } catch (_) {}
    });
  },
  getAuthPayload: () => {
    const role = auth.getRole();
    if (role === 'admin') return { role: 'admin', pin: auth.getAdminPin() };
    return { role: 'reseller', reseller_id: auth.getResellerId(), pin: auth.getResellerPin() };
  }
};

// Core request function
async function call(action, data = {}, method = 'POST') {
  const apiUrl = auth.getApiUrl();
  if (!apiUrl) throw new Error('API_URL_NOT_CONFIGURED');
  
  const payload = { ...auth.getAuthPayload(), ...data, action };

  try {
    let res;
    if (method === 'GET') {
      const qs  = new URLSearchParams(payload).toString();
      const url = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}${qs}`;
      res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    } else {
      res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
    }

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      console.warn('API returned non-JSON response:', text.slice(0, 200));
      return { success: false, error: 'Server returned non-JSON response. Please verify Google Apps Script deployment.' };
    }
  } catch (netErr) {
    console.error('API call error:', netErr);
    return { success: false, error: netErr.message || 'Network request failed' };
  }
}

export const apiConfig = auth;

// ── Public
export const api = {
  ping: async (url) => {
    try {
      const target = `${url || auth.getApiUrl()}${(url || auth.getApiUrl()).includes('?') ? '&' : '?'}action=ping`;
      const res = await fetch(target, { method: 'GET' });
      const text = await res.text();
      return JSON.parse(text);
    } catch (e) {
      return { success: false, error: e.message || 'Connection failed' };
    }
  },
  pingServer: async (url) => {
    try {
      const target = `${url || auth.getApiUrl()}${(url || auth.getApiUrl()).includes('?') ? '&' : '?'}action=ping`;
      const res = await fetch(target, { method: 'GET' });
      const text = await res.text();
      return JSON.parse(text);
    } catch (e) {
      return { success: false, error: e.message || 'Connection failed' };
    }
  },

  // ── Auth
  loginAdmin: async (pin) => {
    const res = await call('login', { pin, role: 'admin' });
    if (res.success) { auth.setAdminPin(pin); auth.setRole('admin'); }
    return res;
  },
  loginReseller: async (resellerId, pin) => {
    const res = await call('resellerLogin', { reseller_id: resellerId, pin, role: 'reseller' });
    if (res.success) { auth.setResellerAuth(resellerId, pin); auth.setRole('reseller'); }
    return res;
  },

  // ── Dashboard stats
  getStats: () => call('getStats', {}, 'GET'),
  getResellerStats: () => call('getResellerStats', {}, 'GET'),

  // ── Licenses
  listLicenses:  (search = '', status = 'all', resellerId = '') =>
    call('listLicenses', { search, status, reseller_id: resellerId }, 'GET'),
  listMyLicenses:(search = '', status = 'all') =>
    call('listMyLicenses', { search, status }, 'GET'),
  createLicense: (d) => call('createLicense', d),
  updateLicense: (d) => call('updateLicense', d),
  deleteLicense: (id) => call('deleteLicense', { id }),
  resetDevices:  (key) => call('resetDevices', { key }),
  getActivations:(key) => call('getActivations', { key }, 'GET'),

  // ── Earnings
  getEarnings:      (period = 'month', resellerId = '') => call('getEarnings', { period, reseller_id: resellerId }, 'GET'),
  listTransactions: (resellerId = '', period = 'month') => call('listTransactions', { reseller_id: resellerId, period }, 'GET'),

  // ── Resellers (admin only)
  listResellers:    () => call('listResellers', {}, 'GET'),
  createReseller:   (d) => call('createReseller', d),
  updateReseller:   (d) => call('updateReseller', d),
  deleteReseller:   (id) => call('deleteReseller', { id }),
  settleCommission: (resellerId, amount, note) => call('settleCommission', { reseller_id: resellerId, amount, note }),

  // ── Settings
  updateAdminPin: async (newPin) => {
    const res = await call('updatePin', { new_pin: newPin });
    if (res.success) auth.setAdminPin(newPin);
    return res;
  },

  // ── Trial (public — no auth needed)
  requestTrial: async (name, mobile, machineId, apiUrl) => {
    const url = apiUrl || auth.getApiUrl();
    if (!url) throw new Error('API_URL_NOT_CONFIGURED');
    const payload = { action: 'requestTrial', name, mobile, machine_id: machineId };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  listTrials:        (period = '', status = 'all') => call('listTrials', { period, status }, 'GET'),
  updateTrialStatus: (id, status, note = '')       => call('updateTrialStatus', { id, status, note }),
};
