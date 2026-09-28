import React, { useState } from 'react';
import { apiConfig, api } from '../services/api';

export default function SettingsModal({ isOpen, onClose, onSettingsUpdated }) {
  const [apiUrl, setApiUrl] = useState(apiConfig.getApiUrl());
  const [newPin, setNewPin] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!isOpen) return null;

  const handleSaveUrl = () => {
    apiConfig.setApiUrl(apiUrl);
    alert('API URL saved to browser storage!');
    onSettingsUpdated();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.pingServer(apiUrl);
      if (res && res.success) {
        setTestResult({ success: true, message: 'Connected successfully to Cloud Server!' });
      } else {
        setTestResult({ success: false, message: 'Response received but test failed.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Connection failed: ' + err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleUpdatePin = async (e) => {
    e.preventDefault();
    if (!newPin || newPin.length < 4) {
      alert('PIN must be at least 4 digits');
      return;
    }
    try {
      const res = await api.updatePin(newPin);
      if (res.success) {
        alert('Admin PIN updated successfully!');
        setNewPin('');
      } else {
        alert('Failed to update PIN: ' + res.error);
      }
    } catch (err) {
      alert('Error updating PIN: ' + err.message);
    }
  };

  const clientIntegrationCode = `// In WAGrow Desktop App (reseller-config.json or env):
GAS_API_URL="${apiUrl || ''}"`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(clientIntegrationCode);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content max-w-xl">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">System Settings</h3>
              <p className="text-xs text-slate-400">System API & Security</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: Backend Execution URL */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-white flex items-center gap-2">
              <span>Cloud Backend API Execution URL</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                Cloud Server
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Enter your backend execution URL below:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                className="glass-input text-xs mono-text"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSaveUrl}
                className="btn-primary text-xs whitespace-nowrap"
              >
                Save URL
              </button>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !apiUrl}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                {testing ? 'Testing...' : '⚡ Test Connection'}
              </button>
              {testResult && (
                <span className={`text-xs font-semibold ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {testResult.message}
                </span>
              )}
            </div>
          </div>

          {/* Section 2: Update Admin PIN */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h4 className="font-semibold text-sm text-white">Change Admin PIN</h4>
            <form onSubmit={handleUpdatePin} className="flex gap-2">
              <input
                type="password"
                maxLength="8"
                className="glass-input text-xs"
                placeholder="Enter new 4-8 digit PIN"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
              />
              <button type="submit" className="btn-secondary text-xs whitespace-nowrap">
                Update PIN
              </button>
            </form>
          </div>

          {/* Section 3: Desktop App Integration */}
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-white">WAGrow Desktop App Link</h4>
              <button onClick={handleCopySnippet} className="text-xs text-cyan-400 hover:underline">
                {copiedSnippet ? 'Copied! ✓' : 'Copy Env'}
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] mono-text text-slate-300 overflow-x-auto">
              {clientIntegrationCode}
            </pre>
          </div>

        </div>

      </div>
    </div>
  );
}
