import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Trash2, 
  Sparkles, 
  Paperclip, 
  FileText, 
  Zap, 
  CornerDownLeft,
  Loader2
} from 'lucide-react';

export default function ChatInput({
  onSendMessage,
  onClearChat,
  onQuickPrompt,
  isLoading = false,
  selectedDocName = 'All Documents',
  hasMessages = false
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea based on input length
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim() || isLoading) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const quickPrompts = [
    { label: '📑 Executive Summary', prompt: 'Provide an executive summary of this document covering key findings and core architecture.' },
    { label: '💡 Key Takeaways', prompt: 'Extract the top 5 most important takeaways, critical insights, and action items.' },
    { label: '❓ 5 Critical FAQs', prompt: 'Generate 5 essential questions and answers based strictly on the provided document content.' },
    { label: '🔍 Explain Simply', prompt: 'Explain the core concepts and methodologies of this document in clear, simple terms.' },
  ];

  return (
    <div className="border-t border-slate-200/80 bg-white/95 backdrop-blur-sm p-3 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-2.5">
        {/* Quick Action Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" /> Prompts:
          </span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => onQuickPrompt(qp.prompt)}
              disabled={isLoading}
              className="shrink-0 bg-slate-100/90 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/70 hover:border-indigo-200 px-2.5 py-1 rounded-full font-medium transition-all text-[11px]"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Input Box Card */}
        <div className="relative border border-slate-200/90 rounded-2xl bg-white shadow-xs focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          {/* Scope indicator */}
          <div className="px-3 pt-2 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-100/80 pb-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <FileText className="w-3 h-3 text-indigo-500 shrink-0" />
              <span className="truncate">Context: <strong className="text-slate-700 font-semibold">{selectedDocName}</strong></span>
            </div>

            {hasMessages && (
              <button
                onClick={onClearChat}
                className="text-slate-400 hover:text-red-600 flex items-center gap-1 text-[11px] transition-colors"
                title="Clear conversation history"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Clear Chat</span>
              </button>
            )}
          </div>

          {/* Textarea */}
          <div className="flex items-end gap-2 p-2.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your uploaded document(s)... (Press Enter to send)"
              className="flex-1 max-h-40 bg-transparent resize-none outline-none text-sm text-slate-800 placeholder-slate-400 py-1 px-1.5 leading-relaxed"
            />

            {/* Send Button */}
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || isLoading}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                text.trim() && !isLoading
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-100 hover:opacity-95 active:scale-95'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              title="Send Message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="text-[11px] text-center text-slate-400">
          Powered by RAG • Answers are grounded directly in your PDF documents with page citations.
        </div>
      </div>
    </div>
  );
}
