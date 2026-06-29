'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  FileText,
  Download,
  Calendar,
  Layers,
  History,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FolderDot
} from 'lucide-react';

// Seeded Regulation Documents Database
const INITIAL_DOCUMENTS = [
  {
    id: 'REG-01',
    nomor: 'PMK No. 123/PMK.09/2025',
    judul: 'Pedoman Umum Tindak Lanjut Hasil Pengawasan (TLHP) di Lingkungan Kementerian Keuangan',
    kategori: 'PMK',
    tanggal: '2025-01-10',
    versi: '2.0 (Aktif)',
    status: 'Aktif',
    desc: 'Menetapkan pedoman dan tata cara pelaksanaan pemantauan serta penyelesaian rekomendasi tindak lanjut hasil audit internal Itjen.',
    terkait: ['SOP-01', 'REG-03'],
    riwayat: [
      { versi: '1.1', tanggal: '2022-08-15', status: 'Arsip', catatan: 'Revisi minor tata redaksional pelaporan audit.' },
      { versi: '1.0', tanggal: '2020-03-01', status: 'Arsip', catatan: 'Rilis pedoman pertama pengawasan internal.' }
    ]
  },
  {
    id: 'REG-02',
    nomor: 'PMK No. 45/PMK.09/2024',
    judul: 'Penerapan Manajemen Risiko Terintegrasi di Lingkungan Kementerian Keuangan',
    kategori: 'PMK',
    tanggal: '2024-05-20',
    versi: '1.2 (Aktif)',
    status: 'Aktif',
    desc: 'Kerangka kerja pengelolaan risiko strategis, operasional, finansial, kepatuhan, dan teknologi informasi lintas eselon I.',
    terkait: ['REG-01'],
    riwayat: [
      { versi: '1.1', tanggal: '2021-11-10', status: 'Arsip', catatan: 'Penyesuaian scoring dampak risiko IT.' },
      { versi: '1.0', tanggal: '2019-06-15', status: 'Arsip', catatan: 'Perumusan pedoman manajemen risiko awal.' }
    ]
  },
  {
    id: 'SOP-01',
    nomor: 'SOP-09-ITJEN-2025',
    judul: 'Standard Operating Procedure Penanganan & Eskalasi Temuan Risiko Tinggi',
    kategori: 'SOP',
    tanggal: '2025-03-01',
    versi: '1.0 (Aktif)',
    status: 'Aktif',
    desc: 'Alur eskalasi pelaporan investigasi temuan dengan tingkat ancaman kritis ke pimpinan eselon I dan Itjen.',
    terkait: ['REG-01', 'EWS-ALERT'],
    riwayat: []
  },
  {
    id: 'REG-03',
    nomor: 'SE No. SE-12/ITJEN/2026',
    judul: 'Standardisasi Penjaminan Kualitas Integritas Data & Audit Berbasis Data',
    kategori: 'Surat Edaran',
    tanggal: '2026-02-15',
    versi: '1.0 (Aktif)',
    status: 'Aktif',
    desc: 'Instruksi kepala Itjen terkait kewajiban eselon I mengintegrasikan data operasional ke SIDATA dan validasi otomatis.',
    terkait: ['REG-01', 'SOP-02'],
    riwayat: []
  },
  {
    id: 'PED-01',
    nomor: 'PED-ITJEN-09-02',
    judul: 'Pedoman Teknis Pelaksanaan Audit Kinerja dan Audit Kepatuhan Keuangan',
    kategori: 'Pedoman Pengawasan',
    tanggal: '2023-09-01',
    versi: '3.0 (Aktif)',
    status: 'Aktif',
    desc: 'Acuan pelaksanaan pengawasan audit operasional bagi auditor fungsional Itjen di seluruh unit kerja kementerian.',
    terkait: ['REG-01'],
    riwayat: [
      { versi: '2.0', tanggal: '2018-05-10', status: 'Arsip', catatan: 'Penyelarasan standar audit IIA.' }
    ]
  },
  {
    id: 'DOC-INT-01',
    nomor: 'DOC-INT-ITJEN-005',
    judul: 'Kebijakan Pengamanan Sistem Informasi & Whitelist Alamat IP SIDATA',
    kategori: 'Dokumen Internal',
    tanggal: '2026-04-10',
    versi: '1.1 (Aktif)',
    status: 'Aktif',
    desc: 'Protokol keamanan internal Itjen untuk hak akses administrator, enkripsi database, dan pembatasan IP jaringan.',
    terkait: ['REG-02'],
    riwayat: []
  }
];

