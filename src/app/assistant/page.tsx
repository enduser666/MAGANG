'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useDb } from '@/context/DbContext';
import {
  MessageSquareCode,
  Send,
  Sparkles,
  Terminal,
  CheckSquare,
  BarChart3,
  Lightbulb,
  ArrowRight,
  User,
  Brain,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  sql?: string;
  recommendations?: string[];
  chartType?: 'bar' | 'line' | 'area';
  chartData?: any[];
}

export default function AIAnalyticsAssistant() {
  const { dbType } = useDb();

  const [inputMsg, setInputMsg] = useState('');
  const [chatFeed, setChatFeed] = useState<ChatMessage[]>([
    {
      sender: 'assistant',
      text: 'Halo! Saya Asisten Analitik SIDATA Inspektorat Jenderal. Silakan ajukan pertanyaan seputar data temuan pengawasan, tren penyelesaian tindak lanjut (TLHP), atau analisis tingkat risiko unit kerja Kementerian Keuangan.'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatFeed]);

  const promptOptions = [
    {
      label: 'Temuan Terbanyak',
      query: 'Unit kerja mana yang memiliki temuan terbanyak?'
    },
    {
      label: 'Tren TLHP 12 Bulan',
      query: 'Tampilkan tren penyelesaian TLHP selama 12 bulan terakhir.'
    },
    {
      label: 'Unit Risiko Tertinggi',
      query: 'Analisis unit kerja dengan risiko tertinggi.'
    }
  ];

  const handleSendQuery = (textQuery: string) => {
    if (!textQuery.trim()) return;

    // 1. Append user query to chat feed
    const userMsg: ChatMessage = { sender: 'user', text: textQuery };
    setChatFeed(prev => [...prev, userMsg]);
    setInputMsg('');
    setLoading(true);

    // 2. Simulate AI engine responses depending on keywords matching Kemenkeu queries
    setTimeout(() => {
      let responseText = '';
      let generatedSql = '';
      let recommendations: string[] = [];
      let chartType: 'bar' | 'line' | 'area' | undefined;
      let chartData: any[] = [];

      const queryLower = textQuery.toLowerCase();

      if (queryLower.includes('banyak') || queryLower.includes('unit kerja') || queryLower.includes('djp')) {
        responseText = 'Berdasarkan analisis data temuan pengawasan, Direktorat Jenderal Pajak (DJP) mencatat jumlah temuan terbanyak dengan total 1.240 temuan, disusul oleh Direktorat Jenderal Bea dan Cukai (DJBC) sebanyak 980 temuan. Namun demikian, DJP juga memiliki tingkat penyelesaian tindak lanjut (TLHP) tertinggi dibandingkan unit lainnya.';
        generatedSql = 'SELECT unit_kerja, COUNT(id) as jumlah_temuan\nFROM temuan_pengawasan\nGROUP BY unit_kerja\nORDER BY jumlah_temuan DESC;';
        recommendations = [
          'Tingkatkan koordinasi kepatuhan internal pada lingkungan Direktorat Jenderal Pajak.',
          'Evaluasi penyebab tingginya anomali pada pelaporan perpajakan daerah.',
          'Lakukan standarisasi audit sistem informasi perpajakan untuk mereduksi kesalahan berulang.'
        ];
        chartType = 'bar';
        chartData = [
          { name: 'DJ Pajak', Temuan: 1240 },
          { name: 'DJ Bea Cukai', Temuan: 980 },
          { name: 'DJ Perbendaharaan', Temuan: 750 },
          { name: 'DJ Kekayaan Negara', Temuan: 520 },
          { name: 'BK Fiskal', Temuan: 310 }
        ];
      } else if (queryLower.includes('tren') || queryLower.includes('tlhp') || queryLower.includes('bulan')) {
        responseText = 'Tren penyelesaian Tindak Lanjut Hasil Pengawasan (TLHP) menunjukkan peningkatan konsisten sepanjang 12 bulan terakhir. Persentase rata-rata penyelesaian kumulatif saat ini berada di angka 92,4%, memenuhi standar efektivitas pengawasan Inspektorat Jenderal.';
        generatedSql = 'SELECT DATE_TRUNC(\'month\', tanggal) as bulan, \n       (COUNT(CASE WHEN status = \'Selesai\' THEN 1 END) * 100.0 / COUNT(*)) as rate_penyelesaian\nFROM temuan_pengawasan\nGROUP BY bulan\nORDER BY bulan ASC;';
        recommendations = [
          'Optimalkan pemantauan real-time melalui Dashboard Pimpinan untuk menekan keterlambatan.',
          'Berikan surat teguran otomatis bagi unit kerja dengan penyelesaian di bawah SLA (95%).'
        ];
        chartType = 'line';
        chartData = [
          { name: 'Jan', 'Rate TLHP': 85.2 },
          { name: 'Feb', 'Rate TLHP': 86.8 },
          { name: 'Mar', 'Rate TLHP': 87.5 },
          { name: 'Apr', 'Rate TLHP': 89.1 },
          { name: 'May', 'Rate TLHP': 90.2 },
          { name: 'Jun', 'Rate TLHP': 92.4 }
        ];
      } else if (queryLower.includes('risiko') || queryLower.includes('tinggi')) {
        responseText = 'Analisis sebaran tingkat risiko menunjukkan bahwa temuan berkategori Risiko Tinggi (Critical) didominasi oleh Direktorat Jenderal Bea dan Cukai (DJBC) dan Direktorat Jenderal Pajak (DJP), dengan konsentrasi dampak finansial mencapai Rp 4,5 Milyar di wilayah regional Jawa.';
        generatedSql = 'SELECT tingkat_risiko, SUM(dampak_finansial) as total_dampak\nFROM temuan_pengawasan\nWHERE tingkat_risiko = \'Risiko Tinggi\'\nGROUP BY tingkat_risiko;';
        recommendations = [
          'Fokuskan alokasi Auditor Utama untuk melakukan penugasan khusus (Investigative Audit) pada area kepabeanan.',
          'Tinjau mitigasi risiko sistem TI transaksi bea cukai di pelabuhan laut utama.'
        ];
        chartType = 'area';
        chartData = [
          { name: 'Jawa', Dampak: 4500000000 },
          { name: 'Sumatera', Dampak: 2200000000 },
          { name: 'Kalimantan', Dampak: 1300000000 },
          { name: 'Sulawesi', Dampak: 900000000 },
          { name: 'Papua', Dampak: 200000000 }
        ];
      } else {
        responseText = `Saya menerima pertanyaan Anda mengenai "${textQuery}". Namun, data spesifik belum terindeks penuh di tabel dinamis Anda. Berikut skrip dasar SQL yang relevan untuk menelusuri data tersebut.`;
        generatedSql = `SELECT * FROM "${dbType === 'postgres' ? 'public_sidata' : 'tables'}"\nWHERE CAST(details AS TEXT) ILIKE '%${textQuery.trim()}%'\nLIMIT 10;`;
        recommendations = [
          'Gunakan filter pencarian di database explorer untuk penelusuran lebih presisi.',
          'Pastikan dataset yang diunggah memiliki kolom metadata yang lengkap.'
        ];
      }

      const assistantMsg: ChatMessage = {
        sender: 'assistant',
        text: responseText,
        sql: generatedSql,
        recommendations,
        chartType,
        chartData
      };

      setChatFeed(prev => [...prev, assistantMsg]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Asisten Analitik AI</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
          Ajukan pertanyaan analitis menggunakan bahasa alami untuk menghasilkan kueri SQL otomatis, wawasan audit, dan visualisasi bagan.
        </p>
      </div>

      {/* Main Grid chat layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left 3 columns: Chat Assistant window */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm flex flex-col h-[550px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#1D4ED8]" />
              <span className="text-xs font-black text-slate-800 dark:text-white">SIDATA AI Assistant</span>
            </div>
            <span className="text-[9px] uppercase font-black tracking-widest text-[#1D4ED8] bg-blue-500/10 px-2 py-0.5 rounded">
              Online
            </span>
          </div>

          {/* Chat Feed Messages viewport */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F8FAFC]/50 dark:bg-[#0B0F19]/25">
            {chatFeed.map((msg, idx) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={idx} className={`flex gap-3.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  
                  {/* Avatar */}
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    isUser 
                      ? 'bg-blue-500/10 text-[#1D4ED8] border border-blue-500/20'
                      : 'bg-[#1D4ED8] text-white shadow-sm'
                  }`}>
                    {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 fill-white" />}
                  </div>

                  {/* Message Bubble contents */}
                  <div className={`rounded-xl p-4 text-xs leading-relaxed space-y-4 shadow-xs ${
                    isUser
                      ? 'bg-[#1D4ED8] text-white'
                      : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                  }`}>
                    {/* Plain explanation text */}
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Dynamic SQL script console block */}
                    {msg.sql && (
                      <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Terminal className="h-3.5 w-3.5" /> Generated SQL Query
                        </span>
                        <div className="bg-zinc-950 dark:bg-black border border-zinc-800 rounded-lg p-3 font-mono text-[9px] text-[#22C55E] overflow-x-auto whitespace-pre">
                          {msg.sql}
                        </div>
                      </div>
                    )}

                    {/* Action checklists */}
                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-850">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                          <CheckSquare className="h-3.5 w-3.5" /> Rekomendasi Tindakan Audit
                        </span>
                        <ul className="space-y-1.5 list-disc pl-4 text-slate-500 dark:text-slate-400">
                          {msg.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Interactive charts visual */}
                    {msg.chartType && msg.chartData && (
                      <div className="space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-850 w-full min-w-[280px]">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5" /> Auto-Generated Visual
                        </span>

                        <div className="h-[180px] bg-slate-50/50 dark:bg-slate-900/20 rounded-lg p-2">
                          {msg.chartType === 'bar' ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={msg.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-850" />
                                <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} />
                                <YAxis stroke="#94A3B8" fontSize={9} />
                                <Tooltip />
                                <Bar dataKey="Temuan" fill="#1D4ED8" radius={[3, 3, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : msg.chartType === 'line' ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={msg.chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:stroke-slate-850" />
                                <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} />
                                <YAxis stroke="#94A3B8" fontSize={9} />
                                <Tooltip />
                                <Line type="monotone" dataKey="Rate TLHP" stroke="#1D4ED8" strokeWidth={2.5} />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={msg.chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:stroke-slate-850" />
                                <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} />
                                <YAxis stroke="#94A3B8" fontSize={9} />
                                <Tooltip />
                                <Area type="monotone" dataKey="Dampak" fill="#1D4ED8" fillOpacity={0.1} stroke="#1D4ED8" strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Ingestion loading dot */}
            {loading && (
              <div className="flex gap-3.5 mr-auto">
                <div className="h-8 w-8 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 animate-pulse">
                  <Sparkles className="h-4 w-4 fill-white" />
                </div>
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                  <span className="text-xs text-slate-450 italic">Menganalisis kueri data...</span>
                </div>
              </div>
            )}

            <div ref={feedEndRef} />
          </div>

          {/* Form input messaging bar */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery(inputMsg);
            }}
            className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] flex gap-3.5"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Tanyakan sesuatu, contoh: 'Unit kerja mana yang memiliki temuan terbanyak?'"
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#1D4ED8] hover:bg-blue-700 text-white p-2.5 rounded-lg transition-all shadow-md shadow-blue-500/10 flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>

        {/* Column 4: Suggestions list (Right sidebar) */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-extrabold text-slate-450 uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="h-4.5 w-4.5 text-[#1D4ED8]" /> Topik Rekomendasi
          </h3>
          
          <div className="space-y-2">
            {promptOptions.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuery(opt.query)}
                className="w-full flex items-center justify-between p-3 text-left border border-slate-100 dark:border-slate-850 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs font-bold text-slate-650 dark:text-slate-300 transition-all cursor-pointer"
              >
                <span>{opt.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#1D4ED8] flex-shrink-0" />
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-850 pt-4 text-[10px] text-slate-400 leading-relaxed font-semibold">
            <div className="flex gap-2">
              <HelpCircle className="h-4.5 w-4.5 text-slate-450 flex-shrink-0" />
              <p>Asisten Bantuan SIDATA secara otomatis memetakan variabel kueri berdasarkan nama kolom di tabel aktif Anda.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
