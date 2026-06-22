'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface MySqlConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export type DbType = 'mysql' | 'sandbox';
export type ConnectionStatus = 'disconnected' | 'connected' | 'error' | 'testing';

interface DbContextType {
  dbType: DbType;
  dbConfig: MySqlConfig | null;
  dbConfigBase64: string | null;
  connectionStatus: ConnectionStatus;
  connectionMessage: string;
  setDbType: (type: DbType) => void;
  updateDbConfig: (config: MySqlConfig | null) => void;
  testConnection: (config: MySqlConfig) => Promise<{ success: boolean; message: string }>;
  initializeSchema: () => Promise<{ success: boolean; message: string }>;
  disconnect: () => void;
  getHeaders: () => Record<string, string>;
}

const DbContext = createContext<DbContextType | undefined>(undefined);

export const DbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dbType, setDbTypeState] = useState<DbType>('sandbox');
  const [dbConfig, setDbConfigState] = useState<MySqlConfig | null>(null);
  const [dbConfigBase64, setDbConfigBase64] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionMessage, setConnectionMessage] = useState<string>('Using local sandbox mode.');

  // Load from localStorage on mount
  useEffect(() => {
    const savedType = localStorage.getItem('db_type') as DbType;
    const savedConfig = localStorage.getItem('db_config');

    if (savedType) {
      setDbTypeState(savedType);
    }
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setDbConfigState(parsed);
        const base64 = Buffer.from(JSON.stringify(parsed)).toString('base64');
        setDbConfigBase64(base64);
        
        if (savedType === 'mysql') {
          // Attempt to test connection silently on load
          setConnectionStatus('testing');
          fetch('/api/db/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dbType: 'mysql', dbConfig: base64 })
          })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                setConnectionStatus('connected');
                setConnectionMessage('Connected to MySQL server.');
              } else {
                setConnectionStatus('error');
                setConnectionMessage(data.message || 'Failed to reach MySQL server.');
              }
            })
            .catch(() => {
              setConnectionStatus('error');
              setConnectionMessage('Failed to connect to backend.');
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
      setConnectionMessage('Using local sandbox mode.');
    } else if (dbConfigBase64) {
      // Re-evaluate mysql status
      setConnectionStatus('testing');
      fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbType: 'mysql', dbConfig: dbConfigBase64 })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setConnectionStatus('connected');
            setConnectionMessage('Connected to MySQL server.');
          } else {
            setConnectionStatus('error');
            setConnectionMessage(data.message || 'Connection failed.');
          }
        })
        .catch(() => {
          setConnectionStatus('error');
          setConnectionMessage('Backend communication error.');
        });
    } else {
      setConnectionStatus('disconnected');
      setConnectionMessage('Configure MySQL credentials to connect.');
    }
  };

  const updateDbConfig = (config: MySqlConfig | null) => {
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

  const testConnection = async (config: MySqlConfig) => {
    setConnectionStatus('testing');
    setConnectionMessage('Testing connection...');
    try {
      const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbType: 'mysql', dbConfig: base64 })
      });
      const data = await res.json();
      if (data.success) {
        setConnectionStatus('connected');
        setConnectionMessage('Connected to MySQL server successfully.');
        updateDbConfig(config);
        setDbTypeState('mysql');
        localStorage.setItem('db_type', 'mysql');
      } else {
        setConnectionStatus('error');
        setConnectionMessage(data.message || 'Failed to connect.');
      }
      return data;
    } catch (e: any) {
      setConnectionStatus('error');
      setConnectionMessage(e.message || 'Error occurred while testing.');
      return { success: false, message: e.message || 'Connection test failed.' };
    }
  };

  const initializeSchema = async () => {
    if (dbType === 'mysql' && !dbConfigBase64) {
      return { success: false, message: 'MySQL configuration is missing.' };
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
      return { success: false, message: e.message || 'Failed to run migration setup.' };
    }
  };

  const disconnect = () => {
    setDbTypeState('sandbox');
    localStorage.setItem('db_type', 'sandbox');
    updateDbConfig(null);
    setConnectionStatus('disconnected');
    setConnectionMessage('Disconnected. Switched back to Sandbox mode.');
  };

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'x-db-type': dbType,
    };
    if (dbType === 'mysql' && dbConfigBase64) {
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
