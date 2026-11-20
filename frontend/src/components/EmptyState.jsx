import React from 'react';
import { 
  Bot, 
  Sparkles, 
  FileText, 
  Search, 
  FileCheck, 
  Zap, 
  ShieldCheck, 
  BookmarkCheck,
  ArrowRight
} from 'lucide-react';

export default function EmptyState({
  documents = [],
  onSelectPrompt,
  onLoadSamples,
  selectedDocName
}) {
  const samplePrompts = [
    {
      title: 'Compare RAG vs Traditional Fine-Tuning',
      desc: 'Retrieve core differences in cost, hallucination rates, and knowledge freshness.',
      icon: Search,
      query: 'What are the main advantages of RAG over model fine-tuning according to the document?'
    },
    {
      title: 'Vector Embeddings & Optimal Chunks',
      desc: 'Inspect mathematical cosine similarity formula and recommended character boundaries.',
      icon: Sparkles,
      query: 'What is the recommended chunk size, overlap, and similarity metric described in the report?'
    },
    {
      title: 'Executive Summary & Findings',
      desc: 'Synthesize high-level takeaways and core architectural principles.',
      icon: FileText,
      query: 'Provide an executive summary of the uploaded document with key takeaways.'
    },
    {
      title: 'Governance & Privacy Safeguards',
      desc: 'Review ethical guidelines, PII protections, and audit recommendations.',
      icon: ShieldCheck,
      query: 'What governance, safety, and data privacy safeguards are recommended?'
    }
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12 px-4 text-center">
      {/* Hero Icon */}
      <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100 mb-6">
        <Bot className="w-8 h-8" />
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
        Intelligent Document Assistant
      </h2>
      <p className="mt-2.5 text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
        Upload your PDF documents and ask questions in natural language. Every answer is grounded with exact document citations and page numbers.
      </p>

      {/* Document status bar */}
      <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50/80 border border-indigo-200/60 text-xs font-medium text-indigo-800">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Target: <b>{selectedDocName}</b></span>
        <span className="text-indigo-300">•</span>
        <span>{documents.length} Document{documents.length === 1 ? '' : 's'} Indexed</span>
      </div>

      {/* If no documents are uploaded yet, show quick sample button */}
      {documents.length === 0 && (
        <div className="mt-8 p-6 bg-white border border-slate-200 rounded-3xl shadow-xs max-w-md mx-auto">
          <p className="text-sm font-semibold text-slate-800 mb-1">Get started instantly</p>
          <p className="text-xs text-slate-500 mb-4">
            Upload your own PDF via the sidebar or load our built-in sample technical reports.
          </p>
          <button
            onClick={onLoadSamples}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 transition-all active:scale-98"
          >
            <Sparkles className="w-4 h-4" />
            <span>Load 2 Sample Technical PDFs (1-Click)</span>
          </button>
        </div>
      )}

      {/* Suggested Starter Prompts */}
      <div className="mt-10 text-left">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Suggested Inquiries
          </span>
          <span className="text-xs text-slate-400">Click to run immediately</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {samplePrompts.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onSelectPrompt(item.query)}
                className="group p-4 bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 rounded-2xl text-left transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 mb-1.5">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Ask this</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
