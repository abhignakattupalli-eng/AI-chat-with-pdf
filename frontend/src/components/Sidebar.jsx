import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  Eye, 
  MessageSquare, 
  Layers, 
  Database, 
  Sparkles, 
  Check, 
  AlertCircle,
  FileBox,
  ChevronRight,
  FolderOpen,
  X
} from 'lucide-react';

export default function Sidebar({
  documents = [],
  sessions = [],
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onUploadFiles,
  onDeleteDocument,
  onInspectChunks,
  onLoadSampleDocs,
  selectedDocId,
  onSelectDoc,
  isUploading = false,
  uploadProgress = null,
  isOpen = true,
  onCloseMobile
}) {
  const [activeTab, setActiveTab] = useState('docs'); // 'docs' or 'sessions'
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-40 md:static w-80 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out shadow-lg md:shadow-none ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Mobile close button */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-100">
        <span className="font-semibold text-sm text-slate-800">Document Management</span>
        <button onClick={onCloseMobile} className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="p-3 border-b border-slate-100">
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('docs')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'docs' 
                ? 'bg-white text-indigo-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents ({documents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'sessions' 
                ? 'bg-white text-indigo-700 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chats ({sessions.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'docs' ? (
          <>
            {/* Upload Box */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-indigo-500 bg-indigo-50/60 scale-[0.99]'
                  : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-10 h-10 mx-auto rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 shadow-xs">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800">
                Click or drag PDFs here
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Supports single or multi-document upload
              </p>
            </div>

            {/* Quick Sample Document Button */}
            <button
              onClick={onLoadSampleDocs}
              disabled={isUploading}
              className="w-full py-2 px-3 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 border border-indigo-200/70 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Load 2 Built-in Sample PDFs</span>
            </button>

            {/* Uploading Status Banner */}
            {isUploading && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2 text-indigo-800 text-xs font-medium animate-pulse">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>Processing PDF: extracting pages & generating embeddings...</span>
              </div>
            )}

            {/* Scope Filter Pill */}
            {documents.length > 0 && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Indexed Files ({documents.length})
                </span>
                <button
                  onClick={() => onSelectDoc('all')}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                    selectedDocId === 'all'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  Query All
                </button>
              </div>
            )}

            {/* Documents List */}
            <div className="space-y-2">
              {documents.length === 0 && !isUploading && (
                <div className="text-center py-8 text-slate-400">
                  <FileBox className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No documents uploaded yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Upload a PDF or click "Load Sample PDFs" to begin.</p>
                </div>
              )}

              {documents.map((doc) => {
                const isCurrent = selectedDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`group relative p-3 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onSelectDoc(doc.id)}
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-indigo-600' : 'text-slate-500'}`} />
                          <h3 className="text-xs font-semibold text-slate-800 truncate" title={doc.original_filename}>
                            {doc.original_filename}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                            {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
                          </span>
                          <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                            {doc.chunk_count} chunks
                          </span>
                          <span>{formatFileSize(doc.file_size)}</span>
                        </div>
                      </div>

                      {/* Document Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectChunks(doc);
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-white"
                          title="Inspect Chunks"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteDocument(doc.id);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-white"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Sessions Tab */
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Chat History
            </span>

            {sessions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No chat sessions yet.</p>
              </div>
            ) : (
              sessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => onSelectSession(sess.id)}
                    className={`group p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isActive
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-2xs font-medium'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="text-xs truncate">{sess.title || 'Untitled Session'}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(sess.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded-md transition-opacity"
                      title="Delete Session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Footer Info: RAG Vector Store Stats */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          <span>Vector Store: SQLite + TF-IDF/Dense</span>
        </div>
        <span className="font-semibold text-indigo-600">
          {documents.reduce((acc, d) => acc + (d.chunk_count || 0), 0)} chunks
        </span>
      </div>
    </aside>
  );
}