export default function RegulationRepository() {
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('Semua');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const categories = ['Semua', 'PMK', 'SOP', 'Surat Edaran', 'Pedoman Pengawasan', 'Dokumen Internal'];

  // Filtering list
  const filteredDocs = documents.filter(doc => {
    const matchesTab = activeTab === 'Semua' ? true : doc.kategori === activeTab;
    const matchesSearch = doc.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.nomor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.desc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedDocId(expandedDocId === id ? null : id);
  };

  const handleDownload = (doc: any) => {
    const fileContent = `SIDATA REGULATION REPOSITORY DOCUMENT DOWNLOAD\n============================================\nDocument Code: ${doc.id}\nDocument Number: ${doc.nomor}\nTitle: ${doc.judul}\nEffective Date: ${doc.tanggal}\nVersion: ${doc.versi}\nStatus: ${doc.status}\n\nDisclaimer: This is an internal Ministry of Finance document download placeholder. All rights reserved.`;
    
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${doc.nomor.replace(/[^a-zA-Z0-9]/g, '_')}_versi_${doc.versi.split(' ')[0]}.txt`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-[#1D4ED8]" /> Repositori Regulasi
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pusat rujukan regulasi pengawasan, pedoman teknis audit, surat edaran Itjen, dan standar tata kelola internal Kementerian Keuangan.
        </p>
      </div>

      {/* Search & Category Tabs */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        
        {/* Search bar */}
        <div className="relative font-semibold text-xs">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari regulasi berdasarkan nomor, judul, atau kata kunci deskripsi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
          />
        </div>

        {/* Categories Tab list */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 font-bold text-xs scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap cursor-pointer transition-all ${
                activeTab === cat
                  ? 'bg-blue-500/10 border-[#1D4ED8] text-[#1D4ED8]'
                  : 'border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* Document Library List */}
      <div className="space-y-4">
        {filteredDocs.length === 0 ? (
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-450 italic text-xs font-semibold">
            Tidak ditemukan regulasi atau pedoman pengawasan yang cocok dengan kata kunci pencarian Anda.
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isExpanded = expandedDocId === doc.id;
            return (
              <div 
                key={doc.id}
                className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-sm transition-all space-y-3 font-semibold text-xs"
              >
                
                {/* Title line */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-400">{doc.id}</span>
                      <span className="text-[10px] font-black uppercase bg-[#1D4ED8]/10 text-[#1D4ED8] px-2 py-0.5 rounded">
                        {doc.kategori}
                      </span>
                      <span className="text-[10px] font-bold text-slate-550 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900">
                        {doc.nomor}
                      </span>
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-850 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/10">
                        {doc.versi}
                      </span>
                    </div>
                    
                    <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug pt-1">
                      {doc.judul}
                    </h3>
                  </div>

                  {/* Actions (Download) */}
                  <button
                    onClick={() => handleDownload(doc)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white px-3 py-1.5 font-bold transition-all shadow-xs cursor-pointer self-start sm:self-center"
                  >
                    <Download className="h-3.5 w-3.5" /> Unduh PDF
                  </button>
                </div>

                {/* Description */}
                <p className="text-slate-650 dark:text-slate-350 leading-relaxed text-xs">
                  {doc.desc}
                </p>

                {/* Meta details footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-850 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Berlaku Mulai: {doc.tanggal}</span>
                    <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5 text-slate-400" /> Status: {doc.status}</span>
                  </div>

                  {/* Riwayat Versi collapsible control */}
                  <div className="flex items-center gap-3">
                    {doc.riwayat.length > 0 && (
                      <button
                        onClick={() => toggleExpand(doc.id)}
                        className="flex items-center gap-1 text-[#1D4ED8] hover:underline cursor-pointer"
                      >
                        <History className="h-3.5 w-3.5" /> Riwayat Versi {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Riwayat Versi list (Collapsible) */}
                {isExpanded && doc.riwayat.length > 0 && (
                  <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-850 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400">
                      Riwayat Pembaruan Regulasi
                    </h4>
                    <div className="divide-y divide-slate-150 dark:divide-slate-800 text-[11px] font-semibold text-slate-650 dark:text-slate-350">
                      {doc.riwayat.map((v, idx) => (
                        <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">Versi {v.versi}</span>
                            <span className="text-[10px] text-slate-400 font-bold ml-2">({v.tanggal})</span>
                            <p className="text-slate-400 mt-0.5 text-[10px] italic">Catatan: {v.catatan}</p>
                          </div>
                          <span className="text-[9px] uppercase font-black bg-slate-200 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                            {v.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Documents links list */}
                {doc.terkait.length > 0 && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 border-t border-slate-100 dark:border-slate-850 pt-2 flex-wrap">
                    <span className="flex items-center gap-1"><FolderDot className="h-3.5 w-3.5 text-slate-400" /> Dokumen Terkait:</span>
                    <div className="flex gap-1.5">
                      {doc.terkait.map(code => (
                        <span key={code} className="bg-slate-100 dark:bg-slate-900 text-[#1D4ED8] px-1.5 py-0.5 rounded border border-[#1D4ED8]/10 cursor-pointer hover:underline flex items-center gap-0.5">
                          {code} <ExternalLink className="h-2 w-2" />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
