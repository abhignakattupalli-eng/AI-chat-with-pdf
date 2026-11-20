import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Cpu, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Database, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';

export default function SettingsModal({ isOpen, onClose, onSaved }) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.0-flash');
  const [topK, setTopK] = useState(4);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem('gemini_api_key') || '');
      setModel(localStorage.getItem('gemini_model') || 'gemini-2.0-flash');
      setTopK(parseInt(localStorage.getItem('retrieval_top_k') || '4', 10));
      setTestResult(null);

      // Fetch system status
      api.getStatus()
        .then(res => setStatus(res))
        .catch(err => console.error('Status fetch error:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    localStorage.setItem('gemini_model', model);
    localStorage.setItem('retrieval_top_k', topK.toString());
    if (onSaved) onSaved();
    onClose();
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ valid: false, error: 'Please enter a Gemini API Key first.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testApiKey(apiKey.trim());
      setTestResult(res);
    } catch (err) {
      setTestResult({ valid: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Application Settings</h3>
              <p className="text-xs text-slate-500">Configure LLM Provider & RAG Parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                <span>Google Gemini API Key</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono"
              />
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testing}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Stored locally in your browser. Leave blank to run in zero-config offline RAG mode.
            </p>

            {/* Test Key Feedback */}
            {testResult && (
              <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 mt-2 ${
                testResult.valid ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {testResult.valid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{testResult.message}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="truncate">{testResult.error || 'Failed to verify key.'}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>Gemini Foundation Model</span>
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium cursor-pointer"
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended — Fastest & High Quality)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Lightweight & High Speed)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Complex Deep Reasoning)</option>
            </select>
          </div>

          {/* Top-K Retrieval Chunks */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>RAG Retrieval Top-K Chunks</span>
              </label>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {topK} Chunks
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="8"
              step="1"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>2 (Focused)</span>
              <span>4 (Balanced)</span>
              <span>8 (Comprehensive)</span>
            </div>
          </div>

          {/* Status info box */}
          {status && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>Vector Database & System Health</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                <div>Total Documents: <b>{status.documents_count}</b></div>
                <div>Vector Chunks: <b>{status.total_chunks}</b></div>
                <div>Default Model: <b>{status.default_model}</b></div>
                <div>Env Key Active: <b>{status.has_env_gemini_key ? 'Yes' : 'No'}</b></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all active:scale-95"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
