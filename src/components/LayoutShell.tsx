'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useDb } from '@/context/DbContext';
import {
  LayoutDashboard,
  UploadCloud,
  Database,
  Table,
  BarChart3,
  ShieldCheck,
  GitBranch,
  Activity,
  FileText,
  Users,
  History,
  MessageSquareCode,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Bell,
  Search,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ClipboardCheck,
  AlertOctagon,
  Briefcase,
  Target,
  BookOpen,
  FileCheck
} from 'lucide-react';

interface LayoutShellProps {
  children: React.ReactNode;
}

export const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { dbType, connectionStatus, connectionMessage, dbConfig } = useDb();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<{ 
    username: string; 
    role: string; 
    avatarUrl?: string; 
    fullName?: string; 
  } | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setUser(data.user);
          } else {
            // Redirect to login if session missing and not on login page
            if (pathname !== '/login') {
              router.push('/login');
            }
          }
        } else {
          if (pathname !== '/login') {
            router.push('/login');
          }
        }
      } catch (e) {
        console.error('Failed to fetch user session:', e);
      }
    };
    fetchUser();
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        router.push('/login');
        router.refresh();
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const navigation = [
    { name: 'Dasbor', href: '/', icon: LayoutDashboard },
    { name: 'Monitoring Rekomendasi BPK', href: '/rekomendasi', icon: FileCheck },
    { name: 'Monitoring TLHP', href: '/tlhp', icon: ClipboardCheck },
    { name: 'Data Pemantauan', href: '/data-pemantauan', icon: Database },
    { name: 'Integrasi Data', href: '/import', icon: UploadCloud },
    { name: 'Monitoring & Analisis', href: '/monitoring-analisis', icon: BarChart3 },
    { name: 'Data Governance', href: '/data-governance', icon: ShieldCheck },
    { name: 'Laporan Pengawasan', href: '/reports', icon: FileText },
    { name: 'Log Audit', href: '/audit', icon: History },
    { name: 'Manajemen Pengguna', href: '/users', icon: Users },
    { name: 'Repositori Regulasi', href: '/regulasi', icon: BookOpen },
    { name: 'Pengaturan', href: '/settings', icon: SettingsIcon },
  ];

  // Helper to translate route to Breadcrumb name
  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(x => x);
    const breadcrumbs = [{ name: 'SIDATA', href: '/' }];
    
    if (parts.length === 0) {
      breadcrumbs.push({ name: 'Executive Overview', href: '/' });
    } else {
      parts.forEach((part, index) => {
        const url = '/' + parts.slice(0, index + 1).join('/');
        let name = part.charAt(0).toUpperCase() + part.slice(1);
        
        // Translate special routes
        if (part === 'import') name = 'Integrasi Data';
        else if (part === 'data-pemantauan') name = 'Data Pemantauan';
        else if (part === 'monitoring-analisis') name = 'Monitoring & Analisis';
        else if (part === 'data-governance') name = 'Data Governance';
        else if (part === 'reports') name = 'Laporan Pengawasan';
        else if (part === 'users') name = 'Manajemen Pengguna';
        else if (part === 'audit') name = 'Log Audit Pengawasan';
        else if (part === 'settings') name = 'Enterprise Settings';
        else if (part === 'rekomendasi') name = 'Monitoring Rekomendasi BPK';
        else if (part === 'tlhp') name = 'Monitoring TLHP';
        else if (part === 'regulasi') name = 'Repositori Regulasi';
        
        breadcrumbs.push({ name, href: url });
      });
    }
    return breadcrumbs;
  };

  const getStatusBadge = () => {
    if (dbType === 'sandbox') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-500/5 dark:text-amber-400 border border-amber-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Sandbox Mode
        </span>
      );
    }

    switch (connectionStatus) {
      case 'testing':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-500/5 dark:text-blue-400 border border-blue-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></span>
            Connecting...
          </span>
        );
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="h-3 w-3 text-emerald-500" />
            PostgreSQL: {dbConfig?.database || 'sidata'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:bg-rose-500/5 dark:text-rose-400 border border-rose-500/20" title={connectionMessage}>
            <AlertTriangle className="h-3 w-3 text-rose-500" />
            Postgres DC
          </span>
        );
    }
  };

  // If on login, do not render layout shell sidebar/nav
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors duration-150">
      
      {/* Desktop Collapsible Sidebar */}
      <aside 
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 bg-[#0F172A] text-slate-200 border-r border-slate-800 transition-all duration-300 z-50 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 bg-[#0B1220]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-9 w-9 relative overflow-hidden bg-white/10 p-1.5 rounded-md flex-shrink-0 flex items-center justify-center">
              <img src="/logo.png" alt="Kemenkeu Logo" className="h-7 w-7 object-contain" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-white leading-none">SIDATA</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">KEMENTERIAN KEUANGAN</span>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-3 py-2 text-sm font-semibold rounded-md transition-all duration-150 ${
                  isActive
                    ? 'bg-[#1D4ED8] text-white shadow-sm shadow-[#1D4ED8]/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon
                  className={`h-4.5 w-4.5 flex-shrink-0 transition-transform ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-white group-hover:scale-105'
                  } ${sidebarCollapsed ? 'mr-0' : 'mr-3'}`}
                />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User profile inside sidebar */}
        {user && !sidebarCollapsed && (
          <div className="p-3 border-t border-slate-800 bg-[#0B1220]/50">
            <div className="flex items-center gap-2.5 p-2 bg-slate-900/50 rounded-lg border border-slate-800">
              {user.avatarUrl ? (
                user.avatarUrl.startsWith('linear-gradient') ? (
                  <div 
                    style={{ background: user.avatarUrl }} 
                    className="h-8 w-8 rounded-full border border-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                  >
                    {(user.fullName || user.username).substring(0, 2).toUpperCase()}
                  </div>
                ) : (
                  <img 
                    src={user.avatarUrl} 
                    alt="Avatar" 
                    className="h-8 w-8 rounded-full object-cover border border-slate-700 shrink-0 shadow-sm"
                  />
                )
              ) : (
                <div className="h-8 w-8 rounded-full bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center font-bold text-xs border border-[#1D4ED8]/30 shrink-0">
                  {(user.fullName || user.username).substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="truncate flex-1 min-w-0">
                <div className="font-bold text-xs text-white truncate">{user.fullName || user.username}</div>
                <span className="text-[9px] uppercase font-extrabold text-[#1D4ED8] tracking-wider leading-none">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 rounded-md transition-colors"
                title="Keluar"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main View Container */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'
        }`}
      >
        {/* Sticky Header Top Navigation */}
        <header className="sticky top-0 z-40 flex h-16 w-full flex-shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-850 bg-white/95 dark:bg-[#111827]/95 backdrop-blur px-4 sm:px-6 shadow-xs">
          
          {/* Left: Mobile menu toggle and Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none dark:hover:bg-slate-800 dark:text-slate-400"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Breadcrumb Navigation display */}
            <nav className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {getBreadcrumbs().map((b, i) => (
                <React.Fragment key={`${b.href}-${i}`}>
                  {i > 0 && <span className="text-slate-300 dark:text-slate-700">/</span>}
                  {i === getBreadcrumbs().length - 1 ? (
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{b.name}</span>
                  ) : (
                    <Link href={b.href} className="hover:text-[#1D4ED8] transition-colors">{b.name}</Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right: Actions bar */}
          <div className="flex items-center gap-3.5">
            {/* Database status badge */}
            {getStatusBadge()}

            {/* Notification bell and menu */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                title="Notifikasi"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
              </button>
              
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-lg py-1 text-xs z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                    <span>Notifikasi Pengawasan</span>
                    <span className="text-[#1D4ED8] text-[10px] hover:underline cursor-pointer" onClick={() => setNotificationsOpen(false)}>Tutup</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <p className="font-semibold text-rose-500">Temuan Risiko Tinggi Meningkat</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">DJP mencatat kenaikan temuan krusial baru.</p>
                      <span className="text-[9px] text-slate-400">10 menit yang lalu</span>
                    </div>
                    <div className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <p className="font-semibold text-emerald-600">Integrasi Data Pajak Sukses</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Tabel 'Tax_Revenue_FY23_Final' berhasil disinkronisasi.</p>
                      <span className="text-[9px] text-slate-400">1 jam yang lalu</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Help Support */}
            <button
              onClick={() => router.push('/assistant')}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Asisten Bantuan"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            {/* Theme switcher */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            
            {/* User Profile Avatar dropdown */}
            {user && (
              <div className="relative border-l border-slate-200 dark:border-slate-800 pl-3">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 text-left cursor-pointer focus:outline-none"
                >
                  {user.avatarUrl ? (
                    user.avatarUrl.startsWith('linear-gradient') ? (
                      <div 
                        style={{ background: user.avatarUrl }} 
                        className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-white text-xs font-bold shadow-sm"
                      >
                        {(user.fullName || user.username).substring(0, 2).toUpperCase()}
                      </div>
                    ) : (
                      <img 
                        src={user.avatarUrl} 
                        alt="Avatar" 
                        className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                      />
                    )
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-[#1D4ED8]/10 text-[#1D4ED8] flex items-center justify-center font-bold text-xs border border-[#1D4ED8]/30">
                      {(user.fullName || user.username).substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden lg:block">
                    <div className="text-xs font-extrabold leading-none text-slate-850 dark:text-slate-200">
                      {user.fullName || user.username}
                    </div>
                    <span className="text-[9px] text-slate-405 dark:text-slate-400 font-bold tracking-tight">{user.role}</span>
                  </div>
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-lg py-1 text-xs z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-350">
                      <p className="font-extrabold truncate">{user.fullName || user.username}</p>
                      <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{user.role}</p>
                    </div>
                    <Link
                      href="/settings?tab=profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-650 dark:text-slate-300 font-bold transition-colors"
                    >
                      <UserIcon className="h-3.5 w-3.5 text-blue-500" /> Edit Profil
                    </Link>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 font-bold text-left transition-colors border-t border-slate-50 dark:border-slate-850 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Keluar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main Page Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-[#0F172A] text-slate-200 border-r border-slate-800 pt-5 pb-4">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white bg-slate-900/60"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="flex items-center flex-shrink-0 px-4 gap-2.5 mb-6 border-b border-slate-800 pb-4">
              <div className="h-10 w-10 relative overflow-hidden bg-white/10 p-1.5 rounded-md flex-shrink-0 flex items-center justify-center">
                <img src="/logo.png" alt="Kemenkeu Logo" className="h-8 w-8 object-contain" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-extrabold text-base leading-none text-white">SIDATA</h1>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">KEMENTERIAN KEUANGAN</span>
              </div>
            </div>

            <nav className="flex-grow px-3 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-semibold rounded-md transition-all ${
                      isActive
                        ? 'bg-[#1D4ED8] text-white shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            
            {user && (
              <div className="px-3 pb-3 border-t border-slate-800 pt-4 mt-auto">
                <div className="flex items-center gap-2.5 p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="p-1.5 bg-[#1D4ED8]/10 text-[#1D4ED8] rounded-full">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div className="truncate flex-1 min-w-0">
                    <div className="font-bold text-xs text-white truncate">{user.username}</div>
                    <span className="text-[9px] uppercase font-extrabold text-[#1D4ED8] tracking-wider">{user.role}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 rounded-md transition-colors"
                    title="Keluar"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
