'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDb } from '@/providers/DbContext';
import {
  Brain,
  Send,
  Plus,
  Search,
  Paperclip,
  TrendingUp,
  AlertOctagon,
  ShieldCheck,
  CheckCircle,
  FileText,
  Clock,
  Sparkles,
  HelpCircle,
  RefreshCw,
  User,
  Lightbulb,
  Building,
  Target,
  X,
  File as FileIcon,
  Trash2,
  MessageSquare,
  StopCircle,
  ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  fileName?: string;
}

export default function AIAssistantWorkspace() {
  const { getHeaders } = useDb();

  const [inputMsg, setInputMsg] = useState('');
  const [chatFeed, setChatFeed] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  const feedEndRef = useRef<HTMLDivElement>(null);

  // History states
  const [historySearch, setHistorySearch] = useState('');
  const [historyItems, setHistoryItems] = useState<{sessionId: string, title: string, timestamp: number}[]>([]);
  const [sessionId, setSessionId] = useState<string>('default');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  // Files
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [inputMsg]);

  useEffect(() => {
    loadHistoryList();
    if (!sessionId || sessionId === 'default') {
      const newSession = 'session-' + Date.now();
      setSessionId(newSession);
      loadConversation(newSession);
    }
  }, []);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatFeed]);

  const loadHistoryList = () => {
    try {
      const saved = localStorage.getItem('sidata_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        const list = Object.keys(parsed).map(key => ({
          sessionId: key,
          title: parsed[key].title || 'Percakapan Baru',
          timestamp: parsed[key].timestamp || 0
        })).sort((a, b) => b.timestamp - a.timestamp);
        setHistoryItems(list);
      } else {
        setHistoryItems([]);
      }
    } catch (e) {
      console.error(e);
      setHistoryItems([]);
    }
  };

  const loadConversation = (id: string) => {
    setSessionId(id);
    try {
      const saved = localStorage.getItem('sidata_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[id] && parsed[id].messages) {
          setChatFeed(parsed[id].messages);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    
    setChatFeed([{
      id: 'welcome',
      sender: 'assistant',
      text: 'Halo! Saya Asisten AI SIDATA. Silakan lampirkan dokumen (PDF/Excel) atau ketik pertanyaan Anda untuk mulai menganalisis.'
    }]);
  };

  const saveConversation = (id: string, msgs: ChatMessage[], firstQuery: string) => {
    try {
      const saved = localStorage.getItem('sidata_chat_history');
      let parsed: any = saved ? JSON.parse(saved) : {};
      
      let title = parsed[id]?.title || 'Percakapan Baru';
      if (title === 'Percakapan Baru' && firstQuery) {
        title = firstQuery.substring(0, 30) + (firstQuery.length > 30 ? '...' : '');
      }

      parsed[id] = {
        title,
        timestamp: parsed[id]?.timestamp || Date.now(),
        messages: msgs
      };
      localStorage.setItem('sidata_chat_history', JSON.stringify(parsed));
      loadHistoryList();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSession = () => {
    if (!sessionToDelete) return;
    try {
      const saved = localStorage.getItem('sidata_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        delete parsed[sessionToDelete];
        localStorage.setItem('sidata_chat_history', JSON.stringify(parsed));
        
        // Memastikan state lokal segera di-update agar tombolnya benar-benar hilang dari UI
        setHistoryItems(prev => prev.filter(h => h.sessionId !== sessionToDelete));
        
        if (sessionToDelete === sessionId) {
          handleNewConversation();
        }
      }
    } catch (e) {}
    setSessionToDelete(null);
  };

  const handleNewConversation = () => {
    const newSession = 'session-' + Date.now();
    setSessionId(newSession);
    setSelectedFile(null);
    setInputMsg('');
    setChatFeed([{
      id: 'welcome',
      sender: 'assistant',
      text: 'Halo! Saya Asisten AI SIDATA. Silakan lampirkan dokumen (PDF/Excel) atau ketik pertanyaan Anda untuk mulai menganalisis.'
    }]);
  };

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() && !selectedFile) return;

    const fileToSend = selectedFile;
    const textToSend = queryText;
    
    setInputMsg('');
    setSelectedFile(null);
    
    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: textToSend,
      fileName: fileToSend?.name
    };

    const newFeed = [...chatFeed, userMsg];
    setChatFeed(newFeed);
    
    const firstQuery = chatFeed.length <= 1 ? textToSend || (fileToSend ? 'Analisis Dokumen' : '') : '';
    saveConversation(sessionId, newFeed, firstQuery);

    setLoading(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const formData = new FormData();
      formData.append('message', textToSend);
      formData.append('sessionId', sessionId);
      
      const historyContext = newFeed.slice(1, -1).map(m => ({
        role: m.sender,
        content: m.text
      }));
      formData.append('history', JSON.stringify(historyContext));

      if (fileToSend) {
        formData.append('file', fileToSend);
      }

      const headers = getHeaders();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: headers,
        body: formData,
        signal: controller.signal
      });

      const data = await res.json();
      
      const assistantMsg: ChatMessage = {
        id: 'assistant-' + Date.now(),
        sender: 'assistant',
        text: data.success ? (data.data || data.response) : 'Terjadi kesalahan: ' + (data.message || data.error)
      };

      const updatedFeed = [...newFeed, assistantMsg];
      setChatFeed(updatedFeed);
      saveConversation(sessionId, updatedFeed, firstQuery);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        const errorMsg: ChatMessage = {
          id: 'error-' + Date.now(),
          sender: 'assistant',
          text: 'Gagal menghubungi asisten AI: ' + e.message
        };
        setChatFeed(prev => [...prev, errorMsg]);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
      const abortedMsg: ChatMessage = {
        id: 'aborted-' + Date.now(),
        sender: 'assistant',
        text: '⚠️ Pembuatan teks dihentikan oleh pengguna.'
      };
      setChatFeed(prev => {
        const newFeed = [...prev, abortedMsg];
        saveConversation(sessionId, newFeed, '');
        return newFeed;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading) {
        handleSendQuery(inputMsg);
      }
    }
  };

  const filteredHistory = historyItems.filter(h => h.title.toLowerCase().includes(historySearch.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200 flex flex-col h-[calc(100vh-140px)]">
      
      {/* Page Title */}
      <div className="shrink-0">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Asisten Analitik AI</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
          Ajukan pertanyaan analitis menggunakan bahasa alami dan lampirkan dokumen (PDF/Excel) untuk dianalisis oleh AI.
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 text-red-500 mb-4"><AlertOctagon className="h-6 w-6 shrink-0" /><h3 className="text-lg font-bold">Hapus Riwayat</h3></div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Apakah Anda yakin ingin menghapus percakapan ini? Data riwayat tidak dapat dikembalikan.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setSessionToDelete(null)} className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-200">Batal</button>
              <button onClick={handleDeleteSession} className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-lg cursor-pointer hover:bg-red-700">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* SIDEBAR HISTORY */}
        <div className="lg:col-span-1 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 flex flex-col shadow-xs overflow-hidden">
          <button onClick={handleNewConversation} className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 transition-colors text-white py-2 text-xs font-bold mb-4 cursor-pointer">
            <Plus className="h-4 w-4" /> Percakapan Baru
          </button>
          <div className="relative mb-3.5 shrink-0"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input type="text" placeholder="Cari riwayat..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="w-full rounded-lg border bg-slate-50 dark:bg-slate-900 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]" /></div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {filteredHistory.map((item, index) => (
              <div key={item.sessionId || `history-${index}`} className="group relative flex items-center">
                <button onClick={() => loadConversation(item.sessionId)} className={`flex-1 text-left p-2.5 rounded-lg border border-transparent truncate transition-all text-xs flex items-center gap-2 pr-8 ${item.sessionId === sessionId ? 'bg-blue-50 text-[#1D4ED8] font-bold' : 'hover:bg-slate-50 cursor-pointer'}`}>
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" /> <span className="truncate">{item.title}</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setSessionToDelete(item.sessionId); }} className="absolute right-1.5 p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* CHAT AREA */}
        <div className="lg:col-span-4 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-xs flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F8FAFC]/50 dark:bg-[#0B0F19]/25">
            {chatFeed.map((msg, index) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id || `chat-${index}`} className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isUser ? 'bg-blue-500/10 text-[#1D4ED8]' : 'bg-[#1D4ED8] text-white'}`}>{isUser ? <User className="h-4 w-4"/> : <Sparkles className="h-4 w-4 fill-white"/>}</div>
                  <div className={`rounded-xl p-4 text-xs leading-relaxed border ${isUser ? 'bg-[#1D4ED8] text-white border-blue-600' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-xs'}`}>
                    {msg.fileName && (<div className="flex items-center gap-1.5 bg-black/10 px-2 py-1 rounded text-[11px] mb-2 font-semibold"><FileText className="h-3.5 w-3.5"/><span>{msg.fileName}</span></div>)}
                    
                    {isUser ? (
                      <p className="whitespace-pre-line">{msg.text}</p>
                    ) : (
                      <div className="markdown-body">
                        <ReactMarkdown 
                          components={{
                            strong: ({node, ...props}: any) => <span className="font-extrabold text-slate-900 dark:text-white" {...props} />,
                            ul: ({node, ...props}: any) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                            ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                            li: ({node, ...props}: any) => <li className="mb-1" {...props} />,
                            p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
                            h1: ({node, ...props}: any) => <h1 className="text-lg font-bold mt-3 mb-2" {...props} />,
                            h2: ({node, ...props}: any) => <h2 className="text-base font-bold mt-2 mb-1" {...props} />,
                            h3: ({node, ...props}: any) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {loading && (<div className="flex gap-3 mr-auto"><div className="h-8 w-8 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center animate-pulse"><Sparkles className="h-4 w-4"/></div><div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin text-slate-400"/><span className="text-xs text-slate-400">Sedang menganalisis dokumen dan menghasilkan respons...</span></div></div>)}
            <div ref={feedEndRef} />
          </div>

          {/* INPUT AREA */}
          <div className="p-3 border-t border-slate-150 dark:border-slate-800 bg-white dark:bg-[#111827] shrink-0">
            {selectedFile && (<div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 text-[#1D4ED8] dark:text-blue-300 px-3 py-1.5 rounded-lg mb-2 text-xs w-fit max-w-full"><div className="flex items-center gap-2 truncate"><FileIcon className="h-3.5 w-3.5 shrink-0"/><span className="truncate">{selectedFile.name}</span></div><button onClick={() => setSelectedFile(null)} className="text-red-500 hover:bg-red-50 p-1 rounded-full ml-3 shrink-0"><X className="h-4 w-4"/></button></div>)}
            <div className="flex items-end gap-2">
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.xlsx,.xls,.csv,image/*,.docx,.txt" onChange={(e) => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }} />
              <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-slate-600 border dark:border-slate-800 rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-900 transition-colors" title="Lampirkan File"><Paperclip className="h-4 w-4"/></button>
              <textarea ref={textareaRef} rows={1} value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} onKeyDown={handleKeyDown} placeholder="Tanyakan analisis dokumen... (Shift+Enter untuk baris baru)" className="flex-1 max-h-32 rounded-lg border dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] overflow-y-auto" style={{ resize: 'none' }} />
              {loading ? (
                <button onClick={handleStopGeneration} className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-lg cursor-pointer shadow-md transition-colors" title="Hentikan Response"><StopCircle className="h-4.5 w-4.5"/></button>
              ) : (
                <button onClick={() => handleSendQuery(inputMsg)} disabled={!inputMsg.trim() && !selectedFile} className="bg-[#1D4ED8] hover:bg-blue-700 text-white p-2.5 rounded-lg disabled:opacity-50 cursor-pointer shadow-md transition-colors" title="Kirim Pesan"><Send className="h-4.5 w-4.5"/></button>
              )}
            </div>
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-2.5 font-medium">
              Asisten AI SIDATA dapat membuat kesalahan. Harap periksa kembali informasi yang dihasilkan.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
