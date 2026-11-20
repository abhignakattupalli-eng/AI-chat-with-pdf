import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import EmptyState from './components/EmptyState';
import SettingsModal from './components/SettingsModal';
import ChunksModal from './components/ChunksModal';
import CitationModal from './components/CitationModal';
import { api } from './services/api';
import { Menu, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('all');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inspectDoc, setInspectDoc] = useState(null);
  const [activeCitation, setActiveCitation] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const messagesEndRef = useRef(null);

  // Show auto-dismissing toast
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial Data Load
  useEffect(() => {
    loadDocuments();
    loadSessions();
  }, []);

  const loadDocuments = async () => {
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await api.getSessions();
      const sessList = res.sessions || [];
      setSessions(sessList);

      if (sessList.length > 0) {
        // Load the most recent session
        selectSession(sessList[0].id);
      } else {
        // Create an initial default session
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const selectSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    try {
      const res = await api.getSessionDetails(sessionId);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to load session details:', err);
    }
  };

  const handleNewChat = async () => {
    try {
      const newSess = await api.createSession('New Chat Session');
      setSessions(prev => [newSess, ...prev]);
      setActiveSessionId(newSess.id);
      setMessages([]);
      showToast('Created new chat session', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await api.deleteSession(sessionId);
      const remaining = sessions.filter(s => s.id !== sessionId);
      setSessions(remaining);
      if (activeSessionId === sessionId) {
        if (remaining.length > 0) {
          selectSession(remaining[0].id);
        } else {
          handleNewChat();
        }
      }
      showToast('Session deleted', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleClearChat = async () => {
    if (!activeSessionId) return;
    try {
      await api.clearSessionMessages(activeSessionId);
      setMessages([]);
      showToast('Chat history cleared', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Upload PDFs
  const handleUploadFiles = async (files) => {
    setIsUploading(true);
    try {
      const res = await api.uploadDocuments(files);
      showToast(res.message, 'success');
      await loadDocuments();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Load Built-in Sample PDFs
  const handleLoadSamples = async () => {
    setIsUploading(true);
    try {
      const res = await api.loadSampleDocuments();
      showToast(res.message, 'success');
      await loadDocuments();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete PDF
  const handleDeleteDocument = async (docId) => {
    try {
      await api.deleteDocument(docId);
      showToast('Document deleted and chunks purged.', 'info');
      if (selectedDocId === docId) {
        setSelectedDocId('all');
      }
      await loadDocuments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Send Chat Message
  const handleSendMessage = async (queryText) => {
    if (!queryText.trim() || isLoading) return;

    if (!activeSessionId) {
      await handleNewChat();
    }

    const currentSessId = activeSessionId;

    // Optimistically append user message to UI
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: queryText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await api.sendMessage({
        sessionId: currentSessId,
        message: queryText,
        docId: selectedDocId,
      });

      // Append assistant answer
      setMessages(prev => [...prev, res.message]);
      // Refresh session title in list
      api.getSessions().then(r => setSessions(r.sessions || []));
    } catch (err) {
      showToast(err.message || 'Error communicating with assistant', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Document Summarize
  const handleQuickSummarize = async (summaryType) => {
    setIsSummarizing(true);
    const targetDoc = selectedDocId === 'all' 
      ? 'All Documents' 
      : documents.find(d => d.id === selectedDocId)?.original_filename || 'Document';

    showToast(`Generating ${summaryType} summary for ${targetDoc}...`, 'info');

    try {
      const res = await api.summarize({
        docId: selectedDocId,
        summaryType,
      });

      // Insert summary into chat as an assistant response
      const assistantMsg = {
        id: `summary-${Date.now()}`,
        role: 'assistant',
        content: res.summary,
        sources: res.sources || [],
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      showToast('Summary generated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to summarize', 'error');
    } finally {
      setIsSummarizing(false);
    }
  };

  const selectedDocName = selectedDocId === 'all'
    ? 'All Documents (Cross-Doc RAG)'
    : documents.find(d => d.id === selectedDocId)?.original_filename || 'Selected Document';

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-2 border ${
          toast.type === 'error' 
            ? 'bg-red-50 text-red-800 border-red-200' 
            : toast.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
        }`}>
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar Panel */}
      <Sidebar
        documents={documents}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onDeleteSession={handleDeleteSession}
        onUploadFiles={handleUploadFiles}
        onDeleteDocument={handleDeleteDocument}
        onInspectChunks={(doc) => setInspectDoc(doc)}
        onLoadSampleDocs={handleLoadSamples}
        selectedDocId={selectedDocId}
        onSelectDoc={setSelectedDocId}
        isUploading={isUploading}
        isOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Navbar */}
        <Navbar
          documents={documents}
          selectedDocId={selectedDocId}
          onSelectDoc={setSelectedDocId}
          onNewChat={handleNewChat}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onQuickSummarize={handleQuickSummarize}
          isSummarizing={isSummarizing}
        />

        {/* Mobile menu trigger */}
        <div className="md:hidden bg-white border-b border-slate-100 px-4 py-2 flex items-center justify-between text-xs font-semibold text-slate-700">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            <Menu className="w-4 h-4" />
            <span>Manage Files & Chats</span>
          </button>
          <span className="truncate max-w-[180px] text-indigo-600">{selectedDocName}</span>
        </div>

        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState
              documents={documents}
              onSelectPrompt={handleSendMessage}
              onLoadSamples={handleLoadSamples}
              selectedDocName={selectedDocName}
            />
          ) : (
            <div className="max-w-4xl mx-auto divide-y divide-slate-100">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onOpenCitation={(citation) => setActiveCitation(citation)}
                />
              ))}

              {/* Generating / Thinking indicator */}
              {isLoading && (
                <div className="py-4 px-4 sm:px-6 flex gap-3 sm:gap-4 bg-white items-center">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center animate-pulse">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                    <span>Searching vector database & synthesizing answer...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          onQuickPrompt={handleSendMessage}
          isLoading={isLoading}
          selectedDocName={selectedDocName}
          hasMessages={messages.length > 0}
        />
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => showToast('Settings saved successfully', 'success')}
      />

      <ChunksModal
        doc={inspectDoc}
        isOpen={!!inspectDoc}
        onClose={() => setInspectDoc(null)}
      />

      <CitationModal
        citation={activeCitation}
        isOpen={!!activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
}
