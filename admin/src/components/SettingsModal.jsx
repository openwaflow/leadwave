import React, { useState } from 'react';
import {
  Settings,
  Save,
  Server,
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  Zap,
  Lock
} from 'lucide-react';
import { apiConfig, api } from '../services/api';

export default function SettingsModal({ isOpen = true, onClose, onSettingsUpdated }) {
  const [apiUrl, setApiUrl] = useState(apiConfig.getApiUrl());
  const [newPin, setNewPin] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (isOpen === false) return null;

  const clientIntegrationCode = `// WAGrow Desktop App License API Integration
// Set in: reseller-config.json
{
  "app_name": "WAGrow",
  "version": "1.0.0",
  "license_api_url": "${apiUrl}"
}`;

  const handleSaveUrl = () => {
    apiConfig.setApiUrl(apiUrl);
    alert('API URL saved to browser storage successfully!');
    if (onSettingsUpdated) onSettingsUpdated();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.pingServer(apiUrl);
      if (res && res.success) {
        setTestResult({ success: true, message: 'Connected successfully to Google Apps Script cloud server!' });
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
      if (res?.success) {
        alert('Admin PIN updated successfully!');
        setNewPin('');
      } else {
        alert('Failed to update PIN: ' + (res?.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error updating PIN: ' + err.message);
    }
  };

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
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">System Settings</h3>
              <p className="text-xs text-slate-400">System API &amp; Security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: Backend Execution URL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>Cloud Backend API Execution URL</span>
              </h4>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Enter the Google Apps Script Web App Deployment URL:
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
                className="btn-primary text-xs whitespace-nowrap flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !apiUrl}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Zap className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : 'text-amber-400'}`} />
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>
              {testResult && (
                <div className={`text-xs font-semibold flex items-center gap-1.5 ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Update Admin PIN */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h4 className="font-semibold text-sm text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Change Admin PIN</span>
            </h4>
            <form onSubmit={handleUpdatePin} className="flex gap-2">
              <input
                type="password"
                maxLength="8"
                className="glass-input text-xs font-mono"
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
              <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>WAGrow Desktop App Config</span>
              </h4>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                {copiedSnippet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSnippet ? 'Copied!' : 'Copy Config'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] mono-text text-slate-300 overflow-x-auto leading-relaxed">
              {clientIntegrationCode}
            </pre>
          </div>

        </div>

      </div>
    </div>
  );
}
