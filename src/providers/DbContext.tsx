'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface PgConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export type DbType = 'postgres' | 'sandbox';
export type ConnectionStatus = 'disconnected' | 'connected' | 'error' | 'testing';

interface DbContextType {
  dbType: DbType;
  dbConfig: PgConfig | null;
  dbConfigBase64: string | null;
  connectionStatus: ConnectionStatus;
  connectionMessage: string;
  setDbType: (type: DbType) => void;
  updateDbConfig: (config: PgConfig | null) => void;
  testConnection: (config: PgConfig) => Promise<{ success: boolean; message: string }>;
  initializeSchema: () => Promise<{ success: boolean; message: string }>;
  disconnect: () => void;
  getHeaders: () => Record<string, string>;
}

const DbContext = createContext<DbContextType | undefined>(undefined);

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dbType, setDbTypeState] = useState<DbType>('postgres');
  const [dbConfig, setDbConfigState] = useState<PgConfig | null>(null);
  const [dbConfigBase64, setDbConfigBase64] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('testing');
  const [connectionMessage, setConnectionMessage] = useState<string>('Menghubungkan ke database utama...');

  // Load from localStorage on mount
  useEffect(() => {
    const savedType = localStorage.getItem('db_type') as DbType;
    const savedConfig = localStorage.getItem('db_config');

    if (savedType === 'postgres') {
      setDbTypeState(savedType);
    } else {
      setDbTypeState('postgres');
      localStorage.setItem('db_type', 'postgres');
    }
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setDbConfigState(parsed);
        const base64 = Buffer.from(JSON.stringify(parsed)).toString('base64');
        setDbConfigBase64(base64);
        
        if (savedType === 'postgres') {
          // Attempt to test connection silently on load
          setConnectionStatus('testing');
          fetch('/api/db/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dbType: 'postgres', dbConfig: base64 })
          })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                setConnectionStatus('connected');
                setConnectionMessage('Terhubung ke database PostgreSQL.');
              } else {
                setConnectionStatus('error');
                setConnectionMessage(data.message || 'Gagal terhubung ke database PostgreSQL.');
              }
            })
            .catch(() => {
              setConnectionStatus('error');
              setConnectionMessage('Gagal terhubung ke backend API.');
            });
        }
      } catch (e) {
        // Clear corrupt storage
        localStorage.removeItem('db_config');
      }
    }
  }, []);

  const setDbType = (type: DbType) => {
    setDbTypeState(type);
    localStorage.setItem('db_type', type);
    if (type === 'sandbox') {
      setConnectionStatus('disconnected');
      setConnectionMessage('Menggunakan Mode Sandbox Lokal (Kemenkeu).');
    } else if (dbConfigBase64) {
      // Re-evaluate postgres status
      setConnectionStatus('testing');
      fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbType: 'postgres', dbConfig: dbConfigBase64 })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setConnectionStatus('connected');
            setConnectionMessage('Terhubung ke database PostgreSQL.');
          } else {
            setConnectionStatus('error');
            setConnectionMessage(data.message || 'Koneksi gagal.');
          }
        })
        .catch(() => {
          setConnectionStatus('error');
          setConnectionMessage('Kesalahan komunikasi dengan server backend.');
        });
    } else {
      setConnectionStatus('disconnected');
      setConnectionMessage('Konfigurasi kredensial PostgreSQL untuk menghubungkan.');
    }
  };

  const updateDbConfig = (config: PgConfig | null) => {
    setDbConfigState(config);
    if (config) {
      localStorage.setItem('db_config', JSON.stringify(config));
      const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
      setDbConfigBase64(base64);
    } else {
      localStorage.removeItem('db_config');
      setDbConfigBase64(null);
    }
  };

  const testConnection = async (config: PgConfig) => {
    setConnectionStatus('testing');
    setConnectionMessage('Menguji koneksi database...');
    try {
      const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbType: 'postgres', dbConfig: base64 })
      });
      const data = await res.json();
      if (data.success) {
        setConnectionStatus('connected');
        setConnectionMessage('Koneksi ke database PostgreSQL berhasil.');
        updateDbConfig(config);
        setDbTypeState('postgres');
        localStorage.setItem('db_type', 'postgres');
      } else {
        setConnectionStatus('error');
        setConnectionMessage(data.message || 'Koneksi database gagal.');
      }
      return data;
    } catch (e: any) {
      setConnectionStatus('error');
      setConnectionMessage(e.message || 'Terjadi kesalahan sistem.');
      return { success: false, message: e.message || 'Uji koneksi gagal.' };
    }
  };

  const initializeSchema = async () => {
    if (dbType === 'postgres' && !dbConfigBase64) {
      return { success: false, message: 'Konfigurasi PostgreSQL tidak ditemukan.' };
    }
    try {
      const res = await fetch('/api/db/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbType,
          dbConfig: dbConfigBase64,
          action: 'initialize'
        })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Gagal menjalankan inisialisasi skema.' };
    }
  };

  const disconnect = () => {
    setDbTypeState('sandbox');
    localStorage.setItem('db_type', 'sandbox');
    updateDbConfig(null);
    setConnectionStatus('disconnected');
    setConnectionMessage('Koneksi diputus. Dialihkan ke Mode Sandbox Lokal.');
  };

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'x-db-type': dbType,
      'ngrok-skip-browser-warning': '69420',
    };
    if (dbType === 'postgres' && dbConfigBase64) {
      headers['x-db-config'] = dbConfigBase64;
    }
    return headers;
  };

  return (
    <DbContext.Provider value={{
      dbType,
      dbConfig,
      dbConfigBase64,
      connectionStatus,
      connectionMessage,
      setDbType,
      updateDbConfig,
      testConnection,
      initializeSchema,
      disconnect,
      getHeaders
    }}>
      {children}
    </DbContext.Provider>
  );
};

export const useDb = () => {
  const context = useContext(DbContext);
  if (context === undefined) {
    throw new Error('useDb must be used within a DbProvider');
  }
  return context;
};
