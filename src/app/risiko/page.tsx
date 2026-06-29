'use client';

import React, { useState } from 'react';
import {
  AlertOctagon,
  TrendingUp,
  ShieldAlert,
  Users,
  Grid,
  Filter,
  RefreshCw,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';

// Seeded Risks Dataset
const INITIAL_RISKS = [
  { id: 'R-01', kategori: 'Strategis', deskripsi: 'Keterlambatan penyelesaian regulasi pengawasan eksternal PMK.', owner: 'Itjen', mitigasi: 'Penyusunan tim akselerasi lintas eselon.', prob: 4, imp: 4, status: 'High' },
  { id: 'R-02', kategori: 'Finansial', deskripsi: 'Ketidakakuratan pencatatan piutang negara eselon I.', owner: 'DJKN', mitigasi: 'Integrasi otomatisasi rekonsiliasi data bulanan.', prob: 3, imp: 5, status: 'High' },
  { id: 'R-03', kategori: 'Operasional', deskripsi: 'Kegagalan sync pipeline dataset integrasi DJP.', owner: 'DJP', mitigasi: 'Penjadwalan ulang otomatis dan backup redundancy.', prob: 4, imp: 2, status: 'Medium' },
  { id: 'R-04', kategori: 'Kepatuhan', deskripsi: 'Keterlambatan penyelesaian berkas TLHP audit tahunan.', owner: 'Itjen', mitigasi: 'Pemberian dashboard warning H-15 target.', prob: 2, imp: 4, status: 'Medium' },
  { id: 'R-05', kategori: 'Teknologi', deskripsi: 'Potensi kebocoran data sensitif Wajib Pajak.', owner: 'DJP', mitigasi: 'Implementasi enkripsi end-to-end and audit ISO 27001.', prob: 2, imp: 5, status: 'High' },
  { id: 'R-06', kategori: 'Strategis', deskripsi: 'Keterbatasan kuantitas auditor bersertifikat pengawasan.', owner: 'Itjen', mitigasi: 'Penyelenggaraan sertifikasi intensif BPPK.', prob: 3, imp: 3, status: 'Medium' },
  { id: 'R-07', kategori: 'Operasional', deskripsi: 'Deviasi logistik pabean pelabuhan utama.', owner: 'DJBC', mitigasi: 'Penyediaan sistem tracking kontainer real-time.', prob: 3, imp: 2, status: 'Medium' },
  { id: 'R-08', kategori: 'Kepatuhan', deskripsi: 'Ketidakpatuhan pelaporan LK eselon I tepat waktu.', owner: 'DJPb', mitigasi: 'Pemberlakuan reward dan punishment berkala.', prob: 1, imp: 3, status: 'Low' },
  { id: 'R-09', kategori: 'Operasional', deskripsi: 'Ketidaklengkapan berkas dokumen klaim aset negara.', owner: 'DJKN', mitigasi: 'Penerapan mandatory cloud upload dokumen.', prob: 2, imp: 2, status: 'Low' },
  { id: 'R-10', kategori: 'Teknologi', deskripsi: 'Server downtime saat integrasi data anggaran nasional.', owner: 'DJPb', mitigasi: 'Migrasi infrastruktur ke cloud server multi-zone.', prob: 1, imp: 5, status: 'Medium' }
];

// Charts Data
const RISK_DIST_DATA = [
  { name: 'Strategis', Low: 2, Medium: 3, High: 4 },
  { name: 'Finansial', Low: 1, Medium: 2, High: 3 },
  { name: 'Operasional', Low: 4, Medium: 5, High: 2 },
  { name: 'Kepatuhan', Low: 3, Medium: 4, High: 1 },
  { name: 'Teknologi', Low: 1, Medium: 2, High: 4 }
];

const RISK_TREND_DATA = [
  { month: 'Jan', RisikoTinggi: 18, TotalRisiko: 45 },
  { month: 'Feb', RisikoTinggi: 17, TotalRisiko: 48 },
  { month: 'Mar', RisikoTinggi: 15, TotalRisiko: 44 },
  { month: 'Apr', RisikoTinggi: 14, TotalRisiko: 42 },
  { month: 'Mei', RisikoTinggi: 12, TotalRisiko: 39 },
  { month: 'Jun', RisikoTinggi: 10, TotalRisiko: 35 }
];

const TOP_RISK_UNITS = [
  { name: 'Itjen', score: 18 },
  { name: 'DJP', score: 16 },
  { name: 'DJKN', score: 15 },
  { name: 'DJBC', score: 12 },
  { name: 'DJPb', score: 8 }
];

export default function RiskManagement() {
  const [selectedProb, setSelectedProb] = useState<number | null>(null);
  const [selectedImp, setSelectedImp] = useState<number | null>(null);
  const [risks, setRisks] = useState(INITIAL_RISKS);

  // Helper to determine Risk Color / Level
  const getRiskLevel = (p: number, i: number) => {
    const score = p * i;
    if (score >= 15) return { name: 'High', color: 'bg-rose-500/85 hover:bg-rose-600 text-white border-rose-600' };
    if (score >= 6) return { name: 'Medium', color: 'bg-amber-400/85 hover:bg-amber-500 text-slate-900 border-amber-500' };
    return { name: 'Low', color: 'bg-emerald-500/85 hover:bg-emerald-600 text-white border-emerald-600' };
  };

  // Click handler for heatmap cell
  const handleCellClick = (prob: number, imp: number) => {
    if (selectedProb === prob && selectedImp === imp) {
      setSelectedProb(null);
      setSelectedImp(null);
    } else {
      setSelectedProb(prob);
      setSelectedImp(imp);
    }
  };

  // Filter risk register
  const filteredRisks = risks.filter(risk => {
    const matchesProb = selectedProb ? risk.prob === selectedProb : true;
    const matchesImp = selectedImp ? risk.imp === selectedImp : true;
    return matchesProb && matchesImp;
  });

  // Calculate KPIs
  const totalRisiko = risks.length;
  const highRisiko = risks.filter(r => r.prob * r.imp >= 15).length;
  const medRisiko = risks.filter(r => r.prob * r.imp >= 6 && r.prob * r.imp < 15).length;
  const lowRisiko = risks.filter(r => r.prob * r.imp < 6).length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <AlertOctagon className="h-6 w-6 text-[#1D4ED8]" /> Manajemen Risiko
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pantau kerawanan organisasi, peta paparan tingkat risiko (*Risk Heatmap*), dan registrasi program mitigasi pengawasan.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Risiko */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Risiko Terdaftar</span>
            <Grid className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{totalRisiko}</p>
          <span className="text-[9px] text-slate-400 font-bold block mt-1">Berkas Profil Risiko</span>
        </div>

        {/* Risiko Tinggi */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Risiko Tinggi (High)</span>
            <ShieldAlert className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{highRisiko}</p>
          <span className="text-[9px] text-rose-600 font-bold block mt-1">Segera Mitigasi</span>
        </div>

        {/* Risiko Sedang */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Risiko Sedang (Med)</span>
            <AlertOctagon className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{medRisiko}</p>
          <span className="text-[9px] text-amber-600 font-bold block mt-1">Monitoring Rutin</span>
        </div>

        {/* Risiko Rendah */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Risiko Rendah (Low)</span>
            <AlertOctagon className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{lowRisiko}</p>
          <span className="text-[9px] text-emerald-600 font-bold block mt-1">Toleransi Normal</span>
        </div>

      </div>

      {/* Row 1: Heatmap vs Summary Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Risk Heatmap (5x5 Grid) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Peta Paparan Risiko (Risk Heatmap Matrix 5x5)
            </h3>
            {(selectedProb || selectedImp) && (
              <button
                onClick={() => { setSelectedProb(null); setSelectedImp(null); }}
                className="text-[10px] font-bold text-[#1D4ED8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" /> Reset Filter Matrix
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            
            {/* Heatmap Grid container */}
            <div className="flex-1 w-full max-w-sm">
              <div className="grid grid-cols-6 gap-1 text-[10px] font-bold text-center">
                
                {/* Labels Y-Axis Probability */}
                <div className="col-span-1 grid grid-rows-5 gap-1 items-center justify-end pr-2 text-slate-400">
                  <div>5 (Hampir Pasti)</div>
                  <div>4 (Sering)</div>
                  <div>3 (Mungkin)</div>
                  <div>2 (Jarang)</div>
                  <div>1 (Hampir Tidak)</div>
                </div>

                {/* 5x5 Grid Matrix */}
                <div className="col-span-5 grid grid-cols-5 gap-1">
                  {[5, 4, 3, 2, 1].map(prob => 
                    [1, 2, 3, 4, 5].map(imp => {
                      const level = getRiskLevel(prob, imp);
                      const isSelected = selectedProb === prob && selectedImp === imp;
                      const activeRisksCount = risks.filter(r => r.prob === prob && r.imp === imp).length;
                      
                      return (
                        <button
                          key={`${prob}-${imp}`}
                          onClick={() => handleCellClick(prob, imp)}
                          className={`aspect-square rounded border transition-all duration-150 flex flex-col items-center justify-center cursor-pointer ${level.color} ${
                            isSelected ? 'ring-4 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 scale-105 shadow-md z-10' : 'opacity-85 hover:opacity-100'
                          }`}
                        >
                          <span className="text-[14px] font-black">{activeRisksCount || ''}</span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Blank space and X-Axis Labels Impact */}
                <div className="col-span-1"></div>
                <div className="col-span-5 grid grid-cols-5 gap-1 mt-1 text-slate-400">
                  <div>1 (Tidak Signifikan)</div>
                  <div>2 (Kecil)</div>
                  <div>3 (Sedang)</div>
                  <div>4 (Besar)</div>
                  <div>5 (Katastrofe)</div>
                </div>
              </div>

              {/* Heatmap Legend */}
              <div className="flex justify-center gap-4 mt-6 text-[10px] font-bold">
                <span className="flex items-center gap-1"><span className="h-3 w-3 bg-emerald-500 rounded"></span> Rendah</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 bg-amber-400 rounded"></span> Sedang</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 bg-rose-500 rounded"></span> Tinggi</span>
              </div>
            </div>

            {/* Matrix Guideline Notes */}
            <div className="w-full sm:w-64 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-850 space-y-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              <div className="flex gap-2 text-[#1D4ED8]">
                <Info className="h-5 w-5 shrink-0" />
                <h4 className="font-extrabold uppercase text-[10px] tracking-wider mt-0.5">Panduan Matriks</h4>
              </div>
              <p>
                Gunakan peta paparan di samping untuk menyaring profil risiko organisasi secara interaktif.
              </p>
              <p>
                Klik pada salah satu kotak sel di dalam matriks untuk memfilter data <strong>Registrasi Risiko</strong> di bawah agar sesuai koordinat <em>Probabilitas x Dampak</em>.
              </p>
            </div>

          </div>
        </div>

        {/* Top High Risk Units Comparison */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-[#1D4ED8]" /> Unit dengan Kerawanan Tertinggi
          </h3>
          <div className="h-64 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TOP_RISK_UNITS} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Bar dataKey="score" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 2: Charts: Risk Distribution & Risk Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Risk Distribution per Category */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4">
            Distribusi Klasifikasi Kategori Risiko
          </h3>
          <div className="h-64 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={RISK_DIST_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend iconSize={8} />
                <Bar dataKey="Low" fill="#10B981" stackId="a" />
                <Bar dataKey="Medium" fill="#FBBF24" stackId="a" />
                <Bar dataKey="High" fill="#EF4444" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Trend */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4">
            Tren Kerawanan & Total Profil Risiko Organisasi
          </h3>
          <div className="h-64 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={RISK_TREND_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="month" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend iconSize={8} />
                <Line type="monotone" dataKey="RisikoTinggi" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="TotalRisiko" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 3: Risk Register Datagrid Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4.5 w-4.5 text-[#1D4ED8]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-350">
              Registrasi Kerawanan Risiko Organisasi (Risk Register)
            </h3>
          </div>
          {(selectedProb || selectedImp) && (
            <span className="text-[10px] font-bold bg-blue-500/10 text-[#1D4ED8] px-2 py-0.5 rounded border border-[#1D4ED8]/10 animate-pulse">
              Memfilter Probabilitas: {selectedProb} & Dampak: {selectedImp}
            </span>
          )}
        </div>

        {/* Datagrid Table */}
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-350">
            <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left w-16">ID</th>
                <th className="px-4 py-3 text-left w-32">Kategori</th>
                <th className="px-4 py-3 text-left">Deskripsi Kerawanan Risiko</th>
                <th className="px-4 py-3 text-left w-28">Risk Owner</th>
                <th className="px-4 py-3 text-left">Rencana Program Mitigasi</th>
                <th className="px-4 py-3 text-center w-24">Probabilitas</th>
                <th className="px-4 py-3 text-center w-24">Dampak</th>
                <th className="px-4 py-3 text-center w-24">Exposure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRisks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-450 italic">
                    Tidak ditemukan catatan registrasi risiko yang sesuai dengan koordinat sel matriks.
                  </td>
                </tr>
              ) : (
                filteredRisks.map((risk) => {
                  const score = risk.prob * risk.imp;
                  return (
                    <tr key={risk.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">{risk.id}</td>
                      <td className="px-4 py-3 font-semibold">{risk.kategori}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{risk.deskripsi}</td>
                      <td className="px-4 py-3 font-bold text-slate-500">{risk.owner}</td>
                      <td className="px-4 py-3 text-slate-500 italic">{risk.mitigasi}</td>
                      <td className="px-4 py-3 text-center font-bold">{risk.prob}</td>
                      <td className="px-4 py-3 text-center font-bold">{risk.imp}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-black border ${
                          score >= 15
                            ? 'bg-rose-100 text-rose-850 border-rose-500/10'
                            : score >= 6
                            ? 'bg-amber-100 text-amber-850 border-amber-500/10'
                            : 'bg-emerald-100 text-emerald-850 border-emerald-500/10'
                        }`}>
                          {score} ({risk.status})
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
