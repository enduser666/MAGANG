'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { DatabaseZap, Loader2, Lock, User, AlertCircle, Sun, Moon } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Get DB configuration headers from local storage to connect to correct database
      const dbType = localStorage.getItem('db_type') || 'sandbox';
      const dbConfig = localStorage.getItem('db_config');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-db-type': dbType,
      };
      if (dbType === 'mysql' && dbConfig) {
        headers['x-db-config'] = Buffer.from(dbConfig).toString('base64');
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (data.success) {
        // Redirect to dashboard home
        router.push('/');
        router.refresh();
      } else {
        setErrorMsg(data.message || 'Invalid username or password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to contact authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background text-foreground transition-colors duration-200 p-4">
      {/* Theme Toggle Top Right */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Logo/Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="bg-primary text-primary-foreground p-2.5 rounded-xl shadow-lg shadow-primary/20">
            <DatabaseZap className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Migrator Pro</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">Enterprise Dashboard Login</p>
          </div>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold">Sign In</h2>
              <p className="text-xs text-muted-foreground">Access your migration pipelines and audits.</p>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="analyst"
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all disabled:opacity-50 mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In to Platform
            </button>
          </form>

          {/* Registration link */}
          <div className="border-t border-border mt-6 pt-4 text-center text-xs text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Register here
            </Link>
          </div>
        </div>

        {/* Local database provider info */}
        <div className="text-center text-[10px] text-muted-foreground/70">
          Security policy: Credentials will save to whichever database is currently active in localStorage.
        </div>
      </div>
    </div>
  );
}
