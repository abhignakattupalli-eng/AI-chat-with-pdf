import React, { useState, useEffect } from 'react';
import { X, Layers, FileText, Search, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export default function ChunksModal({ doc, isOpen, onClose }) {
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen && doc?.id) {
      setLoading(true);
      api.getDocumentChunks(doc.id)
        .then(res => setChunks(res.chunks || []))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const filteredChunks = chunks.filter(c => 
    c.text.toLowerCase().includes(search.toLowerCase()) ||
    c.page_number.toString().includes(search)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 truncate max-w-sm">
                Document Chunks: {doc.original_filename}
              </h3>
              <p className="text-xs text-slate-500">
                {chunks.length} segmented chunks across {doc.page_count} pages
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

        {/* Search inside chunks */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter chunks by keyword or page number..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Chunks List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Loading chunks...</span>
            </div>
          ) : filteredChunks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No chunks match your search.
            </div>
          ) : (
            filteredChunks.map((chunk, idx) => (
              <div 
                key={chunk.chunk_id || idx}
                className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 space-y-1.5 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    Chunk #{chunk.chunk_index} · Page {chunk.page_number}
                  </span>
                  <span className="text-slate-400">{chunk.text.length} characters</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap bg-white p-2.5 rounded-xl border border-slate-100">
                  {chunk.text}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
