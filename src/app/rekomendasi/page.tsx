'use client';

import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  X,
  Loader2
} from 'lucide-react';

interface Recommendation {
  id: string;
  nomorRekomendasi: string;
  nomorLhp: string;
  tahunAudit: number;
  unitKerja: string;
  kategori: string;
  deskripsi: string;
  pic: string;
  due_date: string;
  status: 'Selesai' | 'Dalam Proses' | 'Terlambat' | 'Belum Dimulai';
  progress: number;
  updatedAt: string;
}

const INITIAL_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'REC-001',
    nomorRekomendasi: 'REC-2026-DJP-001',
    nomorLhp: 'LHP-2026-012-DJP',
    tahunAudit: 2026,
    unitKerja: 'DJP',
    kategori: 'Kepatuhan Pajak',
    deskripsi: 'Penyempurnaan sistem pencocokan otomatis data transaksi PPN dalam Core Tax Administration System.',
    pic: 'Rudi Hartono (Pemeriksa Pajak Utama)',
    due_date: '2026-12-15',
    status: 'Dalam Proses',
    progress: 60,
    updatedAt: '2026-06-28'
  },
  {
    id: 'REC-002',
    nomorRekomendasi: 'REC-2026-DJBC-002',
    nomorLhp: 'LHP-2026-045-DJBC',
    tahunAudit: 2026,
    unitKerja: 'DJBC',
    kategori: 'Pabean & Cukai',
    deskripsi: 'Audit kepatuhan fisik container impor jalur merah pada pelabuhan Tanjung Priok untuk meminimalisir under-declaration.',
    pic: 'Dwi Kartika (Kasubdit Penindakan)',
    due_date: '2026-08-30',
    status: 'Dalam Proses',
    progress: 40,
    updatedAt: '2026-06-20'
  },
  {
    id: 'REC-003',
    nomorRekomendasi: 'REC-2025-DJKN-003',
    nomorLhp: 'LHP-2025-098-DJKN',
    tahunAudit: 2025,
    unitKerja: 'DJKN',
    kategori: 'Aset Negara',
    deskripsi: 'Inventarisasi ulang aset BMN (Barang Milik Negara) berupa tanah di Kalimantan Timur yang belum bersertifikat.',
    pic: 'Slamet Riyadi (Analyst Aset Negara)',
    due_date: '2026-06-01',
    status: 'Terlambat',
    progress: 85,
    updatedAt: '2026-06-05'
  },
  {
    id: 'REC-004',
    nomorRekomendasi: 'REC-2025-DJPb-004',
    nomorLhp: 'LHP-2025-110-DJPb',
    tahunAudit: 2025,
    unitKerja: 'DJPb',
    kategori: 'Anggaran Negara',
    deskripsi: 'Penyusunan petunjuk teknis penyaluran dana transfer daerah (TKDD) tahun anggaran berikutnya guna menghindari idle cash.',
    pic: 'Sri Handayani (Direktur Pelaksanaan Anggaran)',
    due_date: '2026-02-28',
    status: 'Selesai',
    progress: 100,
    updatedAt: '2026-02-25'
  },
  {
    id: 'REC-006',
    nomorRekomendasi: 'REC-2026-Setjen-005',
    nomorLhp: 'LHP-2026-002-SETJEN',
    tahunAudit: 2026,
    unitKerja: 'Setjen',
    kategori: 'Tata Kelola Internal',
    deskripsi: 'Penerapan modul manajemen risiko IT terintegrasi pada seluruh aplikasi Kemenkeu RI.',
    pic: 'Dian Sastro (Kasubag IT Governance)',
    due_date: '2026-11-20',
    status: 'Belum Dimulai',
    progress: 0,
    updatedAt: '2026-06-15'
  },
  {
    id: 'REC-007',
    nomorRekomendasi: 'REC-2025-Itjen-006',
    nomorLhp: 'LHP-2025-055-ITJEN',
    tahunAudit: 2025,
    unitKerja: 'Itjen',
    kategori: 'Audit Internal',
    deskripsi: 'Penyusunan kurikulum sertifikasi bagi APIP (Aparat Pengawasan Intern Pemerintah) tingkat madya.',
    pic: 'Anton Wibowo (Auditor Madya)',
    due_date: '2025-12-31',
    status: 'Selesai',
    progress: 100,
    updatedAt: '2025-12-28'
  }
];

