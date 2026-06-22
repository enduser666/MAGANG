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
  History,
  Sun,
  Moon,
  DatabaseZap,
  Menu,
  X,
  RefreshCw,
  Link as LinkIcon,
  Link2Off,
  AlertTriangle,
  LogOut,
  User as UserIcon
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
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setUser(data.user);
          }
        }
      } catch (e) {
        console.error('Failed to fetch user session:', e);
      }
    };
    fetchUser();
  }, [pathname]);

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
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Data Import', href: '/import', icon: UploadCloud },
    { name: 'DB Migration', href: '/migrate', icon: Database },
    { name: 'Data Explorer', href: '/explorer', icon: Table },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Data Quality', href: '/quality', icon: ShieldCheck },
  ];

  const getStatusBadge = () => {
    if (dbType === 'sandbox') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse"></span>
          Sandbox Mode (Demo)
        </span>
      );
    }

    switch (connectionStatus) {
      case 'testing':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <RefreshCw className="h-3 w-3 animate-spin text-amber-500" />
            Connecting...
          </span>
        );
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-850">
            <LinkIcon className="h-3 w-3 text-emerald-500" />
            MySQL Active ({dbConfig?.database})
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800" title={connectionMessage}>
            <Link2Off className="h-3 w-3 text-rose-500" />
            MySQL Disconnected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-900 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
            <AlertTriangle className="h-3 w-3 text-slate-500" />
            Setup Required
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-card">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          {/* Logo Title */}
          <div className="flex items-center flex-shrink-0 px-4 gap-2 mb-6">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
              <DatabaseZap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-none text-foreground">Migrator Pro</h1>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Data Dashboard</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-4 w-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Info & Logout */}
          {user && (
            <div className="px-3 pb-3 border-t border-border pt-4 mt-auto">
              <div className="flex items-center gap-2.5 p-2 bg-muted/30 rounded-lg border border-border/50">
                <div className="p-1.5 bg-primary/10 text-primary rounded-full">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="truncate flex-1">
                  <div className="font-bold text-xs text-foreground truncate">{user.username}</div>
                  <span className="text-[9px] uppercase font-bold text-primary tracking-wider">{user.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Footer inside sidebar */}
          <div className="px-4 pb-4 border-t border-border pt-4">
            <div className="flex flex-col gap-1.5 text-[10px] text-muted-foreground bg-muted/50 rounded-lg p-2.5">
              <div className="font-semibold text-foreground">Target Database:</div>
              <div className="truncate font-mono text-[9px]" title={dbConfig?.host || 'local'}>
                {dbType === 'mysql' ? `${dbConfig?.host}:${dbConfig?.port}` : 'sandbox_db.json'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="md:pl-64 flex flex-col flex-1 w-full min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-40 flex h-16 w-full flex-shrink-0 items-center justify-between border-b border-border bg-card/85 backdrop-blur px-4 sm:px-6">
          {/* Mobile hamburger menu */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted focus:outline-none"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Title Area */}
          <div className="hidden sm:block">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              {navigation.find((n) => n.href === pathname)?.name || 'Data Migration Platform'}
            </h2>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-4 ml-auto sm:ml-0">
            {/* Database status badge */}
            {getStatusBadge()}

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Dark scrim */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer sheet */}
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-card pt-5 pb-4 border-r border-border">
            {/* Close Button */}
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="flex items-center flex-shrink-0 px-4 gap-2 mb-6">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                <DatabaseZap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-bold text-base leading-none text-foreground">Migrator Pro</h1>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Data Dashboard</span>
              </div>
            </div>

            <nav className="flex-grow px-3 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            
            {/* User Profile Info & Logout */}
            {user && (
              <div className="px-3 pb-3 border-t border-border pt-4 mt-auto">
                <div className="flex items-center gap-2.5 p-2 bg-muted/30 rounded-lg border border-border/50">
                  <div className="p-1.5 bg-primary/10 text-primary rounded-full">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div className="truncate flex-1">
                    <div className="font-bold text-xs text-foreground truncate">{user.username}</div>
                    <span className="text-[9px] uppercase font-bold text-primary tracking-wider">{user.role}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 rounded-lg transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="px-4 pb-4 border-t border-border pt-4">
              <div className="flex flex-col gap-1.5 text-[10px] text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                <div className="font-semibold text-foreground">Target Database:</div>
                <div className="truncate font-mono text-[9px]">
                  {dbType === 'mysql' ? `${dbConfig?.host}:${dbConfig?.port}` : 'sandbox_db.json'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
