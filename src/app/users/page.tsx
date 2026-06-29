'use client';

import React, { useState, useEffect } from 'react';
import { useDb } from '@/context/DbContext';
import {
  Users,
  Shield,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Check,
  X,
  FileText,
  Loader2
} from 'lucide-react';

interface SystemRole {
  name: string;
  desc: string;
  permissions: Record<string, { read: boolean; write: boolean; delete: boolean; execute: boolean }>;
}

const defaultSystemRoles: SystemRole[] = [
  {
    name: 'Administrator',
    desc: 'Full systemic control',
    permissions: {
      'System Configurations': { read: true, write: true, delete: true, execute: true },
      'User Management': { read: true, write: true, delete: true, execute: false },
      'Audit Logs': { read: true, write: false, delete: false, execute: true },
      'Data Integration Pipelines': { read: true, write: true, delete: false, execute: true }
    }
  },
  {
    name: 'Auditor',
    desc: 'Read-only oversight',
    permissions: {
      'System Configurations': { read: true, write: false, delete: false, execute: false },
      'User Management': { read: true, write: false, delete: false, execute: false },
      'Audit Logs': { read: true, write: false, delete: false, execute: true },
      'Data Integration Pipelines': { read: true, write: false, delete: false, execute: true }
    }
  },
  {
    name: 'Data Analyst',
    desc: 'Query & Reporting',
    permissions: {
      'System Configurations': { read: true, write: false, delete: false, execute: false },
      'User Management': { read: false, write: false, delete: false, execute: false },
      'Audit Logs': { read: true, write: false, delete: false, execute: false },
      'Data Integration Pipelines': { read: true, write: true, delete: false, execute: true }
    }
  },
  {
    name: 'Pimpinan',
    desc: 'Executive Dashboards',
    permissions: {
      'System Configurations': { read: true, write: false, delete: false, execute: false },
      'User Management': { read: false, write: false, delete: false, execute: false },
      'Audit Logs': { read: true, write: false, delete: false, execute: false },
      'Data Integration Pipelines': { read: true, write: false, delete: false, execute: false }
    }
  },
  {
    name: 'Viewer',
    desc: 'Basic restricted access',
    permissions: {
      'System Configurations': { read: false, write: false, delete: false, execute: false },
      'User Management': { read: false, write: false, delete: false, execute: false },
      'Audit Logs': { read: false, write: false, delete: false, execute: false },
      'Data Integration Pipelines': { read: true, write: false, delete: false, execute: false }
    }
  }
];

