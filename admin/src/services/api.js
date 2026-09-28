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

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbz1XvaCZjCbonh1bqeNycOGFwFD7rApZUMuZb3XMOsIfJtoHlVFUqJILdfOVcRlEpk/exec';

export const auth = {
  getApiUrl:  () => localStorage.getItem(STORAGE.API_URL) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GAS_API_URL) || DEFAULT_GAS_URL,
  setApiUrl:  (u) => localStorage.setItem(STORAGE.API_URL, (u || '').trim()),
  getRole:    () => sessionStorage.getItem(STORAGE.ROLE)  || localStorage.getItem(STORAGE.ROLE) || null,
  setRole:    (r) => { sessionStorage.setItem(STORAGE.ROLE, r); localStorage.setItem(STORAGE.ROLE, r); },
  getAdminPin:() => sessionStorage.getItem(STORAGE.ADMIN_PIN) || localStorage.getItem(STORAGE.ADMIN_PIN) || '',
  setAdminPin:(p) => { sessionStorage.setItem(STORAGE.ADMIN_PIN, p); localStorage.setItem(STORAGE.ADMIN_PIN, p); },
  getResellerId:  () => localStorage.getItem(STORAGE.RESELLER_ID)  || '',
  getResellerPin: () => sessionStorage.getItem(STORAGE.RESELLER_PIN) || localStorage.getItem(STORAGE.RESELLER_PIN) || '',
  setResellerAuth:(id, pin) => {
    localStorage.setItem(STORAGE.RESELLER_ID,  id);
    localStorage.setItem(STORAGE.RESELLER_PIN, pin);
    sessionStorage.setItem(STORAGE.RESELLER_PIN, pin);
  },
  isAuthenticated: () => !!auth.getRole(),
  clearAuth: () => {
    [STORAGE.ADMIN_PIN, STORAGE.RESELLER_PIN, STORAGE.ROLE].forEach(k => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
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

  if (method === 'GET') {
    const qs  = new URLSearchParams(payload).toString();
    const url = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}${qs}`;
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    return res.json();
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export const apiConfig = auth;

// ── Public
export const api = {
  ping: async (url) => {
    const target = `${url || auth.getApiUrl()}${(url || auth.getApiUrl()).includes('?') ? '&' : '?'}action=ping`;
    return (await fetch(target, { method: 'GET' })).json();
  },
  pingServer: async (url) => {
    const target = `${url || auth.getApiUrl()}${(url || auth.getApiUrl()).includes('?') ? '&' : '?'}action=ping`;
    return (await fetch(target, { method: 'GET' })).json();
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
