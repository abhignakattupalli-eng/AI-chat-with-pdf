import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Settings, 
  Plus, 
  FileText, 
  ChevronDown, 
  Layers, 
  Zap, 
  CheckCircle2, 
  Sliders
} from 'lucide-react';

export default function Navbar({
  documents = [],
  selectedDocId = 'all',
  onSelectDoc,
  onNewChat,
  onOpenSettings,
  onQuickSummarize,
  isSummarizing = false,
  status = {}
}) {
  const [showSummaryMenu, setShowSummaryMenu] = useState(false);

  const selectedDocName = selectedDocId === 'all' 
    ? 'All Documents (Cross-Doc RAG)' 
    : documents.find(d => d.id === selectedDocId)?.original_filename || 'Selected Document';

  const summaryOptions = [
    { type: 'comprehensive', label: '📑 Executive Summary', desc: 'Full overview & structure' },
    { type: 'takeaways', label: '💡 Key Takeaways', desc: 'Action items & top insights' },
    { type: 'faq', label: '❓ Top 5 FAQs', desc: 'Important questions & answers' },
    { type: 'eli5', label: '🔍 Explain Simply', desc: 'Clear & jargon-free summary' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">AI Chat With PDF</h1>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              RAG Assistant
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">
            Intelligent Document Search, Reasoning & Summaries
          </p>
        </div>
      </div>

      {/* Center: Document Scope Selector */}
      <div className="hidden lg:flex items-center gap-2 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-3 py-1.5 transition-all">
        <Layers className="w-4 h-4 text-indigo-600" />
        <span className="text-xs font-medium text-slate-500">Scope:</span>
        <select
          value={selectedDocId}
          onChange={(e) => onSelectDoc(e.target.value)}
          className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer max-w-[220px] truncate"
        >
          <option value="all">All Documents ({documents.length})</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.original_filename} (p.{doc.page_count})
            </option>
          ))}
        </select>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Summarize Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSummaryMenu(!showSummaryMenu)}
            disabled={documents.length === 0 || isSummarizing}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all border ${
              documents.length === 0
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100/90 border-purple-200/70 shadow-xs'
            }`}
            title="Generate AI summary of documents"
          >
            <Zap className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin text-purple-600' : 'text-purple-600'}`} />
            <span className="hidden sm:inline">Summarize</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {showSummaryMenu && (
            <div 
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-2"
              onMouseLeave={() => setShowSummaryMenu(false)}
            >
              <div className="px-3 py-1.5 border-b border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Document Actions</p>
                <p className="text-xs text-slate-600 truncate mt-0.5">Target: <b>{selectedDocName}</b></p>
              </div>
              {summaryOptions.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => {
                    setShowSummaryMenu(false);
                    onQuickSummarize(opt.type);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50/70 text-slate-700 transition-colors flex flex-col"
                >
                  <span className="text-xs font-semibold text-slate-800">{opt.label}</span>
                  <span className="text-[11px] text-slate-500">{opt.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200/80"
          title="Settings & LLM API Key"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