export default function MonitoringRekomendasiBpk() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>(INITIAL_RECOMMENDATIONS);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentRec, setCurrentRec] = useState<Partial<Recommendation>>({});
  const [formLoading, setFormLoading] = useState(false);

  // Filter lists options
  const units = ['DJP', 'DJBC', 'DJKN', 'DJPb', 'Itjen', 'Setjen', 'BPPK'];
  const years = [2026, 2025, 2024];

  // Filtering implementation
  const filteredRecs = recommendations.filter(item => {
    const matchesSearch = 
      item.nomorRekomendasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nomorLhp.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.deskripsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pic.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesUnit = selectedUnit ? item.unitKerja === selectedUnit : true;
    const matchesYear = selectedYear ? item.tahunAudit === Number(selectedYear) : true;
    const matchesStatus = selectedStatus ? item.status === selectedStatus : true;
    
    return matchesSearch && matchesUnit && matchesYear && matchesStatus;
  });

  // Calculate dynamic KPIs
  const totalCount = filteredRecs.length;
  const completedCount = filteredRecs.filter(r => r.status === 'Selesai').length;
  const inProgressCount = filteredRecs.filter(r => r.status === 'Dalam Proses').length;
  const overdueCount = filteredRecs.filter(r => r.status === 'Terlambat').length;
  const notStartedCount = filteredRecs.filter(r => r.status === 'Belum Dimulai').length;

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setCurrentRec({
      nomorRekomendasi: `REC-${new Date().getFullYear()}-DJP-00${recommendations.length + 1}`,
      nomorLhp: 'LHP-2026-000-DJP',
      tahunAudit: new Date().getFullYear(),
      unitKerja: 'DJP',
      kategori: 'Kepatuhan Pajak',
      deskripsi: '',
      pic: '',
      due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days default
      status: 'Belum Dimulai',
      progress: 0,
      updatedAt: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec: Recommendation) => {
    setIsEditMode(true);
    setCurrentRec({ ...rec });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus rekomendasi BPK ini?')) return;
    setRecommendations(recommendations.filter(r => r.id !== id));
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    setTimeout(() => {
      let progressVal = Number(currentRec.progress || 0);
      let statusVal = currentRec.status || 'Belum Dimulai';

      if (progressVal >= 100) {
        progressVal = 100;
        statusVal = 'Selesai';
      } else if (progressVal > 0 && statusVal === 'Belum Dimulai') {
        statusVal = 'Dalam Proses';
      } else if (progressVal === 0) {
        statusVal = 'Belum Dimulai';
      }

      const validatedRec = {
        ...currentRec,
        progress: progressVal,
        status: statusVal,
        updatedAt: new Date().toISOString().split('T')[0]
      } as Recommendation;

      if (isEditMode) {
        setRecommendations(recommendations.map(r => r.id === currentRec.id ? validatedRec : r));
      } else {
        const newId = `REC-${String(recommendations.length + 1).padStart(3, '0')}`;
        setRecommendations([...recommendations, { ...validatedRec, id: newId }]);
      }
      
      setFormLoading(false);
      setIsModalOpen(false);
    }, 500);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-[#1D4ED8]" /> Monitoring Rekomendasi BPK
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola dan petakan rekomendasi hasil audit Badan Pemeriksa Keuangan (BPK) sebelum didistribusikan untuk tindak lanjut.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-sm md:self-center"
        >
          <Plus className="h-4 w-4" /> Tambah Rekomendasi
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Recommendations */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Rekomendasi</span>
            <FileText className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</p>
          <span className="text-[9px] text-slate-400 font-bold block mt-1">Temuan Audit Terdaftar</span>
        </div>

        {/* Completed */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Selesai</span>
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{completedCount}</p>
          <span className="text-[9px] text-emerald-600 font-bold block mt-1">Tuntas Ditindaklanjuti</span>
        </div>

        {/* In Progress */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Dalam Proses</span>
            <Clock className="h-4.5 w-4.5 text-blue-500 animate-pulse" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{inProgressCount}</p>
          <span className="text-[9px] text-blue-600 font-bold block mt-1">Tahap Pemenuhan TLHP</span>
        </div>

        {/* Overdue */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Terlambat</span>
            <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{overdueCount}</p>
          <span className="text-[9px] text-rose-600 font-bold block mt-1">Melebihi Batas Waktu</span>
        </div>

        {/* Not Started */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Belum Dimulai</span>
            <Clock className="h-4.5 w-4.5 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{notStartedCount}</p>
          <span className="text-[9px] text-slate-400 font-bold block mt-1">Belum Teralokasi</span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4.5 w-4.5 text-[#1D4ED8]" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-350">
            Penyaringan Data Rekomendasi
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs w-full lg:w-auto font-semibold">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari rekomendasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-full focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
            />
          </div>

          {/* Unit selector */}
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
          >
            <option value="">Semua Eselon I</option>
            {units.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
          >
            <option value="">Semua Tahun Audit</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Status selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
          >
            <option value="">Semua Status</option>
            <option value="Belum Dimulai">Belum Dimulai</option>
            <option value="Dalam Proses">Dalam Proses</option>
            <option value="Terlambat">Terlambat</option>
            <option value="Selesai">Selesai</option>
          </select>
        </div>
      </div>

      {/* Recommendations Data Grid */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-350">
            <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3.5 text-left w-36">No. Rekomendasi</th>
                <th className="px-4 py-3.5 text-left w-32">No. LHP (Tahun)</th>
                <th className="px-4 py-3.5 text-left w-20">Unit Kerja</th>
                <th className="px-4 py-3.5 text-left">Deskripsi Rekomendasi</th>
                <th className="px-4 py-3.5 text-left w-36">PIC</th>
                <th className="px-4 py-3.5 text-center w-24">Status</th>
                <th className="px-4 py-3.5 text-center w-24">Progress</th>
                <th className="px-4 py-3.5 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRecs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-450 italic">
                    Tidak ditemukan rekomendasi BPK yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredRecs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 align-top">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {item.nomorRekomendasi}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{item.nomorLhp}</div>
                      <span className="text-[10px] text-slate-400 font-medium font-sans">Tahun Audit: {item.tahunAudit}</span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-350">
                      {item.unitKerja}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 text-[10px] uppercase block mb-1">
                        {item.kategori}
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium line-clamp-3" title={item.deskripsi}>
                        {item.deskripsi}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-[#1D4ED8] shrink-0" />
                        <span className="truncate max-w-[120px]">{item.pic}</span>
                      </div>
                      <span className="text-[9.5px] text-slate-400 block mt-1">Due: {item.due_date}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold border ${
                        item.status === 'Selesai'
                          ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-500/10'
                          : item.status === 'Dalam Proses'
                          ? 'bg-blue-100 text-blue-850 dark:bg-blue-950/20 dark:text-blue-400 border-blue-500/10'
                          : item.status === 'Terlambat'
                          ? 'bg-red-100 text-red-850 dark:bg-red-950/20 dark:text-red-400 border-red-500/10 animate-pulse'
                          : 'bg-slate-100 text-slate-650 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
                          <div className={`h-full rounded-full ${
                            item.status === 'Selesai' ? 'bg-emerald-500' :
                            item.status === 'Terlambat' ? 'bg-rose-500' : 'bg-blue-500'
                          }`} style={{ width: `${item.progress}%` }} />
                        </div>
                        <span className="font-bold shrink-0 text-[10px]">{item.progress}%</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-1">Updated: {item.updatedAt}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                          title="Ubah Rekomendasi"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Hapus Rekomendasi"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Recommendation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="h-4.5 w-4.5 text-[#1D4ED8]" />
                {isEditMode ? `Ubah Rekomendasi (ID: ${currentRec.id})` : 'Tambah Rekomendasi BPK Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveForm} className="overflow-y-auto flex-1 p-6 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Recommendation Number */}
                <div className="space-y-1.5">
                  <label className="text-slate-550 dark:text-slate-400">Nomor Rekomendasi BPK *</label>
                  <input
                    type="text"
                    required
                    value={currentRec.nomorRekomendasi || ''}
                    onChange={(e) => setCurrentRec({ ...currentRec, nomorRekomendasi: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                {/* Audit Report Number */}
                <div className="space-y-1.5">
                  <label className="text-slate-550 dark:text-slate-400">Nomor LHP (Audit Report) *</label>
                  <input
                    type="text"
                    required
                    value={currentRec.nomorLhp || ''}
                    onChange={(e) => setCurrentRec({ ...currentRec, nomorLhp: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                {/* Audit Year */}
                <div className="space-y-1.5">
                  <label className="text-slate-550 dark:text-slate-400">Tahun Audit (LHP) *</label>
                  <input
                    type="number"
                    required
                    value={currentRec.tahunAudit || 2026}
                    onChange={(e) => setCurrentRec({ ...currentRec, tahunAudit: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                {/* Unit Kerja */}
                <div className="space-y-1.5">
                  <label className="text-slate-550 dark:text-slate-400">Unit Kerja Pelaksana *</label>
                  <select
                    value={currentRec.unitKerja || 'DJP'}
                    onChange={(e) => setCurrentRec({ ...currentRec, unitKerja: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-slate-550 dark:text-slate-400">Kategori Rekomendasi *</label>
                  <input
                    type="text"
                    required
                    value={currentRec.kategori || ''}
                    onChange={(e) => setCurrentRec({ ...currentRec, kategori: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Contoh: Kepatuhan Pajak"
                  />
                </div>

                {/* Responsible Officer (PIC) */}
                <div className="space-y-1.5">
                  <label className="text-slate-550 dark:text-slate-400">Penanggung Jawab (PIC) *</label>
                  <input
                    type="text"
                    required
                    value={currentRec.pic || ''}
                    onChange={(e) => setCurrentRec({ ...currentRec, pic: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Nama Pegawai & Jabatan"
                  />
                </div>

                {/* Due date */}
                <div className="space-y-1.5">
                  <label className="text-slate-550 dark:text-slate-400">Tenggat Waktu (Due Date) *</label>
                  <input
                    type="date"
                    required
                    value={currentRec.due_date || ''}
                    onChange={(e) => setCurrentRec({ ...currentRec, due_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                {/* Completion Progress Percentage */}
                <div className="space-y-1.5">
                  <label className="text-slate-550 dark:text-slate-400">Persentase Penyelesaian (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={currentRec.progress || 0}
                    onChange={(e) => setCurrentRec({ ...currentRec, progress: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-550 dark:text-slate-400">Deskripsi Rekomendasi BPK *</label>
                  <textarea
                    rows={4}
                    required
                    value={currentRec.deskripsi || ''}
                    onChange={(e) => setCurrentRec({ ...currentRec, deskripsi: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="Tuliskan tindakan korektif yang direkomendasikan BPK..."
                  />
                </div>
              </div>

              {/* Form submit actions */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Simpan Rekomendasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
