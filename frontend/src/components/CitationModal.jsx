import React from 'react';
import { X, FileText, Bookmark, ExternalLink, Percent, Layers } from 'lucide-react';

export default function CitationModal({ citation, isOpen, onClose }) {
  if (!isOpen || !citation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Grounding Source Citation
              </h3>
              <p className="text-sm font-bold text-slate-900 truncate max-w-xs">
                {citation.filename}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metadata badges */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-xl">
            📄 Page {citation.page_number}
          </span>
          {citation.similarity && (
            <span className="font-semibold text-purple-700 bg-purple-50 border border-purple-200/60 px-2.5 py-1 rounded-xl">
              🎯 Relevance: {Math.round(citation.similarity * 100)}% Match
            </span>
          )}
          {citation.chunk_id && (
            <span className="text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl font-mono text-[11px]">
              ID: {citation.chunk_id}
            </span>
          )}
        </div>

        {/* Verbatim Content */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Verbatim Text Extracted from PDF Page:
          </label>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap select-text">
            {citation.full_text || citation.snippet}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Retrieved via Vector Cosine Similarity</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
