'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  Building,
  Activity,
  CheckCircle,
  Clock,
  ShieldAlert,
  Percent,
  ChevronDown,
  Edit,
  FileText,
  BadgeAlert,
  MessageSquare
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

// Pre-seeded Unit metrics
const UNIT_METRICS: Record<string, {
  name: string;
  fullName: string;
  temuan: number;
  tlhp: number;
  completion: number;
  highRisk: number;
  quality: number;
  performanceScore: number;
  executiveNotes: string;
  qualitySummary: string;
}> = {
  DJP: {
    name: 'DJP',
    fullName: 'Direktorat Jenderal Pajak',
    temuan: 154,
    tlhp: 128,
    completion: 83,
    highRisk: 12,
    quality: 91.5,
    performanceScore: 84,
    executiveNotes: 'Temuan kepatuhan perpajakan masih mendominasi di semester ini. Diperlukan penambahan program verifikasi wajib pajak strategis di regional office dan otomatisasi pelaporan audit internal.',
    qualitySummary: 'Kualitas data dinilai Baik. Ditemukan 12 duplikasi kolom pada dataset pelaporan SPT, tetapi validitas data keseluruhan berada pada rasio 95%.'
  },
  DJBC: {
    name: 'DJBC',
    fullName: 'Direktorat Jenderal Bea dan Cukai',
    temuan: 112,
    tlhp: 92,
    completion: 82,
    highRisk: 8,
    quality: 93.8,
    performanceScore: 82,
    executiveNotes: 'Sistem logistik kepabeanan pelabuhan utama menunjukkan penurunan temuan setelah penerapan tracking kontainer real-time. Fokus audit bergeser ke pemeriksaan cukai rokok ilegal.',
    qualitySummary: 'Kualitas data Sangat Baik. Schema kesesuaian data pabean berada pada tingkat akurasi 98% dengan tingkat kelengkapan kolom wajib sebesar 99.2%.'
  },
  DJKN: {
    name: 'DJKN',
    fullName: 'Direktorat Jenderal Kekayaan Negara',
    temuan: 82,
    tlhp: 62,
    completion: 75,
    highRisk: 9,
    quality: 90.2,
    performanceScore: 78,
    executiveNotes: 'Tindak lanjut atas sertifikasi aset tanah negara menunjukkan keterlambatan progres akibat kendala koordinasi eksternal BPN. Mitigasi dialokasikan melalui tim satgas lintas lembaga.',
    qualitySummary: 'Kualitas data Cukup. Masih terdapat nilai kosong (null) pada kolom keterangan riwayat klaim aset tanah seluas 400 hektar di regional Kalimantan Timur.'
  },
  DJPb: {
    name: 'DJPb',
    fullName: 'Direktorat Jenderal Perbendaharaan',
    temuan: 65,
    tlhp: 61,
    completion: 93,
    highRisk: 4,
    quality: 95.5,
    performanceScore: 92,
    executiveNotes: 'Penyelesaian tindak lanjut audit anggaran daerah berjalan sangat optimal. Sistem penyaluran DAK Fisik menunjukkan peningkatan tata kelola dan transparansi kepatuhan hukum.',
    qualitySummary: 'Kualitas data Prima. Seluruh pelaporan keuangan daerah terintegrasi dengan tingkat kecocokan format data tanggal dan nilai nominal 100%.'
  },
  BPPK: {
    name: 'BPPK',
    fullName: 'Badan Pendidikan dan Pelatihan Keuangan',
    temuan: 28,
    tlhp: 26,
    completion: 92,
    highRisk: 0,
    quality: 97.2,
    performanceScore: 95,
    executiveNotes: 'Tidak ada temuan dengan tingkat risiko tinggi. Evaluasi program diklat keuangan terintegrasi dengan indeks kepuasan alumni yang stabil. Pertahankan sistem pengawasan internal.',
    qualitySummary: 'Kualitas data Prima. Indeks kualitas data pelatihan berada pada tingkat 97% dengan zero duplicates di seluruh tabel log pelatihan tahun berjalan.'
  },
  Setjen: {
    name: 'Setjen',
    fullName: 'Sekretariat Jenderal',
    temuan: 48,
    tlhp: 42,
    completion: 87,
    highRisk: 1,
    quality: 96.0,
    performanceScore: 89,
    executiveNotes: 'Audit pengadaan barang dan jasa internal menunjukkan perbaikan tata kelola. Perlu optimalisasi sistem kearsipan berkas digital untuk mencegah penundaan durasi penyediaan dokumen.',
    qualitySummary: 'Kualitas data Sangat Baik. Tingkat kelengkapan entri data kepegawaian internal mencapai 99.7% dengan validasi format NIP pegawai yang konsisten.'
  },
  Itjen: {
    name: 'Itjen',
    fullName: 'Inspektorat Jenderal',
    temuan: 24,
    tlhp: 20,
    completion: 83,
    highRisk: 3,
    quality: 92.4,
    performanceScore: 85,
    executiveNotes: 'Evaluasi kinerja audit internal menunjukkan kesesuaian dengan standar IIA. Fokus pemantauan saat ini diarahkan pada percepatan penyelesaian rekomendasi penjaminan kualitas program prioritas.',
    qualitySummary: 'Kualitas data Baik. Sistem logging aktivitas audit mencatat durasi respons investigasi dengan format waktu yang seragam, meskipun ada 4 log anomali IP address luar.'
  }
};

