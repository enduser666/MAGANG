import fs from 'fs';
import path from 'path';
import { hashPassword } from '../backend/lib/auth';

export const SANDBOX_FILE = path.join(process.cwd(), 'src/db/sandbox_db.json');

export interface SandboxSystem {
  users: any[];
  importHistory: any[];
  auditLogs: any[];
  dashboardWidgets: any[];
  accessRequests: any[];
  pipelineJobs: any[];
  locks: any[];
  approvals: any[];
  activityFeed: any[];
  notifications: any[];
  workspaces: any[];
  datasets: any[];
  relationships: any[];
  views: any[];
  permissions: any[];
}

export interface SandboxData {
  system: SandboxSystem;
  tables: Record<string, any>;
}

function getInitialSystem(): SandboxSystem {
  return {
    users: [
      {
        id: 1,
        username: 'admin',
        passwordHash: hashPassword('admin'),
        role: 'Administrator',
        createdAt: new Date().toISOString()
      }
    ],
    importHistory: [],
    auditLogs: [],
    dashboardWidgets: [],
    accessRequests: [],
    pipelineJobs: [],
    locks: [],
    approvals: [],
    activityFeed: [],
    notifications: [],
    workspaces: [],
    datasets: [],
    relationships: [],
    views: [],
    permissions: []
  };
}

function ensureSystemFields(system: SandboxSystem): void {
  if (!system.users) system.users = [];
  if (!system.importHistory) system.importHistory = [];
  if (!system.auditLogs) system.auditLogs = [];
  if (!system.dashboardWidgets) system.dashboardWidgets = [];
  if (!system.accessRequests) system.accessRequests = [];
  if (!system.pipelineJobs) system.pipelineJobs = [];
  if (!system.locks) system.locks = [];
  if (!system.approvals) system.approvals = [];
  if (!system.activityFeed) system.activityFeed = [];
  if (!system.notifications) system.notifications = [];
  if (!system.workspaces) system.workspaces = [];
  if (!system.datasets) system.datasets = [];
  if (!system.relationships) system.relationships = [];
  if (!system.views) system.views = [];
  if (!system.permissions) system.permissions = [];
  if (system.workspaces.length === 0) {
    system.workspaces.push({ id: 'default', name: 'Default Workspace', createdAt: new Date().toISOString() });
  }
}

export function readSandbox(): SandboxData {
  console.time('[SANDBOX-PERF] readSandbox');
  if (!fs.existsSync(SANDBOX_FILE)) {
    const initialData: SandboxData = {
      system: getInitialSystem(),
      tables: {}
    };
    fs.writeFileSync(SANDBOX_FILE, JSON.stringify(initialData, null, 2));
    console.timeEnd('[SANDBOX-PERF] readSandbox');
    return initialData;
  }
  try {
    const data = fs.readFileSync(SANDBOX_FILE, 'utf8');
    const parsed: SandboxData = JSON.parse(data);
    if (!parsed.system) parsed.system = {} as SandboxSystem;
    ensureSystemFields(parsed.system);
    if (!parsed.tables) parsed.tables = {};
    console.timeEnd('[SANDBOX-PERF] readSandbox');
    return parsed;
  } catch (e) {
    console.timeEnd('[SANDBOX-PERF] readSandbox');
    return {
      system: {
        users: [],
        importHistory: [],
        auditLogs: [],
        dashboardWidgets: [],
        accessRequests: [],
        pipelineJobs: [],
        locks: [],
        approvals: [],
        activityFeed: [],
        notifications: [],
        workspaces: [],
        datasets: [],
        relationships: [],
        views: [],
        permissions: []
      },
      tables: {}
    };
  }
}

export function writeSandbox(data: SandboxData): void {
  console.time('[SANDBOX-PERF] writeSandbox');
  try {
    console.time('[SANDBOX-PERF] writeSandbox:JSON.stringify');
    const serialized = JSON.stringify(data, null, 2);
    console.timeEnd('[SANDBOX-PERF] writeSandbox:JSON.stringify');
    console.log('[SANDBOX-DIAG] writeSandbox() writing to:', SANDBOX_FILE, '| bytes:', serialized.length);
    console.time('[SANDBOX-PERF] writeSandbox:fs.writeFileSync');
    fs.writeFileSync(SANDBOX_FILE, serialized);
    console.timeEnd('[SANDBOX-PERF] writeSandbox:fs.writeFileSync');
    const stat = fs.statSync(SANDBOX_FILE);
    console.log('[SANDBOX-DIAG] writeSandbox() completed | file size on disk:', stat.size, 'bytes | mtime:', stat.mtime.toISOString());
  } catch (err: any) {
    console.error('[SANDBOX-DIAG] writeSandbox() FAILED! Full error:', err);
    throw err;
  } finally {
    console.timeEnd('[SANDBOX-PERF] writeSandbox');
  }
}
