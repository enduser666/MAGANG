'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useDb } from '@/providers/DbContext';
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
  ChevronDown,
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
  FileCheck,
  Brain
} from 'lucide-react';

interface LayoutShellProps {
  children: React.ReactNode;
}

export const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { dbType, connectionStatus, connectionMessage, dbConfig, getHeaders } = useDb();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<{ 
    username: string; 
    role: string; 
    avatarUrl?: string; 
    fullName?: string; 
    permissions?: Record<string, boolean>;
  } | null>(null);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const headers = getHeaders();
        const res = await fetch('/api/auth/me', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setUser(data.data || data.user);
          } else {
            // Force logout to clear cookie if session is invalid for current DB
            if (pathname !== '/login') {
              await fetch('/api/auth/logout', { method: 'POST' });
              setUser(null);
              router.push('/login');
            }
          }
        } else {
          if (pathname !== '/login') {
            await fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);
            router.push('/login');
          }
        }
      } catch (e) {
        console.error('Failed to fetch user session:', e);
      }
    };
    fetchUser();
  }, [pathname, router, getHeaders]);

  const fetchNotifications = useCallback(async () => {
    try {
      const headers = getHeaders();
      const res = await fetch('/api/notifications', { headers });
      const resData = await res.json();
      if (resData.success) {
        setNotifications(resData.data || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [getHeaders]);

  const fetchActivities = useCallback(async () => {
    try {
      const headers = getHeaders();
      const res = await fetch('/api/activity?limit=30', { headers });
      const resData = await res.json();
      if (resData.success) {
        setActivities(resData.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch activity logs:', e);
    }
  }, [getHeaders]);

  const fetchNavigation = useCallback(async () => {
    try {
      const headers = getHeaders();
      const res = await fetch('/api/workbooks/navigation', { headers });
      const resData = await res.json();
      if (resData.success) {
        setWorkspaces(resData.data?.workspaces || []);
      }
    } catch (err) {
      console.error('Failed to load navigation structure:', err);
    }
  }, [getHeaders]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        setUser(null);
        router.replace('/login');
      } else {
        console.error('Logout failed');
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setIsLoggingOut(false);
      setLogoutModalOpen(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const storedSidebar = localStorage.getItem('sidata_sidebar_collapsed');
    if (storedSidebar === 'true') {
      setSidebarCollapsed(true);
    }
    if (user) {
      fetchNotifications();
      fetchActivities();
      fetchNavigation();
    }
  }, [user, dbType, connectionStatus, pathname, dbConfig, fetchNotifications, fetchActivities, fetchNavigation]);

  // Mark all unread notifications as read when opening notifications menu
  const handleOpenNotifications = async () => {
    const isOpening = !notificationsOpen;
    setNotificationsOpen(isOpening);
    
    if (isOpening) {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      if (unreadIds.length > 0) {
        try {
          const headers = getHeaders();
          await fetch('/api/notifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ notificationIds: unreadIds })
          });
          // Optimistically update notifications to read
          setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, isRead: true } : n));
        } catch (e) {
          console.error('Failed to mark notifications read:', e);
        }
      }
    }
  };

  const handleOpenActivity = () => {
    const isOpening = !activityOpen;
    setActivityOpen(isOpening);
    if (isOpening) {
      fetchActivities();
    }
  };

  type NavigationGroup = {
    id: string;
    label: string;
    icon: any;
    href?: string;
    perm?: string;
    roles?: string[];
    children?: { name: string; href: string; icon: any; perm?: string; roles?: string[] }[];
  };

  const navigationGroups: NavigationGroup[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
    {
      id: 'monitoring-tl',
      label: 'Monitoring TL',
      icon: Activity,
      children: [
        { name: 'Monitoring Rekomendasi BPK', href: '/rekomendasi', icon: FileCheck },
        // { name: 'Monitoring TLHP', href: '/tlhp', icon: ClipboardCheck }, // Diarsipkan sementara (sewaktu-waktu bisa ditampilkan lagi)
      ]
    },
    {
      id: 'input-data',
      label: 'Input Data',
      icon: Database,
      children: [
        { name: 'Integrasi Data', href: '/import', icon: UploadCloud, roles: ['ADMIN_PUSAT'] },
        { name: 'Update TL', href: '/reports', icon: FileText, roles: ['ADMIN_PUSAT', 'EDITOR_UNIT'] },
        { name: 'Update Data', href: '/data-pemantauan', icon: Database, roles: ['ADMIN_PUSAT', 'ADMIN_UNIT', 'EDITOR_UNIT'] },
      ]
    },
    {
      id: 'analisis-tl',
      label: 'Analisis TL',
      icon: BarChart3,
      children: [
        { name: 'Monitoring & Analisis', href: '/monitoring-analisis', icon: BarChart3 },
        { name: 'IKU', href: '/iku', icon: Target },
        { name: 'Early Warning System', href: '/ews', icon: AlertOctagon },
        { name: 'Asisten AI SIDATA', href: '/assistant', icon: Brain },
      ]
    },
    {
      id: 'administrasi',
      label: 'Administrasi',
      icon: SettingsIcon,
      children: [
        { name: 'Data Governance', href: '/data-governance', icon: ShieldCheck, roles: ['ADMIN_PUSAT'] },
        { name: 'Log Audit', href: '/audit', icon: History, roles: ['ADMIN_PUSAT'] },
        { name: 'Manajemen Pengguna', href: '/users', icon: Users, roles: ['ADMIN_PUSAT'] },
        { name: 'Manajemen Dataset', href: '/datasets', icon: Database, roles: ['ADMIN_PUSAT'] },
        { name: 'Profile', href: '/settings', icon: UserIcon },
      ]
    }
  ];

  const visibleNavigationGroups = navigationGroups.map(group => {
    if (!group.children) return group;
    const filteredChildren = group.children.filter(child => {
      if (child.roles) return child.roles.includes(user?.role || '');
      if (child.perm) {
        if (Array.isArray(user?.permissions)) {
          return user.permissions.includes(child.perm);
        }
        return !!user?.permissions?.[child.perm];
      }
      return true;
    });
    return { ...group, children: filteredChildren };
  }).filter(group => {
    if (group.perm) {
      if (Array.isArray(user?.permissions)) {
        if (!user.permissions.includes(group.perm)) return false;
      } else {
        if (!user?.permissions?.[group.perm]) return false;
      }
    }
    if (group.children && group.children.length === 0) return false;
    return true;
  });

  useEffect(() => {
    let activeId: string | null = null;
    for (const group of navigationGroups) {
      if (group.children?.some(child => pathname === child.href || pathname.startsWith(child.href + '/'))) {
        activeId = group.id;
        break;
      }
    }
    setExpandedGroup(activeId);
  }, [pathname]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroup(prev => prev === groupId ? null : groupId);
  };

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
        else if (part === 'data-governance') name = 'Data Governance';
        else if (part === 'datasets') name = 'Manajemen Dataset';
        else if (part === 'reports') name = 'Laporan Pengawasan';
        else if (part === 'users') name = 'Manajemen Pengguna';
        else if (part === 'audit') name = 'Log Audit Pengawasan';
        else if (part === 'settings') name = 'Profile';
        else if (part === 'assistant') name = 'Asisten AI SIDATA';
        else if (part === 'tlhp') name = 'Monitoring TLHP';
        else if (part === 'rekomendasi') name = 'Monitoring Rekomendasi BPK';
        else if (part === 'data-pemantauan') name = 'Update Data';
        else if (part === 'monitoring-analisis') name = 'Monitoring & Analisis';
        else if (part === 'ews') name = 'Early Warning System';
        else if (part === 'iku') name = 'IKU';
        
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
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          {visibleNavigationGroups.map((group) => {
            const isExpanded = expandedGroup === group.id;
            const Icon = group.icon;
            
            if (group.href) {
              const isActive = pathname === group.href;
              return (
                <Link
                  key={group.id}
                  href={group.href}
                  className={`group flex items-center px-3 py-2 text-sm font-semibold rounded-md transition-all duration-150 ${
                    isActive
                      ? 'bg-[#1D4ED8] text-white shadow-sm shadow-[#1D4ED8]/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={sidebarCollapsed ? group.label : undefined}
                >
                  <Icon
                    className={`h-4.5 w-4.5 flex-shrink-0 transition-transform ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white group-hover:scale-105'
                    } ${sidebarCollapsed ? 'mr-0' : 'mr-3'}`}
                  />
                  {!sidebarCollapsed && <span>{group.label}</span>}
                </Link>
              );
            }

            const hasActiveChild = group.children?.some(c => pathname === c.href || pathname.startsWith(c.href + '/'));

            return (
              <div key={group.id} className="space-y-0.5">
                <button
                  onClick={() => {
                    if (sidebarCollapsed) {
                      setSidebarCollapsed(false);
                      if (!isExpanded) toggleGroup(group.id);
                    } else {
                      toggleGroup(group.id);
                    }
                  }}
                  className={`w-full group flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-md transition-all duration-150 ${
                    hasActiveChild && !isExpanded && sidebarCollapsed
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={sidebarCollapsed ? group.label : undefined}
                >
                  <div className="flex items-center">
                    <Icon
                      className={`h-4.5 w-4.5 flex-shrink-0 transition-transform ${
                        hasActiveChild && sidebarCollapsed ? 'text-white' : 'text-slate-400 group-hover:text-white group-hover:scale-105'
                      } ${sidebarCollapsed ? 'mr-0' : 'mr-3'}`}
                    />
                    {!sidebarCollapsed && <span>{group.label}</span>}
                  </div>
                  {!sidebarCollapsed && (
                    isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {isExpanded && !sidebarCollapsed && group.children && (
                  <div className="mt-1 space-y-0.5">
                    {group.children.map((child) => {
                      const isActive = pathname === child.href;
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={`group flex items-center pl-10 pr-3 py-2 text-xs font-semibold rounded-md transition-all duration-150 ${
                            isActive
                              ? 'bg-[#1D4ED8] text-white shadow-sm shadow-[#1D4ED8]/30'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <ChildIcon className={`h-4 w-4 mr-2 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                          <span>{child.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Dynamic Workspaces & Datasets */}
          {!sidebarCollapsed && workspaces.length > 0 && (
            <div className="pt-4 mt-4 border-t border-slate-800 space-y-3">
              {workspaces.map((ws) => (
                <div key={ws.id} className="space-y-1">
                  <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {ws.name}
                  </span>
                  <div className="space-y-0.5">
                    {ws.datasets.map((ds: any) => {
                      const href = `/workbooks/${ws.id}/${ds.id}`;
                      const isActive = pathname === href || pathname.startsWith(href + '/');
                      return (
                        <Link
                          key={ds.id}
                          href={href}
                          className={`group flex items-center px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-400 hover:bg-slate-850 hover:text-white'
                          }`}
                        >
                          <Table className={`h-3.5 w-3.5 mr-2 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                          <span className="truncate">{ds.displayName}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                onClick={() => setLogoutModalOpen(true)}
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
                onClick={handleOpenNotifications}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative"
                title="Notifikasi"
              >
                <Bell className="h-4 w-4" />
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
                )}
              </button>
              
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-lg py-1 text-xs z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                    <span>Notifikasi Kolaborasi</span>
                    <span className="text-[#1D4ED8] text-[10px] hover:underline cursor-pointer" onClick={() => setNotificationsOpen(false)}>Tutup</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[280px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-slate-400 italic">Tidak ada notifikasi baru.</div>
                    ) : (
                      notifications.map((item) => (
                        <div key={item.id} className={`px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${!item.isRead ? 'bg-blue-500/5 dark:bg-blue-500/10' : ''}`}>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{item.title}</p>
                          <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5">{item.message}</p>
                          <span className="text-[9px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Collaborative Activity Feed toggle button */}
            <button
              onClick={handleOpenActivity}
              className={`p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative ${activityOpen ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
              title="Lini Masa Aktivitas Kolaboratif"
            >
              <Activity className="h-4 w-4" />
            </button>

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
              {!mounted ? <div className="h-4 w-4" /> : theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
                        setLogoutModalOpen(true);
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

            <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
            {visibleNavigationGroups.map((group) => {
              const isActive = pathname === group.href || (group.children && group.children.some(c => pathname === c.href));
              const isExpanded = expandedGroup === group.id;
              const Icon = group.icon;
                
                if (group.href) {
                  const isActive = pathname === group.href;
                  return (
                    <Link
                      key={group.id}
                      href={group.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-2 text-sm font-semibold rounded-md transition-all ${
                        isActive
                          ? 'bg-[#1D4ED8] text-white shadow-sm'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {group.label}
                    </Link>
                  );
                }

                return (
                  <div key={group.id} className="space-y-0.5">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-md transition-all text-slate-400 hover:bg-slate-800 hover:text-white`}
                    >
                      <div className="flex items-center">
                        <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                        <span>{group.label}</span>
                      </div>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>

                    {isExpanded && group.children && (
                      <div className="mt-1 space-y-0.5">
                        {group.children.map((child) => {
                          const isActive = pathname === child.href;
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center pl-10 pr-3 py-2 text-sm font-semibold rounded-md transition-all ${
                                isActive
                                  ? 'bg-[#1D4ED8] text-white shadow-sm'
                                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <ChildIcon className="mr-3 h-4 w-4 flex-shrink-0" />
                              {child.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Dynamic Workspaces & Datasets (Mobile) */}
              {workspaces.length > 0 && (
                <div className="pt-4 mt-4 border-t border-slate-800 space-y-3">
                  {workspaces.map((ws) => (
                    <div key={ws.id} className="space-y-1">
                      <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {ws.name}
                      </span>
                      <div className="space-y-0.5">
                        {ws.datasets.map((ds: any) => {
                          const href = `/workbooks/${ws.id}/${ds.id}`;
                          const isActive = pathname === href || pathname.startsWith(href + '/');
                          return (
                            <Link
                              key={ds.id}
                              href={href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'text-slate-400 hover:bg-slate-850 hover:text-white'
                              }`}
                            >
                              <Table className={`h-3.5 w-3.5 mr-2 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                              <span className="truncate">{ds.displayName}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

      {/* Slide-over Activity Feed Drawer */}
      {activityOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setActivityOpen(false)} />
          
          <div className="relative w-80 sm:w-96 bg-white dark:bg-[#111827] border-l border-slate-200 dark:border-slate-800 h-full flex flex-col p-6 shadow-2xl z-50 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4 mb-4">
              <h3 className="font-extrabold text-slate-850 dark:text-slate-200 text-sm flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-blue-500" />
                Lini Masa Aktivitas Kolaboratif
              </h3>
              <button onClick={() => setActivityOpen(false)} className="text-slate-400 hover:text-slate-650 rounded p-1 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs divide-y divide-slate-100 dark:divide-slate-800">
              {activities.length === 0 ? (
                <p className="text-slate-400 italic text-center py-10">Belum ada aktivitas kolaborasi tercatat.</p>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="relative pl-5 py-3 first:pt-0">
                    <div className="absolute left-0 top-4 h-2 w-2 rounded-full bg-blue-500" />
                    <p className="font-bold text-slate-800 dark:text-slate-200">{act.description}</p>
                    <div className="flex justify-between items-center text-[9.5px] text-slate-450 dark:text-slate-400 mt-1">
                      <span className="font-semibold text-blue-500">@{act.actorUsername}</span>
                      <span>{new Date(act.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {logoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-500 flex items-center justify-center mb-4">
                <LogOut className="h-6 w-6 ml-1" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Keluar dari SIDATA?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Anda akan keluar dari sesi saat ini.
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setLogoutModalOpen(false)}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoggingOut ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    'Logout'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
