'use client';

import React, { useState } from 'react';
import {
  Target,
  TrendingUp,
  Award,
  ListTodo,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Activity,
  Flame
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

// Seeded IKU Mock Dataset
const INITIAL_IKU_DATA = [
  { id: 'IKU-01', nama: 'Persentase Tindak Lanjut Hasil Pengawasan (TLHP)', target: 95, realisasi: 91, unit: 'Itjen', status: 'Perlu Perhatian', type: '%' },
  { id: 'IKU-02', nama: 'Indeks Kepatuhan Perpajakan Wajib Pajak Strategis', target: 90, realisasi: 92.5, unit: 'DJP', status: 'Sangat Baik', type: '%' },
  { id: 'IKU-03', nama: 'Kecepatan Pelayanan Kepabeanan Jalur Hijau (Durasi)', target: 4, realisasi: 3.8, unit: 'DJBC', status: 'Sangat Baik', type: 'jam', invert: true },
  { id: 'IKU-04', nama: 'Akurasi Penilaian Aset & Barang Milik Negara (BMN)', target: 98, realisasi: 95.8, unit: 'DJKN', status: 'Baik', type: '%' },
  { id: 'IKU-05', nama: 'Tingkat Penyerapan Anggaran Belanja Negara Semester I', target: 50, realisasi: 48.2, unit: 'DJPb', status: 'Baik', type: '%' },
  { id: 'IKU-06', nama: 'Indeks Kepuasan Alumni Pelatihan Keuangan Terpadu', target: 85, realisasi: 87.5, unit: 'BPPK', status: 'Sangat Baik', type: 'indeks' },
  { id: 'IKU-07', nama: 'Kecepatan Tindak Lanjut Pengaduan Investigasi (Durasi)', target: 14, realisasi: 15.5, unit: 'Itjen', status: 'Perlu Perhatian', type: 'hari', invert: true }
];

// Charts Data
const MONTHLY_ACHIEVEMENT = [
  { month: 'Jan', Target: 80, Realisasi: 78 },
  { month: 'Feb', Target: 82, Realisasi: 80 },
  { month: 'Mar', Target: 85, Realisasi: 83.5 },
  { month: 'Apr', Target: 85, Realisasi: 86 },
  { month: 'Mei', Target: 88, Realisasi: 87 },
  { month: 'Jun', Target: 90, Realisasi: 89.2 }
];

const ANNUAL_ACHIEVEMENT = [
  { year: '2022', Capaian: 91.2 },
  { year: '2023', Capaian: 92.8 },
  { year: '2024', Capaian: 93.5 },
  { year: '2025', Capaian: 94.1 },
  { year: '2026 (YTD)', Capaian: 91.5 }
];

const UNIT_COMPARISON = [
  { name: 'BPPK', score: 102.9 },
  { name: 'DJP', score: 102.7 },
  { name: 'DJPb', score: 96.4 },
  { name: 'DJKN', score: 97.7 },
  { name: 'DJBC', score: 95.0 },
  { name: 'Setjen', score: 94.5 },
  { name: 'Itjen', score: 92.8 }
];

export default function IkuDashboard() {
  const [selectedUnit, setSelectedUnit] = useState('');
  const [ikuList, setIkuList] = useState(INITIAL_IKU_DATA);

  // Filter IKU list
  const filteredIku = ikuList.filter(iku => {
    return selectedUnit ? iku.unit === selectedUnit : true;
  });

  // Calculate stats
  const totalIku = filteredIku.length;
  
  // Calculate average achievement rate
  const totalAchievement = filteredIku.reduce((acc, curr) => {
    let rate = 0;
    if (curr.invert) {
      rate = curr.realisasi <= curr.target ? 100 : (curr.target / curr.realisasi) * 100;
    } else {
      rate = (curr.realisasi / curr.target) * 100;
    }
    return acc + rate;
  }, 0);
  
  const averageRate = totalIku > 0 ? Math.round(totalAchievement / totalIku) : 0;
  const needAttention = filteredIku.filter(x => x.status === 'Perlu Perhatian').length;
  const excellent = filteredIku.filter(x => x.status === 'Sangat Baik').length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6 text-[#1D4ED8]" /> Dashboard Indikator Kinerja Utama (IKU)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Evaluasi pencapaian target IKU organisasi, perbandingan kinerja eselon I, dan status pencapaian IKU Itjen.
          </p>
        </div>

        {/* Dropdown Filter */}
        <div className="w-full sm:w-48 font-semibold text-xs">
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
          >
            <option value="">Semua Eselon I</option>
            <option value="DJP">DJP</option>
            <option value="DJBC">DJBC</option>
            <option value="DJKN">DJKN</option>
            <option value="DJPb">DJPb</option>
            <option value="BPPK">BPPK</option>
            <option value="Itjen">Itjen</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total IKU */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Sasaran IKU</span>
            <ListTodo className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{totalIku}</p>
          <span className="text-[9px] text-slate-400 font-bold block mt-1">Target Strategis</span>
        </div>

        {/* Average Achievement */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Rata-rata Capaian</span>
            <TrendingUp className="h-4.5 w-4.5 text-[#1D4ED8]" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{averageRate}%</p>
          <span className="text-[9px] text-[#1D4ED8] font-bold block mt-1">Indeks Efektivitas</span>
        </div>

        {/* Excellent IKU */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">IKU Sangat Baik</span>
            <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{excellent}</p>
          <span className="text-[9px] text-emerald-600 font-bold block mt-1">Melampaui Target</span>
        </div>

        {/* Attention IKU */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Perlu Perhatian</span>
            <AlertCircle className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{needAttention}</p>
          <span className="text-[9px] text-amber-600 font-bold block mt-1">Kurang dari Target</span>
        </div>

      </div>

      {/* Row 2: Charts: Achievement, Trends, Unit comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Achievement Line */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-[#1D4ED8]" /> Tren Realisasi vs Target IKU (YTD)
          </h3>
          <div className="h-64 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MONTHLY_ACHIEVEMENT} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="month" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend iconSize={8} />
                <Line type="monotone" dataKey="Target" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Realisasi" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Eselon I Capaian Ranking */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex flex-col justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <Award className="h-4 w-4 text-amber-500" /> Indeks Capaian IKU Tertinggi
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {UNIT_COMPARISON.map((unit, idx) => (
              <div key={unit.name} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className={`h-4.5 w-4.5 flex items-center justify-center rounded-full text-[9px] font-black ${
                    idx === 0 ? 'bg-amber-500/10 text-amber-600' :
                    idx === 1 ? 'bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-350' :
                    idx === 2 ? 'bg-amber-600/10 text-amber-700' : 'bg-slate-100 dark:bg-slate-900 text-slate-450'
                  }`}>
                    {idx + 1}
                  </span>
                  <span>{unit.name}</span>
                </div>
                <div className="flex items-center gap-2 w-32">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      unit.score >= 100 ? 'bg-emerald-500' :
                      unit.score >= 95 ? 'bg-blue-500' : 'bg-amber-500'
                    }`} style={{ width: `${Math.min(unit.score, 100)}%` }} />
                  </div>
                  <span className="font-bold shrink-0">{unit.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Row 3: IKU Target List Progress Bars Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
        
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">
          Target Sasaran & Realisasi IKU Organisasi
        </h3>

        {/* Datagrid Table */}
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-350">
            <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left w-16">ID IKU</th>
                <th className="px-4 py-3 text-left">Nama Indikator Kinerja Utama</th>
                <th className="px-4 py-3 text-left w-24">Eselon I</th>
                <th className="px-4 py-3 text-center w-24">Target</th>
                <th className="px-4 py-3 text-center w-24">Realisasi</th>
                <th className="px-4 py-3 text-center w-36">Capaian Efektivitas</th>
                <th className="px-4 py-3 text-center w-28">Status IKU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredIku.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-450 italic">
                    Tidak ditemukan sasaran IKU untuk filter unit kerja ini.
                  </td>
                </tr>
              ) : (
                filteredIku.map((iku) => {
                  let cap = 0;
                  if (iku.invert) {
                    cap = iku.realisasi <= iku.target ? 100 : Math.round((iku.target / iku.realisasi) * 100);
                  } else {
                    cap = Math.round((iku.realisasi / iku.target) * 100);
                  }

                  return (
                    <tr key={iku.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">{iku.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{iku.nama}</td>
                      <td className="px-4 py-3 font-bold text-slate-500">{iku.unit}</td>
                      <td className="px-4 py-3 text-center font-semibold">{iku.target} {iku.type}</td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-800 dark:text-slate-200">{iku.realisasi} {iku.type}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
                            <div className={`h-full rounded-full ${
                              cap >= 100 ? 'bg-emerald-500' :
                              cap >= 95 ? 'bg-blue-500' : 'bg-amber-500'
                            }`} style={{ width: `${Math.min(cap, 100)}%` }} />
                          </div>
                          <span className="font-black shrink-0">{cap}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-black border ${
                          iku.status === 'Sangat Baik'
                            ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-500/10'
                            : iku.status === 'Baik'
                            ? 'bg-blue-100 text-blue-850 dark:bg-blue-950/20 dark:text-blue-400 border-blue-500/10'
                            : 'bg-amber-100 text-amber-850 dark:bg-amber-950/20 dark:text-amber-400 border-amber-500/10'
                        }`}>
                          {iku.status}
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