// Generative Monthly Trends based on Active Unit
const getUnitTrends = (unit: string) => {
  const multipliers: Record<string, { temuan: number; tlhp: number; risk: number }> = {
    DJP: { temuan: 6.2, tlhp: 5.1, risk: 2.4 },
    DJBC: { temuan: 4.8, tlhp: 3.9, risk: 1.8 },
    DJKN: { temuan: 3.5, tlhp: 2.8, risk: 2.0 },
    DJPb: { temuan: 2.6, tlhp: 2.4, risk: 0.8 },
    BPPK: { temuan: 1.2, tlhp: 1.1, risk: 0.1 },
    Setjen: { temuan: 2.0, tlhp: 1.7, risk: 0.3 },
    Itjen: { temuan: 1.0, tlhp: 0.8, risk: 0.6 }
  };

  const mult = multipliers[unit] || multipliers.DJP;
  return [
    { month: 'Jan', temuan: Math.round(4 * mult.temuan), tlhp: Math.round(3 * mult.tlhp), risk: Math.round(5 * mult.risk) },
    { month: 'Feb', temuan: Math.round(4.5 * mult.temuan), tlhp: Math.round(3.5 * mult.tlhp), risk: Math.round(4.8 * mult.risk) },
    { month: 'Mar', temuan: Math.round(3.8 * mult.temuan), tlhp: Math.round(4 * mult.tlhp), risk: Math.round(4 * mult.risk) },
    { month: 'Apr', temuan: Math.round(5 * mult.temuan), tlhp: Math.round(4.2 * mult.tlhp), risk: Math.round(4.2 * mult.risk) },
    { month: 'Mei', temuan: Math.round(4.2 * mult.temuan), tlhp: Math.round(4.8 * mult.tlhp), risk: Math.round(3.5 * mult.risk) },
    { month: 'Jun', temuan: Math.round(3.5 * mult.temuan), tlhp: Math.round(5 * mult.tlhp), risk: Math.round(3 * mult.risk) }
  ];
};