export default function UserAccessManagement() {
  const { dbType, getHeaders, connectionStatus } = useDb();

  const [activeRole, setActiveRole] = useState<string>('Administrator');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Search Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // Add User Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Viewer');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newNip, setNewNip] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit User Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('Viewer');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editNip, setEditNip] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit / Role update states
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  // System roles matrix state with localStorage persistence
  const [rolesMatrix, setRolesMatrix] = useState<SystemRole[]>(defaultSystemRoles);

  useEffect(() => {
    const saved = localStorage.getItem('sidata_system_roles_matrix');
    if (saved) {
      try {
        setRolesMatrix(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved roles matrix configuration:', e);
      }
    }
  }, []);


  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setUsersList(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await fetch('/api/requests', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setRequests(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRequests();
  }, [dbType, connectionStatus]);

  const handleRequestStatusChange = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      const headers = getHeaders();
      const res = await fetch('/api/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
        fetchUsers(); // Refresh role changes
        showToast(`Status permintaan akses berhasil diubah menjadi: ${status}!`, 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memproses permintaan akses.', 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;
    setCreating(true);
    try {
      const headers = getHeaders();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
          fullName: newFullName,
          email: newEmail,
          phoneNumber: newPhone,
          unitKerja: newUnit,
          nip: newNip
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Pengguna baru berhasil ditambahkan!', 'success');
        setShowAddModal(false);
        // Reset form
        setNewUsername('');
        setNewPassword('');
        setNewRole('Viewer');
        setNewFullName('');
        setNewEmail('');
        setNewPhone('');
        setNewUnit('');
        setNewNip('');
        fetchUsers();
      } else {
        showToast('Gagal menambah pengguna: ' + data.message, 'error');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUserRole = async (userId: number, role: string) => {
    setUpdatingUserId(userId);
    try {
      const headers = getHeaders();
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ userId, role })
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
        showToast(`Peran pengguna berhasil diubah menjadi: ${role}!`, 'success');
      } else {
        showToast('Gagal mengubah peran: ' + data.message, 'error');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId) return;
    setSavingEdit(true);
    try {
      const headers = getHeaders();
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          userId: editUserId,
          role: editRole,
          fullName: editFullName,
          email: editEmail,
          phoneNumber: editPhone,
          unitKerja: editUnit,
          nip: editNip
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Profil pengguna berhasil diperbarui!', 'success');
        setShowEditModal(false);
        fetchUsers();
      } else {
        showToast('Gagal memperbarui pengguna: ' + data.message, 'error');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const openEditModal = (usr: any) => {
    setEditUserId(usr.id);
    setEditUsername(usr.username);
    setEditFullName(usr.fullName || '');
    setEditRole(usr.role || 'Viewer');
    setEditEmail(usr.email || '');
    setEditPhone(usr.phoneNumber || '');
    setEditUnit(usr.unitKerja || '');
    setEditNip(usr.nip || '');
    setShowEditModal(true);
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (username === 'admin') {
      showToast('Akun Administrator utama tidak dapat dihapus!', 'error');
      return;
    }
    if (!confirm(`Apakah Anda yakin ingin menghapus pengguna "${username}"?`)) {
      return;
    }
    try {
      const headers = getHeaders();
      const res = await fetch(`/api/users?userId=${userId}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (data.success) {
        showToast('Pengguna berhasil dihapus!', 'success');
        fetchUsers();
      } else {
        showToast('Gagal menghapus pengguna: ' + data.message, 'error');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan: ' + err.message, 'error');
    }
  };

  const handlePermissionChange = (roleName: string, area: string, action: 'read' | 'write' | 'delete' | 'execute', value: boolean) => {
    setRolesMatrix(prev => prev.map(role => {
      if (role.name === roleName) {
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [area]: {
              ...role.permissions[area],
              [action]: value
            }
          }
        };
      }
      return role;
    }));
  };

  const handleSavePermissions = () => {
    localStorage.setItem('sidata_system_roles_matrix', JSON.stringify(rolesMatrix));
    showToast(`Izin akses untuk peran ${activeRole} berhasil disimpan!`, 'success');
  };

  const getActiveRolePermissions = () => {
    return rolesMatrix.find(r => r.name === activeRole)?.permissions || defaultSystemRoles[0].permissions;
  };

  const activePermissions = getActiveRolePermissions();

  const filteredUsers = usersList.filter(usr => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    return (
      (usr.username || '').toLowerCase().includes(query) ||
      (usr.fullName || '').toLowerCase().includes(query) ||
      (usr.email || '').toLowerCase().includes(query) ||
      (usr.nip || '').toLowerCase().includes(query) ||
      (usr.unitKerja || '').toLowerCase().includes(query) ||
      (usr.role || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Manajemen Pengguna</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Atur penugasan peran (RBAC), konfigurasi matriks izin akses, dan persetujuan alur kerja permintaan akses.
        </p>
      </div>

      {/* Row 1: System Roles & Permissions Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: System Roles Menu */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-extrabold text-slate-450 uppercase tracking-wider flex items-center gap-2">
            <Shield className="h-4.5 w-4.5 text-[#1D4ED8]" /> Peran Sistem (Roles)
          </h3>
          
          <div className="space-y-1.5">
            {rolesMatrix.map((role) => (
              <button
                key={role.name}
                onClick={() => setActiveRole(role.name)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-lg border text-left transition-all ${
                  activeRole === role.name
                    ? 'bg-blue-500/10 border-[#1D4ED8] text-[#1D4ED8]'
                    : 'border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-500'
                }`}
              >
                <div>
                  <span className="block text-slate-800 dark:text-slate-200">{role.name}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 block">{role.desc}</span>
                </div>
                <span className="text-[9px] uppercase font-bold text-emerald-600 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/10">
                  ACTIVE
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Permissions Matrix Table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
              Permissions Matrix: <strong className="text-[#1D4ED8]">{activeRole}</strong>
            </h3>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Feature Area</th>
                    <th className="px-4 py-3 text-center w-16">Read</th>
                    <th className="px-4 py-3 text-center w-16">Write</th>
                    <th className="px-4 py-3 text-center w-16">Delete</th>
                    <th className="px-4 py-3 text-center w-16">Execute</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-350">
                  {Object.entries(activePermissions).map(([area, perms]) => (
                    <tr key={area} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold">{area}</td>
                      
                      {/* Read */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={perms.read}
                          onChange={(e) => handlePermissionChange(activeRole, area, 'read', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-[#1D4ED8] focus:ring-[#1D4ED8] cursor-pointer"
                        />
                      </td>

                      {/* Write */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={perms.write}
                          onChange={(e) => handlePermissionChange(activeRole, area, 'write', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-[#1D4ED8] focus:ring-[#1D4ED8] cursor-pointer"
                        />
                      </td>

                      {/* Delete */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={perms.delete}
                          onChange={(e) => handlePermissionChange(activeRole, area, 'delete', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-[#1D4ED8] focus:ring-[#1D4ED8] cursor-pointer"
                        />
                      </td>

                      {/* Execute */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={perms.execute}
                          onChange={(e) => handlePermissionChange(activeRole, area, 'execute', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-[#1D4ED8] focus:ring-[#1D4ED8] cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-850 mt-4">
            <button
              onClick={handleSavePermissions}
              className="px-4 py-2 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>

      </div>

      {/* Row 2: User Role Assignments Table (OCR Page 9 bottom table) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            User Role Assignments
          </h3>
          
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari pengguna..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] focus:w-64 transition-all font-semibold"
              />
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Pengguna
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-350">
            <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3.5 text-left">Nama Pengguna</th>
                <th className="px-4 py-3.5 text-left">Unit Organisasi</th>
                <th className="px-4 py-3.5 text-left">Peran Aktif</th>
                <th className="px-4 py-3.5 text-left">Login Terakhir</th>
                <th className="px-4 py-3.5 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-bold">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-450 italic">
                    {searchTerm ? 'Tidak ada pengguna yang cocok dengan pencarian Anda.' : 'Tidak ada pengguna.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {usr.fullName || usr.username}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">NIP. {usr.nip || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {usr.unitKerja || (usr.username === 'admin' ? 'Biro Perencanaan dan Keuangan' 
                        : usr.username === 'auditor' ? 'Inspektorat I'
                        : usr.username === 'analyst' ? 'Pusat Sistem Informasi'
                        : 'Inspektorat Jenderal')}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#1D4ED8]">
                      {usr.username === 'admin' ? (
                        <span className="text-slate-800 dark:text-slate-200">{usr.role}</span>
                      ) : (
                        <select
                          value={usr.role}
                          disabled={updatingUserId === usr.id}
                          onChange={(e) => handleUpdateUserRole(usr.id, e.target.value)}
                          className="bg-transparent border-0 font-bold text-[#1D4ED8] focus:ring-0 focus:outline-none cursor-pointer pr-5 py-0.5 rounded text-xs"
                        >
                          <option value="Administrator">Administrator</option>
                          <option value="Auditor">Auditor</option>
                          <option value="Data Analyst">Data Analyst</option>
                          <option value="Pimpinan">Pimpinan</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-450">
                      {new Date(usr.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(usr)}
                          className="p-1.5 rounded text-slate-450 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800/60 dark:hover:text-slate-250 transition-colors"
                          title="Edit Pengguna"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(usr.id, usr.username)}
                          disabled={usr.username === 'admin'}
                          className="p-1.5 rounded text-slate-450 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                          title="Hapus Pengguna"
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

      {/* Row 3: Access Request Workflow Approval Panel */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Alur Kerja Permintaan Akses (Access Requests Queue)
        </h3>

        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-350">
            <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3.5 text-left">Nama Pemohon</th>
                <th className="px-4 py-3.5 text-left">Peran yang Diminta</th>
                <th className="px-4 py-3.5 text-left">Tanggal Pengajuan</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center w-40">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {requestsLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-bold">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Memuat antrean...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-450 italic">
                    Antrean permintaan kosong. Semua pengajuan telah diproses.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{req.username}</td>
                    <td className="px-4 py-3 font-bold">{req.requestedRole}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold border ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-850 border-emerald-500/10'
                          : req.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-850 border-amber-500/10 animate-pulse'
                          : 'bg-red-100 text-red-850 border-red-500/10'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold">
                          <button
                            onClick={() => handleRequestStatusChange(req.id, 'APPROVED')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded cursor-pointer"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => handleRequestStatusChange(req.id, 'REJECTED')}
                            className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded cursor-pointer"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Telah Diproses</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add User Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full overflow-hidden text-xs">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="h-4.5 w-4.5 text-[#1D4ED8]" /> Tambah Pengguna Baru
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUser} className="p-5 space-y-4 font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Username */}
                <div className="space-y-1">
                  <label className="text-slate-650 dark:text-slate-400 block font-bold">Username / Login ID</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: ahmad_jaelani"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-slate-650 dark:text-slate-400 block font-bold">Password Akun</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
                  />
                </div>

                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-slate-650 dark:text-slate-400 block font-bold">Nama Lengkap</label>
                  <input
                    type="text"
                    placeholder="Contoh: Ahmad Jaelani"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <label className="text-slate-650 dark:text-slate-400 block font-bold">Peran Sistem (Role)</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Auditor">Auditor</option>
                    <option value="Data Analyst">Data Analyst</option>
                    <option value="Pimpinan">Pimpinan</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-slate-655 dark:text-slate-400 block font-bold">Alamat Email</label>
                  <input
                    type="email"
                    placeholder="name@kemenkeu.go.id"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-slate-655 dark:text-slate-400 block font-bold">No. WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Contoh: 0812345678"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                  />
                </div>

                {/* Unit Kerja */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-slate-655 dark:text-slate-400 block font-bold">Unit Kerja Eselon I</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                  >
                    <option value="">Pilih Unit Kerja</option>
                    <option value="Sekretariat Jenderal">Sekretariat Jenderal (Setjen)</option>
                    <option value="Direktorat Jenderal Pajak">Direktorat Jenderal Pajak (DJP)</option>
                    <option value="Direktorat Jenderal Bea dan Cukai">Direktorat Jenderal Bea dan Cukai (DJBC)</option>
                    <option value="Direktorat Jenderal Perbendaharaan">Direktorat Jenderal Perbendaharaan (DJPb)</option>
                    <option value="Direktorat Jenderal Kekayaan Negara">Direktorat Jenderal Kekayaan Negara (DJKN)</option>
                    <option value="Inspektorat Jenderal">Inspektorat Jenderal (Itjen)</option>
                    <option value="Badan Kebijakan Fiskal">Badan Kebijakan Fiskal (BKF)</option>
                    <option value="Badan Pendidikan dan Pelatihan Keuangan">Badan Pendidikan dan Pelatihan Keuangan (BPPK)</option>
                  </select>
                </div>

                {/* NIP */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-slate-655 dark:text-slate-400 block font-bold">NIP (Nomor Induk Pegawai)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 199508212020011002"
                    value={newNip}
                    onChange={(e) => setNewNip(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                  />
                </div>

              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-150 dark:border-slate-800 mt-5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-350 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-[#1D4ED8] hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer inline-flex items-center gap-1.5"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Simpan Pengguna
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      
      {/* Modal Edit User Dialog */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full overflow-hidden text-xs">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Edit2 className="h-4.5 w-4.5 text-[#1D4ED8]" /> Edit Profil Pengguna: {editUsername}
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditUser} className="p-5 space-y-4 font-semibold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-slate-650 dark:text-slate-400 block font-bold">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Jaelani"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <label className="text-slate-650 dark:text-slate-400 block font-bold">Peran Sistem (Role)</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Auditor">Auditor</option>
                    <option value="Data Analyst">Data Analyst</option>
                    <option value="Pimpinan">Pimpinan</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-slate-655 dark:text-slate-400 block font-bold">Alamat Email</label>
                  <input
                    type="email"
                    placeholder="name@kemenkeu.go.id"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-slate-655 dark:text-slate-400 block font-bold">No. WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Contoh: 0812345678"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                  />
                </div>

                {/* Unit Kerja */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-slate-655 dark:text-slate-400 block font-bold">Unit Kerja Eselon I</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                  >
                    <option value="">Pilih Unit Kerja</option>
                    <option value="Sekretariat Jenderal">Sekretariat Jenderal (Setjen)</option>
                    <option value="Direktorat Jenderal Pajak">Direktorat Jenderal Pajak (DJP)</option>
                    <option value="Direktorat Jenderal Bea dan Cukai">Direktorat Jenderal Bea dan Cukai (DJBC)</option>
                    <option value="Direktorat Jenderal Perbendaharaan">Direktorat Jenderal Perbendaharaan (DJPb)</option>
                    <option value="Direktorat Jenderal Kekayaan Negara">Direktorat Jenderal Kekayaan Negara (DJKN)</option>
                    <option value="Inspektorat Jenderal">Inspektorat Jenderal (Itjen)</option>
                    <option value="Badan Kebijakan Fiskal">Badan Kebijakan Fiskal (BKF)</option>
                    <option value="Badan Pendidikan dan Pelatihan Keuangan">Badan Pendidikan dan Pelatihan Keuangan (BPPK)</option>
                  </select>
                </div>

                {/* NIP */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-slate-655 dark:text-slate-400 block font-bold">NIP (Nomor Induk Pegawai)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 199508212020011002"
                    value={editNip}
                    onChange={(e) => setEditNip(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] font-bold"
                  />
                </div>

              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-150 dark:border-slate-800 mt-5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-350 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-[#1D4ED8] hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer inline-flex items-center gap-1.5"
                >
                  {savingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Simpan Perubahan
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 bg-white/90 dark:bg-[#111827]/90 border-slate-200/50 dark:border-slate-800">
          <div className={`p-1 rounded-full ${
            toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' :
            toast.type === 'error' ? 'bg-rose-500/10 text-rose-600' :
            'bg-blue-500/10 text-blue-600'
          }`}>
            {toast.type === 'success' ? (
              <Check className="h-4 w-4" />
            ) : toast.type === 'error' ? (
              <X className="h-4 w-4" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {toast.message}
          </span>
        </div>
      )}
      
    </div>
  );
}
