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
  File as FileIcon
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

export default function AIAssistantWorkspace() {
  const { getHeaders } = useDb();

  const [inputMsg, setInputMsg] = useState('');
  const [chatFeed, setChatFeed] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Halo! Saya Asisten AI SIDATA, pendamping cerdas Anda untuk pengawasan internal. Silakan tanyakan hal-hal terkait data pemantauan temuan BPK, penyelesaian TLHP, manajemen risiko, atau regulasi pengawasan di lingkungan Kementerian Keuangan.'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const messageCounter = useRef(0);

  // Conversation history states
  const [historySearch, setHistorySearch] = useState('');
  const [historyItems, setHistoryItems] = useState<{id: string, title: string, prompt: string}[]>([]);

  // Attached file state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Insight KPIs
  const [kpis, setKpis] = useState({
    totalRec: '5.612',
    outstandingRec: '2.245',
    activeTlhp: '1.683',
    completionRate: '92.4%',
    highRiskUnits: '5 Unit',
    overdueCases: '562 Kasus'
  });

  const suggestedPrompts = [
    'Unit mana yang memiliki temuan berulang?',
    'Apa rekomendasi yang belum selesai?',
    'Ringkas monitoring bulan ini.',
    'Tampilkan tren penyelesaian TLHP.',
    'Unit mana yang memiliki risiko tertinggi?',
    'Buat executive summary.',
    'Apa penyebab utama keterlambatan TLHP?'
  ];

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatFeed]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile(file);
    e.target.value = '';
  };

  // Handle submit query
  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() && !attachedFile) return;

    // 1. Add user message
    messageCounter.current += 1;
    const userMsgId = 'user-' + messageCounter.current;
    
    // Append file name visually in chat if file attached
    let displayMsg = queryText;
    if (attachedFile) {
       displayMsg += (displayMsg ? '\n\n' : '') + `📎 [File dilampirkan: ${attachedFile.name}]`;
    }

    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: displayMsg || 'Tolong analisis file ini.'
    };

    setChatFeed(prev => [...prev, userMsg]);
    setInputMsg('');
    const fileToSend = attachedFile; // Store reference to current file
    setAttachedFile(null); // Clear attachment UI immediately
    setLoading(true);

    try {
      const headers = getHeaders();
      const formData = new FormData();
      formData.append('message', queryText || 'Tolong analisis file ini.');
      if (fileToSend) {
        formData.append('file', fileToSend);
      }

      // Convert custom headers to headers object (omit Content-Type for FormData, browser sets it)
      const fetchHeaders: Record<string, string> = { ...headers };

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: fetchHeaders,
        body: formData
      });

      const data = await res.json();
      messageCounter.current += 1;
      const botMsg: ChatMessage = {
        id: 'bot-' + messageCounter.current,
        sender: 'assistant',
        text: data.success ? (data.data || data.response) : `Terjadi kesalahan: ${data.message || data.error}`
      };

      setChatFeed(prev => [...prev, botMsg]);
    } catch (e: any) {
      messageCounter.current += 1;
      const errorMsg: ChatMessage = {
        id: 'err-' + messageCounter.current,
        sender: 'assistant',
        text: `Gagal mengirim permintaan ke asisten: ${e.message || 'Unknown network error.'}`
      };
      setChatFeed(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    setChatFeed([
      {
        id: 'welcome',
        sender: 'assistant',
        text: 'Halo! Saya Asisten AI SIDATA, pendamping cerdas Anda untuk pengawasan internal. Silakan tanyakan hal-hal terkait data pemantauan temuan BPK, penyelesaian TLHP, manajemen risiko, atau regulasi pengawasan di lingkungan Kementerian Keuangan.'
      }
    ]);
  };

  // Filter conversation history
  const filteredHistory = historyItems.filter(item =>
    item.title.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-4 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Page Title Dashboard Row */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-850 pb-3 shrink-0">
        <div>
          <span className="text-[9px] uppercase font-extrabold tracking-widest text-[#1D4ED8] bg-blue-500/10 px-2 py-0.5 rounded">
            Enterprise Intelligence Workspace
          </span>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1">Asisten AI SIDATA</h1>
        </div>
      </div>

      {/* Main 3-Column Workspace Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-4">
        
        {/* LEFT COLUMN: Conversation History */}
        <div className="lg:col-span-1 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 flex flex-col min-h-0 shadow-xs">
          
          {/* New Chat Button */}
          <button
            onClick={handleNewConversation}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white py-2 text-xs font-bold transition-all shadow-xs cursor-pointer mb-4 shrink-0"
          >
            <Plus className="h-4 w-4" /> Percakapan Baru
          </button>

          {/* Search bar */}
          <div className="relative font-semibold text-xs mb-3.5 shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari riwayat..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
            />
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 font-bold text-xs">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2 px-2">Riwayat Percakapan</span>
            {filteredHistory.length === 0 ? (
              <div className="text-[11px] text-slate-405 italic p-3 text-center">Tidak ada riwayat.</div>
            ) : (
              filteredHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSendQuery(item.prompt)}
                  className="w-full text-left p-2.5 rounded-lg border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-650 dark:text-slate-350 truncate hover:text-[#1D4ED8] dark:hover:text-white transition-all cursor-pointer block"
                  title={item.title}
                >
                  {item.title}
                </button>
              ))
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Interactive Chat Area */}
        <div className="lg:col-span-4 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-xs flex flex-col min-h-0 overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#1D4ED8]" />
              <div>
                <span className="text-xs font-black text-slate-850 dark:text-white block">Asisten AI SIDATA</span>
                <span className="text-[9.5px] text-slate-450 dark:text-slate-400 block mt-0.5">Asisten cerdas untuk analisis data pengawasan dan rekomendasi BPK.</span>
              </div>
            </div>
          </div>

          {/* Messages Viewport */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F8FAFC]/30 dark:bg-[#0B0F19]/10">
            {chatFeed.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  {/* Avatar */}
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isUser 
                      ? 'bg-blue-500/10 text-[#1D4ED8] border border-blue-500/10'
                      : 'bg-[#1D4ED8] text-white shadow-sm'
                  }`}>
                    {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 fill-white" />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`rounded-xl p-3.5 text-xs leading-relaxed space-y-2 border ${
                    isUser
                      ? 'bg-[#1D4ED8] text-white border-blue-600'
                      : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-xs'
                  }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 mr-auto">
                <div className="h-8 w-8 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center font-bold text-xs shrink-0 animate-pulse">
                  <Sparkles className="h-4 w-4 fill-white" />
                </div>
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                  <span className="text-xs text-slate-450 italic">Asisten sedang menganalisis data...</span>
                </div>
              </div>
            )}
            <div ref={feedEndRef} />
          </div>


          {/* Chat input bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery(inputMsg);
            }}
            className="p-4 border-t border-slate-150 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col shrink-0"
          >
            {attachedFile && (
              <div className="mb-3 flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-[#1D4ED8] dark:text-blue-300 p-2 rounded-lg border border-blue-200 dark:border-blue-800/50 w-fit">
                <FileIcon className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold truncate max-w-[200px]">{attachedFile.name}</span>
                <span className="text-[10px] opacity-70">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="ml-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 p-1 rounded-full cursor-pointer"
                  title="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            
            <div className="flex gap-2.5 w-full">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Attach File (PDF, DOCX, XLSX, CSV, TXT)"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".txt,.csv,.json,.md,.pdf,.docx,.xlsx"
              />
              <textarea
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!loading) {
                      handleSendQuery(inputMsg);
                    }
                  }
                }}
                placeholder="Tanyakan analisis data SIDATA... (Shift+Enter untuk baris baru)"
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] resize-none overflow-y-auto"
                rows={Math.min(5, Math.max(1, inputMsg.split('\n').length))}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-[#1D4ED8] hover:bg-blue-700 text-white p-2.5 rounded-lg transition-all shadow-md shadow-blue-500/10 flex items-center justify-center cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-2.5 font-medium">
              Asisten AI SIDATA dapat membuat kesalahan. Harap periksa kembali informasi yang dihasilkan.
            </p>
          </form>
        </div>



      </div>

    </div>
  );
}
