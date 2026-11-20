import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Bot, 
  User, 
  Copy, 
  Check, 
  FileText, 
  ExternalLink, 
  Bookmark,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function ChatMessage({ message, onOpenCitation }) {
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(true);

  const isUser = message.role === 'user';
  const sources = message.sources || [];

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`py-4 px-4 sm:px-6 flex gap-3 sm:gap-4 ${isUser ? 'bg-slate-50/70' : 'bg-white'}`}>
      {/* Avatar */}
      <div className="shrink-0 pt-0.5">
        {isUser ? (
          <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-xs">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <Bot className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              {isUser ? 'You' : 'Document Assistant'}
            </span>
            {!isUser && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Grounding Active
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              {formatTime(message.created_at)}
            </span>
          </div>

          {!isUser && (
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
              title="Copy answer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Message Body */}
        <div className="text-sm text-slate-800 leading-relaxed break-words prose prose-slate prose-sm max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Source Citations Section (Requirement #8) */}
        {!isUser && sources.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-wider transition-colors"
              >
                <Bookmark className="w-3 h-3 text-indigo-500" />
                <span>Source Citations ({sources.length})</span>
                {showSources ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
              </button>
              <span className="text-[11px] text-slate-400">Click citation to inspect text</span>
            </div>

            {showSources && (
              <div className="flex flex-wrap gap-2 pt-1">
                {sources.map((src, idx) => (
                  <button
                    key={src.chunk_id || idx}
                    onClick={() => onOpenCitation(src)}
                    className="group flex items-center gap-1.5 bg-slate-50 hover:bg-indigo-50/80 border border-slate-200/90 hover:border-indigo-300 rounded-xl px-2.5 py-1.5 text-left transition-all shadow-2xs hover:shadow-xs active:scale-98"
                    title={`View excerpt from ${src.filename} (Page ${src.page_number})`}
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-500 group-hover:text-indigo-600 shrink-0" />
                    <div className="min-w-0 max-w-[190px]">
                      <div className="text-[11px] font-semibold text-slate-800 truncate">
                        {src.filename}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                        <span className="font-medium text-indigo-700 bg-indigo-50 px-1 rounded">
                          Page {src.page_number}
                        </span>
                        {src.similarity && (
                          <span className="text-slate-400">
                            {Math.round(src.similarity * 100)}% match
                          </span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
