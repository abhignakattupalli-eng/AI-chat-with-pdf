const BASE_URL = '/api';

function getHeaders(apiKey = null) {
  const headers = {};
  const storedKey = apiKey || localStorage.getItem('gemini_api_key');
  if (storedKey) {
    headers['x-gemini-key'] = storedKey;
  }
  return headers;
}

export const api = {
  // --- Documents ---
  async getDocuments() {
    const res = await fetch(`${BASE_URL}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async uploadDocuments(files, apiKey = null) {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    const headers = getHeaders(apiKey);
    const res = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async deleteDocument(docId) {
    const res = await fetch(`${BASE_URL}/documents/${docId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  async getDocumentChunks(docId) {
    const res = await fetch(`${BASE_URL}/documents/${docId}/chunks`);
    if (!res.ok) throw new Error('Failed to fetch chunks');
    return res.json();
  },

  async loadSampleDocuments(apiKey = null) {
    const headers = getHeaders(apiKey);
    const res = await fetch(`${BASE_URL}/documents/load-samples`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) throw new Error('Failed to load sample documents');
    return res.json();
  },

  // --- Sessions & Chat ---
  async getSessions() {
    const res = await fetch(`${BASE_URL}/sessions`);
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  async createSession(title = 'New Chat Session') {
    const res = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  },

  async getSessionDetails(sessionId) {
    const res = await fetch(`${BASE_URL}/sessions/${sessionId}`);
    if (!res.ok) throw new Error('Failed to fetch session details');
    return res.json();
  },

  async deleteSession(sessionId) {
    const res = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete session');
    return res.json();
  },

  async clearSessionMessages(sessionId) {
    const res = await fetch(`${BASE_URL}/sessions/${sessionId}/messages`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear messages');
    return res.json();
  },

  async sendMessage({ sessionId, message, docId = 'all', topK = 4, apiKey = null, model = 'gemini-2.0-flash' }) {
    const effectiveKey = apiKey || localStorage.getItem('gemini_api_key') || null;
    const effectiveModel = model || localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
    const effectiveTopK = topK || parseInt(localStorage.getItem('retrieval_top_k') || '4', 10);

    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders(effectiveKey),
      },
      body: JSON.stringify({
        session_id: sessionId,
        message,
        doc_id: docId,
        top_k: effectiveTopK,
        api_key: effectiveKey,
        model: effectiveModel,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Chat request failed');
    }
    return res.json();
  },

  async summarize({ docId = 'all', summaryType = 'comprehensive', apiKey = null, model = 'gemini-2.0-flash' }) {
    const effectiveKey = apiKey || localStorage.getItem('gemini_api_key') || null;
    const effectiveModel = model || localStorage.getItem('gemini_model') || 'gemini-2.0-flash';

    const res = await fetch(`${BASE_URL}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders(effectiveKey),
      },
      body: JSON.stringify({
        doc_id: docId,
        summary_type: summaryType,
        api_key: effectiveKey,
        model: effectiveModel,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Summarization failed');
    }
    return res.json();
  },

  // --- Status & Key Testing ---
  async getStatus() {
    const res = await fetch(`${BASE_URL}/status`);
    if (!res.ok) throw new Error('Failed to fetch status');
    return res.json();
  },

  async testApiKey(apiKey) {
    const res = await fetch(`${BASE_URL}/test-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Key test failed');
    }
    return res.json();
  },
};
