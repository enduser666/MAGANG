'use client';

import React, { useState, useEffect } from 'react';
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
  status: string;
  progress: number;
  updatedAt: string;
  jenisPemeriksaan?: string;
  nomorTemuan?: string;
  temuan?: string;
  rekomendasi?: string;
  diusulkanSesuai?: number;
  diusulkanTptd?: number;
  judulLhp?: string;
}


export default function MonitoringRekomendasiBpk() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [kpi, setKpi] = useState({ total: 0, statusDist: {} as Record<string, number> });
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedJenis, setSelectedJenis] = useState('');

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [userSession, setUserSession] = useState<any>(null);
  const [dbUnits, setDbUnits] = useState<any[]>([]);

  // 1. Init Auth and Units
  useEffect(() => {
    const initAuth = async () => {
      try {
        const [authRes, unitsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/units')
        ]);
        const authData = await authRes.json();
        const unitsData = await unitsRes.json();

        if (unitsData.success) {
          setDbUnits(unitsData.data);
        }

        if (authData.success) {
          setUserSession(authData.data);
          if (authData.data.accessScope === 'OWN_UNIT' && authData.data.unitId) {
            setSelectedUnit(String(authData.data.unitId));
          } else {
            setSelectedUnit('all');
          }
        } else {
          setSelectedUnit('all');
        }
      } catch (e) {
        console.error('Failed to init auth', e);
        setSelectedUnit('all');
      }
    };
    initAuth();
  }, []);

  // 2. Fetch Data
  useEffect(() => {
    if (!selectedUnit) return; // Wait for auth initialization

    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const unitParam = selectedUnit !== 'all' ? `&unit_id=${selectedUnit}` : '';
        const [tblRes, anlRes] = await Promise.all([
          fetch(`/api/tables/rekomendasi?limit=1000${unitParam}`),
          fetch(`/api/dashboard/analytics?tableName=rekomendasi${unitParam}`)
        ]);

        const tbl = await tblRes.json();
        const anl = await anlRes.json();

        if (tbl.success) {
          const mapping = tbl.meta?.metadata?.columnMapping || tbl.metadata?.columnMapping || {};
          const getCol = (key: string) => mapping[key]?.column || '';
          
          const rawRows = Array.isArray(tbl.data) ? tbl.data : (tbl.data?.rows || tbl.meta?.rows || []);
          const mapped = rawRows.map((r: any, i: number) => {
            const stat = r[getCol('status')] || r.status_rekomendasi || r.status || 'Belum Dimulai';
            return {
              id: r.id || `REC-${i}`,
              nomorRekomendasi: r[getCol('recommendation')] || r.kode_rek || r.no__rek || r.nomor_rekomendasi || `REC-${i}`,
              nomorLhp: r[getCol('lhp')] || r.no__lhp || r.kode_lhp || r.nomor_lhp || '-',
              tahunAudit: r.tahun_audit || r[getCol('period')] || (r.lhp ? new Date(r.lhp).getFullYear() : null) || (r.periode_pembahasan_terakhir ? new Date(r.periode_pembahasan_terakhir).getFullYear() : new Date().getFullYear()),
              unitKerja: r[getCol('unit')] || r.uic_pusat || r.uic_k_l || r.unit_kerja || 'Unknown',
              kategori: r[getCol('finding_type')] || r.jenis_pemeriksaan || 'Unknown',
              deskripsi: r.rekomendasi || r.deskripsi || r.judul_rekomendasi || r[getCol('recommendation')] || '-',
              pic: r.uic_ue_ii || r.pic || r.pic_rekomendasi || 'Belum Ditentukan',
              due_date: r.due_date || r.target_selesai || r.periode_pembahasan_terakhir || '-',
              status: stat,
              progress: r.progress || (stat === 'Selesai' || stat === 'Sesuai' ? 100 : 0),
              jenisPemeriksaan: r.jenis_pemeriksaan || r[getCol('jenis_pemeriksaan')] || r[getCol('jenis')],
              nomorTemuan: r[getCol('finding')] || r.no__temuan || r.kode_temuan || r.nomor_temuan || r.no_temuan || '-',
              temuan: r.temuan || r[getCol('temuan')] || r.judul_temuan,
              rekomendasi: r.rekomendasi || r[getCol('rekomendasi')] || r.deskripsi,
              diusulkanSesuai: r.diusulkan_sesuai ?? r[getCol('diusulkan_sesuai')],
              diusulkanTptd: r.diusulkan_tptd ?? r[getCol('diusulkan_tptd')],
              judulLhp: r.judul_lhp || r.nama_lhp || r.lhp || '-',
            };
          });
          setRecommendations(mapped);
        }

        if (anl.success && anl.data) {
          const d = anl.data;
          setKpi({
            total: d.totalRekomendasi || 0,
            statusDist: d.statusDistribution || {}
          });
        }

      } catch (e) {
        console.error('Failed to fetch Rekomendasi data:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [selectedUnit]);

  // Filtering implementation
  const filteredRecs = recommendations.filter(item => {
    const matchesSearch = 
      String(item.nomorRekomendasi).toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.nomorLhp).toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.deskripsi).toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesUnit = true; // Handled by backend filter
    const matchesYear = selectedYear ? item.tahunAudit === Number(selectedYear) : true;
    const matchesStatus = selectedStatus ? item.status === selectedStatus : true;
    const matchesJenis = selectedJenis ? item.jenisPemeriksaan === selectedJenis : true;
    
    return matchesSearch && matchesUnit && matchesYear && matchesStatus && matchesJenis;
  });

  // Group by LHP for rendering
  const groupedLhp = filteredRecs.reduce((acc, curr) => {
    if (!acc[curr.nomorLhp]) {
      acc[curr.nomorLhp] = {
        nomorLhp: curr.nomorLhp,
        judulLhp: curr.judulLhp,
        tahunAudit: curr.tahunAudit,
        unitKerja: curr.unitKerja,
        kategori: curr.kategori,
        recommendations: []
      };
    }
    acc[curr.nomorLhp].recommendations.push(curr);
    return acc;
  }, {} as Record<string, { nomorLhp: string, judulLhp?: string, tahunAudit: number, unitKerja: string, kategori: string, recommendations: Recommendation[] }>);

  const lhpList = Object.values(groupedLhp);
  
  // Sort recommendations within each LHP by nomorRekomendasi (numeric sort if possible)
  lhpList.forEach(lhpGroup => {
    lhpGroup.recommendations.sort((a, b) => {
      const aMatch = String(a.nomorRekomendasi).match(/\d+/);
      const bMatch = String(b.nomorRekomendasi).match(/\d+/);
      const aNum = aMatch ? parseInt(aMatch[0], 10) : 9999;
      const bNum = bMatch ? parseInt(bMatch[0], 10) : 9999;
      if (aNum !== bNum) return aNum - bNum;
      return String(a.nomorRekomendasi).localeCompare(String(b.nomorRekomendasi));
    });
  });

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
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
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Rekomendasi */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <FileText className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-extrabold uppercase tracking-wider">Total Rekomendasi</span>
          </div>
          <p className="text-4xl font-black text-slate-900 dark:text-white mt-2">{kpi.total}</p>
        </div>

        {/* Card 2: Rekomendasi Tuntas */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-extrabold uppercase tracking-wider">Rekomendasi Tuntas</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-emerald-600 dark:text-emerald-500">• Sesuai</span>
              <span className="text-slate-900 dark:text-white font-bold">{kpi.statusDist['Sesuai'] || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-teal-600 dark:text-teal-500">• Diusulkan Sesuai</span>
              <span className="text-slate-900 dark:text-white font-bold">{kpi.statusDist['Diusulkan Sesuai'] || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-amber-600 dark:text-amber-500">• TPTD</span>
              <span className="text-slate-900 dark:text-white font-bold">{kpi.statusDist['TPTD'] || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-orange-500 dark:text-orange-400">• Diusulkan TPTD</span>
              <span className="text-slate-900 dark:text-white font-bold">{kpi.statusDist['Diusulkan TPTD'] || 0}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Rekomendasi Dalam Proses */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-500 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Clock className="h-5 w-5" />
            <span className="text-sm font-extrabold uppercase tracking-wider">Rekomendasi Dalam Proses</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-blue-600 dark:text-blue-500">• Dalam Proses</span>
              <span className="text-slate-900 dark:text-white font-bold">{kpi.statusDist['Dalam Proses'] || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-rose-600 dark:text-rose-500">• Belum TL</span>
              <span className="text-slate-900 dark:text-white font-bold">{(kpi.statusDist['Belum TL'] || 0) + (kpi.statusDist['Belum Tindaklanjut'] || 0) + (kpi.statusDist['Belum Tindak Lanjut'] || 0)}</span>
            </div>
          </div>
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

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs w-full lg:w-auto font-semibold">
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
            disabled={userSession?.accessScope === 'OWN_UNIT'}
            className={`px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] ${userSession?.accessScope === 'OWN_UNIT' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
          >
            {userSession?.accessScope !== 'OWN_UNIT' && <option value="all">Semua Eselon I</option>}
            {dbUnits.map(u => (
              <option key={u.id} value={u.id}>
                {userSession?.accessScope === 'OWN_UNIT' && String(u.id) !== selectedUnit ? `🔒 ${u.kode_unit}` : (userSession?.accessScope === 'OWN_UNIT' && String(u.id) === selectedUnit ? `🔒 ${u.kode_unit}` : u.kode_unit)}
              </option>
            ))}
          </select>

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
          >
            <option value="">Semua Tahun Audit</option>
            {Array.from(new Set(recommendations.map(r => r.tahunAudit).filter(Boolean))).sort().reverse().map(y => (
              <option key={String(y)} value={String(y)}>{String(y)}</option>
            ))}
          </select>

          {/* Jenis Pemeriksaan selector */}
          <select
            value={selectedJenis}
            onChange={(e) => setSelectedJenis(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
          >
            <option value="">Semua Jenis Pemeriksaan</option>
            {Array.from(new Set(recommendations.map(r => r.jenisPemeriksaan).filter(Boolean))).map(j => (
              <option key={String(j)} value={String(j)}>{String(j)}</option>
            ))}
          </select>

          {/* Status selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
          >
            <option value="">Semua Status</option>
            {Array.from(new Set(recommendations.map(r => r.status).filter(Boolean))).map(s => (
              <option key={String(s)} value={String(s)}>{String(s)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Recommendations Data Grid */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-350">
            <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3.5 text-left w-1/3">No. LHP</th>
                <th className="px-4 py-3.5 text-left w-1/4">Unit Kerja</th>
                <th className="px-4 py-3.5 text-left w-1/4">Jenis Pemeriksaan</th>
                <th className="px-4 py-3.5 text-left w-1/4">Jumlah Rekomendasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lhpList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-450 italic">
                    Tidak ditemukan LHP yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                lhpList.map((lhpGroup, index) => (
                  <React.Fragment key={`${lhpGroup.nomorLhp}-${index}`}>
                    <tr 
                      onClick={() => toggleRow(lhpGroup.nomorLhp)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 align-middle cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{lhpGroup.nomorLhp}</div>
                        {lhpGroup.judulLhp && lhpGroup.judulLhp !== '-' && (
                          <div className="text-xs text-slate-500 font-medium mt-1 leading-snug max-w-sm">{lhpGroup.judulLhp}</div>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium font-sans block mt-1">Tahun Audit: {lhpGroup.tahunAudit}</span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-350">
                        {lhpGroup.unitKerja}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {lhpGroup.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/20 dark:text-blue-400">
                          {lhpGroup.recommendations.length} Rekomendasi
                        </span>
                      </td>
                    </tr>
                    {expandedRows.has(lhpGroup.nomorLhp) && (
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                        <td colSpan={4} className="p-4 border-b border-slate-100 dark:border-slate-800">
                          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-xs text-slate-700 dark:text-slate-300">
                                <thead className="bg-[#2a4e8a] text-white">
                                  <tr>
                                    <th className="px-3 py-2 text-left border-r border-white/20 font-semibold">No. Temuan</th>
                                    <th className="px-3 py-2 text-left border-r border-white/20 font-semibold w-1/4">Temuan</th>
                                    <th className="px-3 py-2 text-left border-r border-white/20 font-semibold">No. Rek</th>
                                    <th className="px-3 py-2 text-left border-r border-white/20 font-semibold w-1/3">Rekomendasi</th>
                                    <th className="px-3 py-2 text-left border-r border-white/20 font-semibold">Status Rekomendasi</th>
                                    <th className="px-3 py-2 text-center font-semibold">Keterangan</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                                  {lhpGroup.recommendations.map((rec) => {
                                    const isPending = rec.status === 'Dalam Proses' || rec.status === 'Belum TL' || rec.status === 'Belum Tindaklanjut' || rec.status?.toLowerCase().includes('belum');
                                    return (
                                      <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 align-top">
                                        <td className="px-3 py-2 font-mono font-semibold border-r border-slate-200 dark:border-slate-700">{rec.nomorTemuan || '-'}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700">{rec.temuan || '-'}</td>
                                        <td className="px-3 py-2 font-mono font-semibold border-r border-slate-200 dark:border-slate-700">{rec.nomorRekomendasi || '-'}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700">{rec.rekomendasi || rec.deskripsi || '-'}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700">
                                          {rec.status}
                                        </td>
                                        <td className="px-3 py-2 text-center align-middle">
                                          {isPending ? (
                                            <a
                                              href={`/import?id=${rec.id}`}
                                              className="inline-flex items-center justify-center text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline decoration-red-600"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              Input TL
                                            </a>
                                          ) : (
                                            <span className="text-red-600 font-bold">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>



    </div>
  );
}
