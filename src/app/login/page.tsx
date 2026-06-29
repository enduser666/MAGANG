'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDb } from '@/context/DbContext';
import { Lock, Mail, ShieldAlert, KeyRound, Loader2, ArrowRight } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const { getHeaders, dbType, connectionStatus } = useDb();
  
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check session on mount, if valid redirect to home
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          router.push('/');
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const headers = getHeaders();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (data.success) {
        router.push('/');
        router.refresh();
      } else {
        setErrorMsg(data.message || 'Username atau password salah.');
      }
    } catch (err: any) {
      setErrorMsg('Kesalahan server saat mencoba login.');
    } finally {
      setLoading(false);
    }
  };

  const handleSsoClick = () => {
    setLoading(true);
    setErrorMsg('');
    
    // Simulate Ministry SSO Login flow: auto login as 'auditor' role
    setTimeout(async () => {
      try {
        const headers = getHeaders();
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ username: 'auditor', password: 'admin' }) // Use pre-seeded auditor
        });

        const data = await res.json();
        if (data.success) {
          router.push('/');
          router.refresh();
        } else {
          setErrorMsg('Kemenkeu SSO Auth failed.');
        }
      } catch (err: any) {
        setErrorMsg('SSO Server unreachable.');
      } finally {
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] dark:bg-[#0B0F19]">
      
      {/* Left side panel: MoF Branding */}
      <div className="w-full md:w-1/2 bg-[#0F172A] text-slate-200 p-8 sm:p-16 flex flex-col justify-between relative overflow-hidden min-h-[300px] md:min-h-screen">
        {/* Background wave decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent pointer-events-none" />
        
        {/* Top brand metadata */}
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="h-11 w-11 relative overflow-hidden bg-white/10 p-2 rounded-xl flex items-center justify-center shadow-lg">
            <img src="/logo.png" alt="Kemenkeu Logo" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-white leading-none">SIDATA</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sistem Integrasi Data Pengawasan</p>
          </div>
        </div>

        {/* Center message */}
        <div className="my-auto py-12 relative z-10 max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20 mb-4">
            Inspektorat Jenderal Kemenkeu RI
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Centralized Data Governance & Ingestion
          </h2>
          <p className="text-sm text-slate-400 mt-4 leading-relaxed">
            Platform pengawasan internal terintegrasi untuk Kementerian Keuangan Republik Indonesia. Membantu sinkronisasi spreadsheet hasil temuan audit langsung ke database PostgreSQL serta menyajikan analisis dashboard bagi pimpinan.
          </p>
        </div>

        {/* Footer credits */}
        <div className="text-xs text-slate-500 relative z-10 pt-4 border-t border-slate-800">
          Secure Access • Inspektorat Jenderal Kementerian Keuangan Republik Indonesia © 2026
        </div>
      </div>

      {/* Right side panel: Login Forms */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 min-h-[400px]">
        <div className="w-full max-w-md space-y-8 bg-white dark:bg-[#111827] p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md">
          
          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome Back
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Silakan masuk ke akun SIDATA Anda menggunakan kredensial internal.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2.5 animate-bounce">
              <ShieldAlert className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Email / Username</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="name@kemenkeu.go.id"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Password</label>
                <a href="#" className="text-xs text-[#1D4ED8] hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
                />
              </div>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1D4ED8] hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-sm transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          {/* SSO trigger option */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 border-t border-slate-200 dark:border-slate-800" />
            <span className="relative px-3 bg-white dark:bg-[#111827] text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              OR CONTINUE WITH
            </span>
          </div>

          <button
            onClick={handleSsoClick}
            disabled={loading}
            className="w-full border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <svg className="h-4.5 w-4.5 text-[#1D4ED8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Single Sign-On (SSO) Kemenkeu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
