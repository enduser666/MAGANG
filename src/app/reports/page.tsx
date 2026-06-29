'use client';

import React, { useState, useEffect } from 'react';
import { useDb } from '@/context/DbContext';
import {
  FileText,
  Download,
  Share2,
  Eye,
  Search,
  Filter,
  Plus,
  PlusCircle,
  X,
  FileSpreadsheet,
  CheckCircle,
  FileDown,
  Loader2,
  TrendingUp
} from 'lucide-react';

interface ReportCard {
  id: number;
  title: string;
  period: string;
  author: string;
  date: string;
  status: 'FINAL' | 'REVIU' | 'DIARSIPKAN';
  type: 'Bulanan' | 'Triwulanan' | 'Tahunan';
  imageType: 'doc' | 'summary' | 'annual';
}

export default function ReportsManagement() {
  const { dbType, getHeaders } = useDb();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [reports, setReports] = useState<ReportCard[]>([
    {
      id: 1,
      title: 'Laporan Pemantauan Bulanan',
      period: 'Okt 2023',
      author: 'Sistem Otomatis',
      date: '01 Nov 2023',
      status: 'FINAL',
      type: 'Bulanan',
      imageType: 'doc'
    },
    {
      id: 2,
      title: 'Ringkasan Audit Triwulanan',
      period: 'TW3',
      author: 'Auditor A. Smith',
      date: '15 Okt 2023',
      status: 'REVIU',
      type: 'Triwulanan',
      imageType: 'summary'
    },
    {
      id: 3,
      title: 'Indeks Kinerja Tahunan',
      period: '2022',
      author: 'Direktorat Jenderal',
      date: '15 Jan 2023',
      status: 'DIARSIPKAN',
      type: 'Tahunan',
      imageType: 'annual'
    }
  ]);

  // Modal create states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('Laporan Pemantauan Temuan');
  const [newPeriod, setNewPeriod] = useState('Juni 2026');
  const [newType, setNewType] = useState<'Bulanan' | 'Triwulanan' | 'Tahunan'>('Bulanan');
  const [newAuthor, setNewAuthor] = useState('Auditor Utama');
  const [createLoading, setCreateLoading] = useState(false);

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);

    setTimeout(() => {
      const newReport: ReportCard = {
        id: reports.length + 1,
        title: newTitle,
        period: newPeriod,
        author: newAuthor,
        date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: 'REVIU',
        type: newType,
        imageType: newType === 'Bulanan' ? 'doc' : newType === 'Triwulanan' ? 'summary' : 'annual'
      };

      setReports([newReport, ...reports]);
      setIsModalOpen(false);
      setCreateLoading(false);
      
      // Reset defaults
      setNewTitle('Laporan Pemantauan Temuan');
      setNewPeriod('Juni 2026');
    }, 800);
  };

  const handleDownload = (title: string, format: 'PDF' | 'Excel') => {
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${format.toLowerCase()}`;
    alert(`Mengunduh berkas laporan "${title}" dalam format ${format}...`);
    
    // Simulate browser download trigger
    const dummyText = `Inspektorat Jenderal Kementerian Keuangan RI\nLaporan: ${title}\nFormat: ${format}\nDihasilkan pada: ${new Date().toLocaleString()}`;
    const blob = new Blob([dummyText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || 
                          r.period.toLowerCase().includes(search.toLowerCase()) ||
                          r.author.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = filterType === 'all' || r.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Title section with create button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Laporan Pengawasan</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Akses, hasilkan, dan distribusikan dokumen laporan standar pengawasan Inspektorat Jenderal.
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-sm"
        >
          <Plus className="h-4 w-4" /> Buat Laporan Baru
        </button>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-450" />
          <input
            type="text"
            placeholder="Cari laporan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-white focus:outline-none placeholder:text-slate-400"
          />
        </div>

        {/* Filter tags buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'Semua Laporan' },
            { id: 'Bulanan', label: 'Bulanan' },
            { id: 'Triwulanan', label: 'Triwulanan' },
            { id: 'Tahunan', label: 'Tahunan' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                filterType === item.id
                  ? 'bg-blue-500/10 border-[#1D4ED8] text-[#1D4ED8]'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-500'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Card Deck Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredReports.map((report) => {
          
          return (
            <div
              key={report.id}
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between"
            >
              {/* Card visual header header placeholder based on type */}
              <div className="h-44 bg-slate-150 dark:bg-slate-900/60 flex items-center justify-center border-b border-slate-250 dark:border-slate-850 relative">
                
                {/* Visual badge top right */}
                <span className={`absolute top-3 right-3 text-[9px] font-black rounded px-1.5 py-0.5 border ${
                  report.status === 'FINAL'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-500/15'
                    : report.status === 'REVIU'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border-amber-500/15 animate-pulse'
                    : 'bg-slate-100 text-slate-500 border-slate-300'
                }`}>
                  {report.status}
                </span>

                {/* SVG mock report representation depending on visual type */}
                {report.imageType === 'doc' ? (
                  <div className="bg-[#1D4ED8]/10 text-[#1D4ED8] p-4 rounded-xl border border-blue-500/15">
                    <FileText className="h-10 w-10" />
                  </div>
                ) : report.imageType === 'summary' ? (
                  <div className="bg-amber-500/10 text-amber-600 p-4 rounded-xl border border-amber-500/15">
                    <FileSpreadsheet className="h-10 w-10" />
                  </div>
                ) : (
                  <div className="bg-indigo-500/10 text-indigo-500 p-4 rounded-xl border border-indigo-500/15">
                    <TrendingUp className="h-10 w-10" />
                  </div>
                )}
              </div>

              {/* Description Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-slate-850 dark:text-white leading-snug">
                    {report.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">
                    Periode: {report.period}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 border-t border-slate-50 dark:border-slate-850 pt-3 text-[10px] text-slate-400 font-semibold">
                  <span>Dihasilkan oleh: <strong className="text-slate-650 dark:text-slate-350">{report.author}</strong></span>
                  <span>Tanggal ekspor: {report.date}</span>
                </div>

                {/* Card actions */}
                <div className="flex items-center gap-2 border-t border-slate-50 dark:border-slate-850 pt-4 text-xs font-bold w-full">
                  <button
                    onClick={() => handleDownload(report.title, 'PDF')}
                    className="flex-1 inline-flex items-center justify-center gap-1 bg-[#1D4ED8] hover:bg-blue-700 text-white py-2 rounded-lg transition-all cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                  <button
                    onClick={() => handleDownload(report.title, 'Excel')}
                    className="flex-1 inline-flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-55 text-slate-700 dark:text-slate-200 py-2 rounded-lg transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create report config modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-[#1D4ED8]" /> Buat Laporan Pengawasan Baru
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="p-6 space-y-4 text-xs font-semibold">
              
              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-slate-450 uppercase text-[9px] font-bold">Judul Laporan</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              {/* Period input */}
              <div className="space-y-1.5">
                <label className="text-slate-450 uppercase text-[9px] font-bold">Periode / Tahun</label>
                <input
                  type="text"
                  required
                  value={newPeriod}
                  onChange={(e) => setNewPeriod(e.target.value)}
                  placeholder="e.g. Juni 2026"
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              {/* Type selector */}
              <div className="space-y-1.5">
                <label className="text-slate-450 uppercase text-[9px] font-bold">Rentang Periode</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none"
                >
                  <option value="Bulanan">Bulanan</option>
                  <option value="Triwulanan">Triwulanan</option>
                  <option value="Tahunan">Tahunan</option>
                </select>
              </div>

              {/* Author name */}
              <div className="space-y-1.5">
                <label className="text-slate-450 uppercase text-[9px] font-bold">Penyusun</label>
                <input
                  type="text"
                  required
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              {/* Submit actions */}
              <div className="border-t border-slate-100 dark:border-slate-850 pt-4 flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  {createLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Hasilkan Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
