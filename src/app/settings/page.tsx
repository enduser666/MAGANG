'use client';

import React, { useState } from 'react';
import { useDb } from '@/context/DbContext';
import {
  Settings as SettingsIcon,
  Shield,
  Database,
  User,
  Bell,
  Trash2,
  Plus,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
  HelpCircle,
  Eye,
  Key,
  Camera,
  Mail,
  FileText,
  Building,
  Phone,
  Upload,
  X
} from 'lucide-react';

export default function EnterpriseSettings() {
  const { 
    dbType, 
    dbConfig, 
    connectionStatus, 
    connectionMessage, 
    testConnection, 
    initializeSchema, 
    disconnect,
    getHeaders
  } = useDb();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'database' | 'general' | 'users' | 'notifications'>('profile');

  // Security states matching MoF Page 10
  const [twoFactor, setTwoFactor] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [minPasswordLength, setMinPasswordLength] = useState(12);
  const [requireUppercase, setRequireUppercase] = useState(true);
  const [requireNumber, setRequireNumber] = useState(true);
  const [requireSpecialChar, setRequireSpecialChar] = useState(true);
  const [preventReuse, setPreventReuse] = useState(false);

  // IP Whitelist records list
  const [ipWhitelist, setIpWhitelist] = useState<string[]>([
    '192.168.1.0/24',
    '10.0.0.50',
    '203.0.113.0/28'
  ]);
  const [newIp, setNewIp] = useState('');

  // PostgreSQL Connection Configuration form state
  const [dbHost, setDbHost] = useState(dbConfig?.host || 'localhost');
  const [dbPort, setDbPort] = useState(String(dbConfig?.port || '5432'));
  const [dbUser, setDbUser] = useState(dbConfig?.user || 'postgres');
  const [dbPassword, setDbPassword] = useState(dbConfig?.password || '');
  const [dbName, setDbName] = useState(dbConfig?.database || 'sidata');
  const [testing, setTesting] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // Profile States
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [email, setEmail] = useState('');
  const [nip, setNip] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [unitKerja, setUnitKerja] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Load profile on mount
  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const headers = getHeaders();
        const res = await fetch('/api/auth/me', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setFullName(data.user.fullName || '');
            setAvatarUrl(data.user.avatarUrl || '');
            setEmail(data.user.email || '');
            setNip(data.user.nip || '');
            setPhoneNumber(data.user.phoneNumber || '');
            setUnitKerja(data.user.unitKerja || '');
          }
        }
      } catch (e) {
        console.error('Error fetching profile:', e);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [connectionStatus]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'profile' || tab === 'security' || tab === 'database' || tab === 'general' || tab === 'users' || tab === 'notifications') {
        setActiveTab(tab as any);
      }
    }
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file maksimal adalah 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const headers = getHeaders();
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName,
          avatarUrl,
          email,
          nip,
          phoneNumber,
          unitKerja
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Profil Anda berhasil diperbarui!');
        // Refresh page or layout context
        window.location.reload();
      } else {
        alert('Gagal memperbarui profil: ' + data.message);
      }
    } catch (e: any) {
      alert('Terjadi kesalahan: ' + e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const avatarPresets = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&h=120&q=80',
    'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=120&h=120&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80'
  ];

  const gradientPresets = [
    'linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)',
    'linear-gradient(135deg, #2E7D32 0%, #43A047 100%)',
    'linear-gradient(135deg, #C62828 0%, #E53935 100%)',
    'linear-gradient(135deg, #EF6C00 0%, #F57C00 100%)',
    'linear-gradient(135deg, #6A1B9A 0%, #8E24AA 100%)',
    'linear-gradient(135deg, #37474F 0%, #455A64 100%)',
  ];

  const handleAddIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) return;
    setIpWhitelist([...ipWhitelist, newIp.trim()]);
    setNewIp('');
  };

  const handleRemoveIp = (index: number) => {
    setIpWhitelist(ipWhitelist.filter((_, idx) => idx !== index));
  };

  const handleTestPostgres = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    try {
      const res = await testConnection({
        host: dbHost,
        port: Number(dbPort),
        user: dbUser,
        password: dbPassword,
        database: dbName
      });
      alert(res.message);
    } catch (e: any) {
      alert('Koneksi Postgres gagal: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  const handleInitializeSchema = async () => {
    setInitializing(true);
    try {
      const res = await initializeSchema();
      alert(res.message);
    } catch (e: any) {
      alert('Inisialisasi skema gagal: ' + e.message);
    } finally {
      setInitializing(false);
    }
  };

  const handleSaveChanges = () => {
    alert('Pengaturan kebijakan keamanan SIDATA berhasil disimpan!');
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Title section */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Enterprise Settings</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
          Configure platform-wide administrative controls, security policies, and database connections.
        </p>
      </div>

      {/* Tabs list menu */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs font-extrabold pb-0.5">
        {[
          { id: 'profile', label: 'Profil Saya', icon: User },
          { id: 'general', label: 'General', icon: SettingsIcon },
          { id: 'database', label: 'Database', icon: Database },
          { id: 'users', label: 'User Management', icon: Shield },
          { id: 'security', label: 'Security', icon: Key },
          { id: 'notifications', label: 'Notifications', icon: Bell }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold tracking-tight transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#1D4ED8] text-[#1D4ED8]'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic Pane display depending on active tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Left Panel: Profile Picture & Summary */}
          <div className="lg:col-span-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-6 flex flex-col items-center text-center">
            <div className="w-full flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider text-left">
                Foto Profil
              </h3>
            </div>
            
            <div className="relative group cursor-pointer">
              {avatarUrl ? (
                avatarUrl.startsWith('linear-gradient') ? (
                  <div 
                    style={{ background: avatarUrl }} 
                    className="h-28 w-28 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-white text-3xl font-black shadow-md"
                  >
                    {(fullName || 'User').substring(0, 2).toUpperCase()}
                  </div>
                ) : (
                  <img 
                    src={avatarUrl} 
                    alt="Foto Profil" 
                    className="h-28 w-28 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-md"
                  />
                )
              ) : (
                <div className="h-28 w-28 rounded-full bg-slate-100 dark:bg-slate-850 text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-3xl font-bold shadow-md">
                  {(fullName || 'User').substring(0, 2).toUpperCase()}
                </div>
              )}
              
              {/* Overlay edit label */}
              <label className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-5 w-5 mb-1" />
                Ubah Foto
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                />
              </label>
            </div>

            <div className="space-y-1.5 w-full">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {fullName || 'Pegawai Kemenkeu'}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                NIP. {nip || '-'}
              </p>
              <div className="inline-block px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[9px] uppercase tracking-wider mt-1.5">
                {unitKerja || 'Unit Kerja'}
              </div>
            </div>

            {/* Presets Grid */}
            <div className="w-full space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">Pilih Preset Avatar</span>
              
              {/* Presets block */}
              <div className="grid grid-cols-6 gap-2">
                {avatarPresets.map((presetUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(presetUrl)}
                    className={`h-8 w-8 rounded-full overflow-hidden border cursor-pointer hover:scale-105 active:scale-95 transition-all ${
                      avatarUrl === presetUrl ? 'border-[#1D4ED8] ring-1 ring-[#1D4ED8]' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <img src={presetUrl} alt={`Preset ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>

              {/* Gradient Presets block */}
              <div className="grid grid-cols-6 gap-2 pt-1">
                {gradientPresets.map((gradient, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatarUrl(gradient)}
                    className={`h-8 w-8 rounded-full border cursor-pointer hover:scale-105 active:scale-95 transition-all ${
                      avatarUrl === gradient ? 'border-[#1D4ED8] ring-1 ring-[#1D4ED8]' : 'border-transparent'
                    }`}
                    style={{ background: gradient }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Detail Fields */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">
                Detail Profil
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                Perbarui informasi data diri Anda sebagai pegawai Kementerian Keuangan Republik Indonesia.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-slate-650 dark:text-slate-400 block font-bold">Nama Lengkap</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Masukkan nama lengkap"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                    />
                  </div>
                </div>

                {/* NIP */}
                <div className="space-y-1.5">
                  <label className="text-slate-650 dark:text-slate-400 block font-bold">NIP (Nomor Induk Pegawai)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <FileText className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 199508212020011002"
                      value={nip}
                      onChange={(e) => setNip(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-slate-650 dark:text-slate-400 block font-bold">Alamat Email Kemenkeu</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="name@kemenkeu.go.id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-slate-650 dark:text-slate-400 block font-bold">No. Handphone / WhatsApp</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Phone className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Contoh: 08123456789"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                    />
                  </div>
                </div>

                {/* Unit Kerja */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-650 dark:text-slate-400 block font-bold">Unit Kerja Eselon I</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Building className="h-4 w-4" />
                    </span>
                    <select
                      value={unitKerja}
                      onChange={(e) => setUnitKerja(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                    >
                      <option value="">Pilih Unit Kerja</option>
                      <option value="Sekretariat Jenderal">Sekretariat Jenderal (Setjen)</option>
                      <option value="Direktorat Jenderal Pajak">Direktorat Jenderal Pajak (DJP)</option>
                      <option value="Direktorat Jenderal Bea dan Cukai">Direktorat Jenderal Bea dan Cukai (DJBC)</option>
                      <option value="Direktorat Jenderal Perbendaharaan">Direktorat Jenderal Perbendaharaan (DJPb)</option>
                      <option value="Direktorat Jenderal Kekayaan Negara">Direktorat Jenderal Kekayaan Negara (DJKN)</option>
                      <option value="Direktorat Jenderal Perimbangan Keuangan">Direktorat Jenderal Perimbangan Keuangan (DJPK)</option>
                      <option value="Direktorat Jenderal Pengelolaan Pembiayaan dan Risiko">Direktorat Jenderal Pengelolaan Pembiayaan dan Risiko (DJPPR)</option>
                      <option value="Inspektorat Jenderal">Inspektorat Jenderal (Itjen)</option>
                      <option value="Badan Kebijakan Fiskal">Badan Kebijakan Fiskal (BKF)</option>
                      <option value="Badan Pendidikan dan Pelatihan Keuangan">Badan Pendidikan dan Pelatihan Keuangan (BPPK)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Simpan Profil
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Pane display depending on active tab */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Left 2 Columns: Policy Forms (Authentication Policies & Password Complexity) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Authentication Policies (2FA & session timeouts) */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-5">
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Key className="h-4.5 w-4.5 text-[#1D4ED8]" /> Authentication Policies
              </h3>
              
              <div className="flex items-center justify-between py-1 text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Enforce Two-Factor Authentication</span>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Require all administrative users to configure 2FA upon next login.</p>
                </div>
                
                {/* Switch checkbox style */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={twoFactor}
                    onChange={(e) => setTwoFactor(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1D4ED8]"></div>
                </label>
              </div>

              {/* Idle session timeout dropdown */}
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-600 dark:text-slate-400">Idle Session Timeout (Minutes)</label>
                <select
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none w-full sm:w-48"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">60 Minutes</option>
                </select>
                <p className="text-[10px] text-slate-400 font-semibold">Users will be automatically logged out after this duration of inactivity.</p>
              </div>
            </div>

            {/* Password Complexity configuration checklist */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-5">
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-[#1D4ED8]" /> Password Complexity
              </h3>

              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-slate-600 dark:text-slate-400">Minimum Password Length</label>
                <input
                  type="number"
                  min={8}
                  max={32}
                  value={minPasswordLength}
                  onChange={(e) => setMinPasswordLength(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none w-24"
                />
              </div>

              {/* Checkboxes parameters */}
              <div className="space-y-3 text-xs font-semibold">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireUppercase}
                    onChange={(e) => setRequireUppercase(e.target.checked)}
                    className="rounded text-[#1D4ED8] focus:ring-0"
                  />
                  <span>Require at least one uppercase letter</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireNumber}
                    onChange={(e) => setRequireNumber(e.target.checked)}
                    className="rounded text-[#1D4ED8] focus:ring-0"
                  />
                  <span>Require at least one number</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireSpecialChar}
                    onChange={(e) => setRequireSpecialChar(e.target.checked)}
                    className="rounded text-[#1D4ED8] focus:ring-0"
                  />
                  <span>Require at least one special character</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preventReuse}
                    onChange={(e) => setPreventReuse(e.target.checked)}
                    className="rounded text-[#1D4ED8] focus:ring-0"
                  />
                  <span>Prevent reuse of last 5 passwords</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveChanges}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                <Save className="h-4 w-4" /> Save Changes
              </button>
            </div>
          </div>

          {/* Right 1 Column: IP Whitelist List */}
          <div className="lg:col-span-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              IP Whitelist
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Restrict administrative access to specific IP ranges.
            </p>

            {/* Inline add form */}
            <form onSubmit={handleAddIp} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="e.g. 192.168.1.0/24"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#1D4ED8] hover:bg-blue-700 text-white p-2 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>

            {/* IP list table */}
            <div className="border border-slate-100 dark:border-slate-850 rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-850 text-xs">
              {ipWhitelist.map((ip, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50/20 font-mono">
                  <span className="font-semibold text-slate-700 dark:text-slate-350">{ip}</span>
                  <button
                    onClick={() => handleRemoveIp(idx)}
                    className="text-slate-400 hover:text-red-500 rounded p-1 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-6 max-w-2xl animate-fade-in">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-[#1D4ED8]" /> PostgreSQL Connection Configuration
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Status: {dbType === 'postgres' ? 'SQL Active' : 'Sandbox (Demo)'}</p>
          </div>

          <form onSubmit={handleTestPostgres} className="space-y-4 text-xs font-semibold">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Host */}
              <div className="space-y-1.5">
                <label className="text-slate-650 dark:text-slate-400">Database Host</label>
                <input
                  type="text"
                  required
                  value={dbHost}
                  onChange={(e) => setDbHost(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              {/* Port */}
              <div className="space-y-1.5">
                <label className="text-slate-650 dark:text-slate-400">Port</label>
                <input
                  type="number"
                  required
                  value={dbPort}
                  onChange={(e) => setDbPort(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              {/* User */}
              <div className="space-y-1.5">
                <label className="text-slate-650 dark:text-slate-400">Username</label>
                <input
                  type="text"
                  required
                  value={dbUser}
                  onChange={(e) => setDbUser(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-slate-650 dark:text-slate-400">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              {/* Database name */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-slate-650 dark:text-slate-400">Database Name</label>
                <input
                  type="text"
                  required
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-850 pt-4 mt-6">
              
              {dbType === 'postgres' ? (
                <button
                  type="button"
                  onClick={disconnect}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 rounded-lg text-slate-500 font-bold transition-all cursor-pointer"
                >
                  Disconnect Postgres
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-bold">Menggunakan Sandbox fallback lokal.</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={testing}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 text-slate-600 dark:text-slate-300"
                >
                  {testing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Test Connection
                </button>
                
                <button
                  type="button"
                  onClick={handleInitializeSchema}
                  disabled={initializing}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition-colors shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
                >
                  {initializing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Inisialisasi Tabel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4 max-w-xl animate-fade-in text-xs font-semibold">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2.5">
            General Preferences
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-850">
              <span className="text-slate-650 dark:text-slate-400">Language / Bahasa</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">Bahasa Indonesia (Kemenkeu)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-850">
              <span className="text-slate-650 dark:text-slate-400">Timezone</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">Asia/Jakarta (GMT+07:00)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-650 dark:text-slate-400">Version</span>
              <span className="font-bold text-slate-850">v1.2.6 (Production Ready)</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4 max-w-xl animate-fade-in text-xs font-semibold">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2.5">
            User Policies
          </h3>
          <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
            Kebijakan registrasi mandiri pegawai Kemenkeu.
          </p>
          <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-850">
            <div>
              <span className="font-bold text-slate-850">Allow Self Registration</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Pegawai Kemenkeu dapat registrasi mandiri via portal login.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1D4ED8]"></div>
            </label>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4 max-w-xl animate-fade-in text-xs font-semibold">
          <h3 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2.5">
            Notification Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-850">
              <div>
                <span className="font-bold text-slate-850">Email Alert on Critical Findings</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Kirim notifikasi email otomatis jika anomali kritis terdeteksi.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1D4ED8]"></div>
              </label>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