export default function UnitDashboard() {
  const [activeUnit, setActiveUnit] = useState<string>('DJP');
  const [editNotesMode, setEditNotesMode] = useState(false);
  const [noteInput, setNoteInput] = useState(UNIT_METRICS[activeUnit].executiveNotes);

  const metrics = UNIT_METRICS[activeUnit];
  const trendData = getUnitTrends(activeUnit);

  const handleUnitChange = (unit: string) => {
    setActiveUnit(unit);
    setNoteInput(UNIT_METRICS[unit].executiveNotes);
    setEditNotesMode(false);
  };

  const handleSaveNotes = () => {
    UNIT_METRICS[activeUnit].executiveNotes = noteInput;
    setEditNotesMode(false);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Selector and Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Building className="h-5.5 w-5.5 text-[#1D4ED8]" />
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Kinerja Pengawasan: {metrics.fullName} ({metrics.name})
            </h1>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Indikator capaian audit, status pemenuhan tindak lanjut hasil pemeriksaan, dan kualitas data terintegrasi.
          </p>
        </div>

        {/* Dropdown Selector */}
        <div className="relative inline-block text-left w-full sm:w-56 font-semibold">
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pilih Unit Organisasi</label>
          <div className="relative">
            <select
              value={activeUnit}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] appearance-none cursor-pointer pr-10"
            >
              <option value="DJP">Ditjen Pajak (DJP)</option>
              <option value="DJBC">Ditjen Bea dan Cukai (DJBC)</option>
              <option value="DJKN">Ditjen Kekayaan Negara (DJKN)</option>
              <option value="DJPb">Ditjen Perbendaharaan (DJPb)</option>
              <option value="BPPK">Badan Pendidikan Pelatihan Keuangan (BPPK)</option>
              <option value="Setjen">Sekretariat Jenderal (Setjen)</option>
              <option value="Itjen">Inspektorat Jenderal (Itjen)</option>
            </select>
            <ChevronDown className="absolute right-3 top-2.5 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid: KPIs & Score Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Unit Performance Score Gauge Card */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 flex flex-col items-center justify-center text-center shadow-xs">
          <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4 w-full text-left">
            Unit Performance Score
          </h3>
          
          <div className="relative h-32 w-32 flex items-center justify-center">
            {/* Circular Gauge */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="52"
                strokeWidth="10"
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-850"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="52"
                strokeWidth="10"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - metrics.performanceScore / 100)}
                strokeLinecap="round"
                stroke="currentColor"
                className="text-[#1D4ED8]"
                fill="transparent"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{metrics.performanceScore}</span>
              <span className="text-[10px] text-slate-400 block font-bold mt-1">INDEKS KEPATUHAN</span>
            </div>
          </div>
          
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-4">
            Status Kepatuhan: <strong className="text-[#1D4ED8]">{metrics.performanceScore >= 85 ? 'SANGAT TINGGI' : 'OPTIMAL'}</strong>
          </p>
        </div>

        {/* 4 Cards Scorecard List */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
          
          {/* Jumlah Temuan */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Jumlah Temuan</span>
              <BadgeAlert className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.temuan}</p>
            <span className="text-[9px] text-slate-400 font-bold block mt-2">Temuan Pengawasan Aktif</span>
          </div>

          {/* Jumlah TLHP */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Jumlah Berkas TLHP</span>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.tlhp}</p>
            <span className="text-[9px] text-slate-400 font-bold block mt-2">Proses Pemantauan Dokumen</span>
          </div>

          {/* Persentase Penyelesaian */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Penyelesaian TLHP</span>
              <Percent className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.completion}%</p>
            <span className="text-[9px] text-emerald-600 font-bold block mt-2">Tingkat Penuntasan Rekomendasi</span>
          </div>

          {/* Risiko Tinggi & Kualitas Data */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Risiko Tinggi / Kualitas Data</span>
              <ShieldAlert className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex justify-between items-baseline mt-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.highRisk}</span>
              <span className="text-xs font-bold text-[#1D4ED8]">Data Quality: {metrics.quality}%</span>
            </div>
            <span className="text-[9px] text-slate-400 font-bold block mt-2">Rasio Integritas Dataset</span>
          </div>

        </div>

      </div>

      {/* Row 2: Charts: Temuan, TLHP, and Risk Trend for Unit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Temuan Trend */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-amber-500" /> Tren Akumulasi Temuan Baru
          </h3>
          <div className="h-60 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="month" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="temuan" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TLHP Trend */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" /> Tren Penyelesaian Rekomendasi
          </h3>
          <div className="h-60 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="unitSelesai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="month" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="tlhp" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#unitSelesai)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Trend */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-rose-500" /> Tren Kerawanan Eksposur Risiko
          </h3>
          <div className="h-60 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="month" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="risk" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 3: Notes & Data Quality Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Executive Notes (Catatan Pengawasan Eselon I) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4.5 w-4.5 text-[#1D4ED8]" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-350">
                Catatan Pengawasan Eksekutif (Executive Notes)
              </h3>
            </div>
            
            {editNotesMode ? (
              <button
                onClick={handleSaveNotes}
                className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                Simpan
              </button>
            ) : (
              <button
                onClick={() => setEditNotesMode(true)}
                className="text-[10px] font-bold text-[#1D4ED8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit className="h-3 w-3" /> Edit Catatan
              </button>
            )}
          </div>

          {editNotesMode ? (
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              rows={4}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-medium"
            />
          ) : (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-850 min-h-[96px]">
              <p className="text-xs leading-relaxed text-slate-650 dark:text-slate-350 font-semibold italic">
                "{metrics.executiveNotes}"
              </p>
            </div>
          )}
        </div>

        {/* Data Quality Summary */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-[#1D4ED8]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-350">
              Evaluasi Kualitas Integritas Data (Data Quality Summary)
            </h3>
          </div>

          <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-850 min-h-[96px] flex flex-col justify-between">
            <p className="text-xs leading-relaxed text-slate-650 dark:text-slate-350 font-semibold">
              {metrics.qualitySummary}
            </p>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-850 pt-2">
              <span>Status Sertifikasi: <strong className="text-emerald-600">TERVERIFIKASI ITJEN</strong></span>
              <span>Skor Akurasi: {metrics.quality}%</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
