import fs from 'fs';
import path from 'path';
import { PrismaClient } from '../generated/prisma/client';

export interface ColumnDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  isNullable?: boolean;
}

export interface TableMetadata {
  name: string;
  displayName: string;
  sourceFile: string;
  creator: string;
  createdAt: string;
  rowCount: number;
  columns: ColumnDefinition[];
  qualityScore: number;
}

export interface QueryParams {
  where?: Record<string, any>; // Advanced filters
  search?: string; // Global search text
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface DbInterface {
  listTables(): Promise<TableMetadata[]>;
  getTableMetadata(tableName: string): Promise<TableMetadata | null>;
  createDynamicTable(
    name: string,
    displayName: string,
    sourceFile: string,
    creator: string,
    columns: ColumnDefinition[],
    rows: any[],
    qualityScore?: number,
    importMode?: 'overwrite' | 'append'
  ): Promise<{ success: boolean; rowCount: number }>;
  deleteDynamicTable(tableName: string): Promise<boolean>;
  
  // Dynamic CRUD
  findRecords(tableName: string, params?: QueryParams): Promise<{ data: any[]; total: number }>;
  createRecord(tableName: string, data: any): Promise<any>;
  updateRecord(tableName: string, id: number, data: any): Promise<any>;
  deleteRecord(tableName: string, id: number): Promise<any>;

  // System registries
  importHistory: {
    findMany(): Promise<any[]>;
    create(data: any): Promise<any>;
    clearAll(): Promise<void>;
  };
  auditLogs: {
    findMany(): Promise<any[]>;
    create(data: any): Promise<any>;
    clearAll(): Promise<void>;
  };
  users: {
    findByUsername(username: string): Promise<any | null>;
    create(data: { username: string; passwordHash: string; role?: string; fullName?: string; nip?: string; email?: string; phoneNumber?: string; unitKerja?: string }): Promise<any>;
    findMany(): Promise<any[]>;
    updateProfile(userId: number, data: { fullName?: string; avatarUrl?: string; email?: string; nip?: string; phoneNumber?: string; unitKerja?: string; role?: string }): Promise<any>;
    deleteUser(userId: number): Promise<boolean>;
  };
  dashboardWidgets: {
    findMany(): Promise<any[]>;
    create(data: any): Promise<any>;
    delete(id: number): Promise<boolean>;
    clearAll(): Promise<void>;
  };
  accessRequests: {
    findMany(): Promise<any[]>;
    create(data: { username: string; requestedRole: string }): Promise<any>;
    updateStatus(id: number, status: string): Promise<any>;
  };
  pipelineJobs: {
    findMany(): Promise<any[]>;
    create(data: any): Promise<any>;
    updateStatus(id: number, status: string, durationMs?: number): Promise<any>;
  };

  testConnection(): Promise<{ success: boolean; message: string }>;
  initializeSchema(): Promise<{ success: boolean; message: string }>;
}

// Sandbox local JSON database helpers
const SANDBOX_FILE = path.join(process.cwd(), 'src/lib/sandbox_db.json');

function readSandbox() {
  if (!fs.existsSync(SANDBOX_FILE)) {
    const initialData = {
      system: {
        users: [
          {
            id: 1,
            username: "admin",
            passwordHash: "$2a$10$eImiTxRdxN1q.64jF86OBeK72m8A24bHq1yUq3Q3u3R3r3t3y3u3i",
            role: "Administrator",
            createdAt: new Date().toISOString()
          }
        ],
        importHistory: [],
        auditLogs: [],
        dashboardWidgets: [],
        accessRequests: [],
        pipelineJobs: []
      },
      tables: {}
    };
    fs.writeFileSync(SANDBOX_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const data = fs.readFileSync(SANDBOX_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.system) parsed.system = {};
    if (!parsed.system.users) parsed.system.users = [];
    if (!parsed.system.importHistory) parsed.system.importHistory = [];
    if (!parsed.system.auditLogs) parsed.system.auditLogs = [];
    if (!parsed.system.dashboardWidgets) parsed.system.dashboardWidgets = [];
    if (!parsed.system.accessRequests) parsed.system.accessRequests = [];
    if (!parsed.system.pipelineJobs) parsed.system.pipelineJobs = [];
    if (!parsed.tables) parsed.tables = {};
    return parsed;
  } catch (e) {
    return { system: { users: [], importHistory: [], auditLogs: [], dashboardWidgets: [], accessRequests: [], pipelineJobs: [] }, tables: {} };
  }
}

function writeSandbox(data: any) {
  fs.writeFileSync(SANDBOX_FILE, JSON.stringify(data, null, 2));
}

// Dynamic Prisma PostgreSQL Clients cache
const prismaClientsCache = new Map<string, PrismaClient>();

function parseDbConfig(configStr: string | null): string | null {
  if (!configStr) return null;
  try {
    // Check if it's base64 encoded or direct URL
    if (configStr.startsWith('postgresql://') || configStr.startsWith('postgres://')) {
      return configStr;
    }
    const decoded = Buffer.from(configStr, 'base64').toString('utf8');
    if (decoded.startsWith('postgresql://') || decoded.startsWith('postgres://')) {
      return decoded;
    }
    // Attempt parse as JSON configuration object
    const parsed = JSON.parse(decoded);
    return `postgresql://${parsed.user}:${parsed.password || ''}@${parsed.host}:${parsed.port || 5432}/${parsed.database}`;
  } catch (e) {
    return null;
  }
}

export function getDbClient(dbType: string, dbConfigBase64: string | null): DbInterface {
  const isSandbox = dbType === 'sandbox' || !dbConfigBase64;
  const dbUrl = parseDbConfig(dbConfigBase64);

  if (isSandbox || !dbUrl) {
    // Return Sandbox Mock Database Client
    return {
      async listTables() {
        const db = readSandbox();
        return Object.values(db.tables).map((t: any) => t.metadata);
      },
      async getTableMetadata(tableName) {
        const db = readSandbox();
        return db.tables[tableName]?.metadata || null;
      },
      async createDynamicTable(name, displayName, sourceFile, creator, columns, rows, qualityScore = 100, importMode = 'overwrite') {
        const db = readSandbox();
        const formattedName = name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
        
        if (importMode === 'append' && db.tables[formattedName]) {
          const existingRows = db.tables[formattedName].rows || [];
          const startId = existingRows.length > 0 ? Math.max(...existingRows.map((r: any) => r.id)) + 1 : 1;
          
          const formattedRows = rows.map((r, idx) => ({
            id: startId + idx,
            ...r
          }));
          
          db.tables[formattedName].rows = [...existingRows, ...formattedRows];
          db.tables[formattedName].metadata.rowCount = db.tables[formattedName].rows.length;
          db.tables[formattedName].metadata.sourceFile = `${db.tables[formattedName].metadata.sourceFile}, ${sourceFile}`;
          db.tables[formattedName].metadata.qualityScore = Math.round((db.tables[formattedName].metadata.qualityScore + qualityScore) / 2);
          writeSandbox(db);
          return { success: true, rowCount: db.tables[formattedName].rows.length };
        } else {
          const formattedRows = rows.map((r, idx) => ({
            id: idx + 1,
            ...r
          }));

          db.tables[formattedName] = {
            metadata: {
              name: formattedName,
              displayName,
              sourceFile,
              creator,
              createdAt: new Date().toISOString(),
              rowCount: formattedRows.length,
              columns,
              qualityScore
            },
            rows: formattedRows
          };
          writeSandbox(db);
          return { success: true, rowCount: formattedRows.length };
        }
      },
      async deleteDynamicTable(tableName) {
        const db = readSandbox();
        if (db.tables[tableName]) {
          delete db.tables[tableName];
          writeSandbox(db);
          return true;
        }
        return false;
      },
      async findRecords(tableName, params) {
        const db = readSandbox();
        const table = db.tables[tableName];
        if (!table) return { data: [], total: 0 };

        let data = [...table.rows];

        // 1. Global Search
        if (params?.search) {
          const q = params.search.toLowerCase();
          data = data.filter((row: any) => {
            return Object.values(row).some((val) => 
              String(val).toLowerCase().includes(q)
            );
          });
        }

        // 2. Field Filters
        if (params?.where) {
          Object.entries(params.where).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
              data = data.filter((row: any) => {
                const cellVal = String(row[key]).toLowerCase();
                return cellVal.includes(String(val).toLowerCase());
              });
            }
          });
        }

        // 3. Sorting
        if (params?.sortField) {
          const field = params.sortField;
          const order = params.sortOrder || 'asc';
          data.sort((a: any, b: any) => {
            let valA = a[field];
            let valB = b[field];
            
            // Handle numeric sorting
            if (typeof valA === 'number' && typeof valB === 'number') {
              return order === 'asc' ? valA - valB : valB - valA;
            }
            
            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
          });
        } else {
          // Default sorting by id descending
          data.sort((a: any, b: any) => b.id - a.id);
        }

        const total = data.length;

        // 4. Pagination
        const page = params?.page || 1;
        const limit = params?.limit || 20;
        const skip = (page - 1) * limit;
        data = data.slice(skip, skip + limit);

        return { data, total };
      },
      async createRecord(tableName, data) {
        const db = readSandbox();
        const table = db.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} does not exist`);

        const nextId = table.rows.length > 0 ? Math.max(...table.rows.map((r: any) => r.id)) + 1 : 1;
        const record = { id: nextId, ...data };
        
        table.rows.push(record);
        table.metadata.rowCount = table.rows.length;
        writeSandbox(db);
        return record;
      },
      async updateRecord(tableName, id, data) {
        const db = readSandbox();
        const table = db.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} does not exist`);

        const idx = table.rows.findIndex((r: any) => Number(r.id) === Number(id));
        if (idx === -1) throw new Error(`Record with ID ${id} not found`);

        table.rows[idx] = { ...table.rows[idx], ...data, id }; // Ensure ID remains immutable
        writeSandbox(db);
        return table.rows[idx];
      },
      async deleteRecord(tableName, id) {
        const db = readSandbox();
        const table = db.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} does not exist`);

        const idx = table.rows.findIndex((r: any) => Number(r.id) === Number(id));
        if (idx === -1) throw new Error(`Record with ID ${id} not found`);

        const deleted = table.rows.splice(idx, 1)[0];
        table.metadata.rowCount = table.rows.length;
        writeSandbox(db);
        return deleted;
      },

      // System records
      importHistory: {
        async findMany() {
          const db = readSandbox();
          return [...db.system.importHistory].sort((a: any, b: any) => b.id - a.id);
        },
        async create(data) {
          const db = readSandbox();
          const newId = db.system.importHistory.length > 0 ? Math.max(...db.system.importHistory.map((x: any) => x.id)) + 1 : 1;
          const record = { id: newId, importTime: new Date().toISOString(), ...data };
          db.system.importHistory.push(record);
          writeSandbox(db);
          return record;
        },
        async clearAll() {
          const db = readSandbox();
          db.system.importHistory = [];
          writeSandbox(db);
        }
      },
      auditLogs: {
        async findMany() {
          const db = readSandbox();
          return [...db.system.auditLogs].sort((a: any, b: any) => b.id - a.id);
        },
        async create(data) {
          const db = readSandbox();
          const newId = db.system.auditLogs.length > 0 ? Math.max(...db.system.auditLogs.map((x: any) => x.id)) + 1 : 1;
          const record = { id: newId, timestamp: new Date().toISOString(), ...data };
          db.system.auditLogs.push(record);
          writeSandbox(db);
          return record;
        },
        async clearAll() {
          const db = readSandbox();
          db.system.auditLogs = [];
          writeSandbox(db);
        }
      },
      users: {
        async findByUsername(username) {
          const db = readSandbox();
          return db.system.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase()) || null;
        },
        async create(data) {
          const db = readSandbox();
          const newId = db.system.users.length > 0 ? Math.max(...db.system.users.map((x: any) => x.id)) + 1 : 1;
          const record = { id: newId, createdAt: new Date().toISOString(), role: data.role || 'Viewer', ...data };
          db.system.users.push(record);
          writeSandbox(db);
          return record;
        },
        async findMany() {
          const db = readSandbox();
          return db.system.users;
        },
        async updateProfile(userId, profileData) {
          const db = readSandbox();
          const idx = db.system.users.findIndex((u: any) => u.id === userId);
          if (idx === -1) throw new Error('User not found');
          db.system.users[idx] = { ...db.system.users[idx], ...profileData };
          writeSandbox(db);
          return db.system.users[idx];
        },
        async deleteUser(userId) {
          const db = readSandbox();
          const idx = db.system.users.findIndex((u: any) => u.id === userId);
          if (idx === -1) return false;
          db.system.users.splice(idx, 1);
          writeSandbox(db);
          return true;
        }
      },
      dashboardWidgets: {
        async findMany() {
          const db = readSandbox();
          return db.system.dashboardWidgets;
        },
        async create(data) {
          const db = readSandbox();
          const newId = db.system.dashboardWidgets.length > 0 ? Math.max(...db.system.dashboardWidgets.map((x: any) => x.id)) + 1 : 1;
          const record = { id: newId, createdAt: new Date().toISOString(), ...data };
          db.system.dashboardWidgets.push(record);
          writeSandbox(db);
          return record;
        },
        async delete(id) {
          const db = readSandbox();
          const idx = db.system.dashboardWidgets.findIndex((w: any) => w.id === id);
          if (idx === -1) return false;
          db.system.dashboardWidgets.splice(idx, 1);
          writeSandbox(db);
          return true;
        },
        async clearAll() {
          const db = readSandbox();
          db.system.dashboardWidgets = [];
          writeSandbox(db);
        }
      },
      accessRequests: {
        async findMany() {
          const db = readSandbox();
          return db.system.accessRequests.sort((a: any, b: any) => b.id - a.id);
        },
        async create(data) {
          const db = readSandbox();
          const newId = db.system.accessRequests.length > 0 ? Math.max(...db.system.accessRequests.map((x: any) => x.id)) + 1 : 1;
          const record = { id: newId, status: 'PENDING', createdAt: new Date().toISOString(), ...data };
          db.system.accessRequests.push(record);
          writeSandbox(db);
          return record;
        },
        async updateStatus(id, status) {
          const db = readSandbox();
          const idx = db.system.accessRequests.findIndex((x: any) => x.id === id);
          if (idx === -1) throw new Error('Request not found');
          
          db.system.accessRequests[idx].status = status;
          
          // If approved, update user's role in sandbox
          if (status === 'APPROVED') {
            const req = db.system.accessRequests[idx];
            const uIdx = db.system.users.findIndex((u: any) => u.username.toLowerCase() === req.username.toLowerCase());
            if (uIdx !== -1) {
              db.system.users[uIdx].role = req.requestedRole;
            }
          }
          
          writeSandbox(db);
          return db.system.accessRequests[idx];
        }
      },
      pipelineJobs: {
        async findMany() {
          const db = readSandbox();
          return db.system.pipelineJobs.sort((a: any, b: any) => b.id - a.id);
        },
        async create(data) {
          const db = readSandbox();
          const newId = db.system.pipelineJobs.length > 0 ? Math.max(...db.system.pipelineJobs.map((x: any) => x.id)) + 1 : 1;
          const record = { id: newId, status: data.status || 'PROCESSING', startedAt: new Date().toISOString(), durationMs: 0, ...data };
          db.system.pipelineJobs.push(record);
          writeSandbox(db);
          return record;
        },
        async updateStatus(id, status, durationMs = 1200) {
          const db = readSandbox();
          const idx = db.system.pipelineJobs.findIndex((x: any) => x.id === id);
          if (idx === -1) throw new Error('Job not found');
          db.system.pipelineJobs[idx].status = status;
          db.system.pipelineJobs[idx].durationMs = durationMs;
          writeSandbox(db);
          return db.system.pipelineJobs[idx];
        }
      },

      async testConnection() {
        return { success: true, message: 'Connected to local sandbox database successfully.' };
      },
      async initializeSchema() {
        return { success: true, message: 'Local sandbox database schema initialized successfully.' };
      }
    };
  }

  // Get or Create Cached Prisma Client for PostgreSQL
  let prisma: PrismaClient;
  if (prismaClientsCache.has(dbUrl)) {
    prisma = prismaClientsCache.get(dbUrl)!;
  } else {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl
        }
      }
    } as any);
    prismaClientsCache.set(dbUrl, prisma);
  }

  // Return Real PostgreSQL Dynamic Client
  return {
    async listTables() {
      try {
        const metadata: any[] = await prisma.$queryRawUnsafe(`
          SELECT * FROM "_sidata_metadata" ORDER BY "createdAt" DESC
        `);
        return metadata.map((m: any) => ({
          name: m.name,
          displayName: m.displayName,
          sourceFile: m.sourceFile,
          creator: m.creator,
          createdAt: new Date(m.createdAt).toISOString(),
          rowCount: Number(m.rowCount),
          columns: JSON.parse(m.columnsJson),
          qualityScore: Number(m.qualityScore)
        }));
      } catch (e) {
        return [];
      }
    },
    async getTableMetadata(tableName) {
      try {
        const metadata: any[] = await prisma.$queryRawUnsafe(`
          SELECT * FROM "_sidata_metadata" WHERE "name" = $1 LIMIT 1
        `, tableName);
        if (metadata.length === 0) return null;
        const m = metadata[0];
        return {
          name: m.name,
          displayName: m.displayName,
          sourceFile: m.sourceFile,
          creator: m.creator,
          createdAt: new Date(m.createdAt).toISOString(),
          rowCount: Number(m.rowCount),
          columns: JSON.parse(m.columnsJson),
          qualityScore: Number(m.qualityScore)
        };
      } catch (e) {
        return null;
      }
    },
    async createDynamicTable(name, displayName, sourceFile, creator, columns, rows, qualityScore = 100, importMode = 'overwrite') {
      const formattedName = name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
      
      // 1. Construct dynamic SQL CREATE TABLE statement
      const sqlColumns = columns.map((col) => {
        let sqlDataType = 'TEXT';
        if (col.type === 'number') sqlDataType = 'DOUBLE PRECISION';
        else if (col.type === 'boolean') sqlDataType = 'BOOLEAN';
        else if (col.type === 'date') sqlDataType = 'TIMESTAMP WITH TIME ZONE';
        return `"${col.name}" ${sqlDataType}`;
      });

      // Insert primary key field 'id'
      sqlColumns.unshift('"id" SERIAL PRIMARY KEY');

      const createTableSql = `CREATE TABLE IF NOT EXISTS "${formattedName}" (${sqlColumns.join(', ')})`;
      
      // Execute table creation
      await prisma.$executeRawUnsafe(createTableSql);

      // 2. Clear old data from this table if it existed (only if overwriting)
      if (importMode !== 'append') {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${formattedName}" RESTART IDENTITY`);
      }

      // 3. Insert rows into the table in batches
      for (const row of rows) {
        const rowKeys = Object.keys(row).map(k => `"${k}"`);
        const rowValues = Object.values(row);
        const placeholders = rowValues.map((_, i) => `$${i + 1}`);
        
        const insertSql = `INSERT INTO "${formattedName}" (${rowKeys.join(', ')}) VALUES (${placeholders.join(', ')})`;
        await prisma.$executeRawUnsafe(insertSql, ...rowValues);
      }

      // 4. Update / Insert registry metadata
      const columnsJson = JSON.stringify(columns);
      let rowCount = rows.length;
      let finalSourceFile = sourceFile;
      let finalQualityScore = qualityScore;

      if (importMode === 'append') {
        try {
          const existingMetadata: any[] = await prisma.$queryRawUnsafe(`
            SELECT * FROM "_sidata_metadata" WHERE "name" = $1
          `, formattedName);
          if (existingMetadata && existingMetadata.length > 0) {
            const meta = existingMetadata[0];
            rowCount = Number(meta.rowCount) + rows.length;
            finalSourceFile = `${meta.sourceFile}, ${sourceFile}`;
            finalQualityScore = Math.round((Number(meta.qualityScore) + qualityScore) / 2);
          }
        } catch (err) {
          console.error('Failed to retrieve existing metadata during append:', err);
        }
      }

      // Upsert dynamic metadata row using raw SQL to support flexibility
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_sidata_metadata" ("name", "displayName", "sourceFile", "creator", "rowCount", "columnsJson", "qualityScore", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT ("name") DO UPDATE SET
          "displayName" = $2,
          "sourceFile" = $3,
          "creator" = $4,
          "rowCount" = $5,
          "columnsJson" = $6,
          "qualityScore" = $7
      `, formattedName, displayName, finalSourceFile, creator, rowCount, columnsJson, finalQualityScore);

      return { success: true, rowCount };
    },
    async deleteDynamicTable(tableName) {
      try {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tableName}"`);
        await prisma.$executeRawUnsafe(`DELETE FROM "_sidata_metadata" WHERE "name" = $1`, tableName);
        return true;
      } catch (e) {
        return false;
      }
    },
    async findRecords(tableName, params) {
      try {
        let querySql = `SELECT * FROM "${tableName}"`;
        let countSql = `SELECT COUNT(*) as cnt FROM "${tableName}"`;
        const queryParams: any[] = [];
        const whereClauses: string[] = [];

        // Dynamic Filtering
        if (params?.search) {
          const text = `%${params.search}%`;
          // Retrieve metadata to see search columns
          const meta = await this.getTableMetadata(tableName);
          if (meta) {
            const searchFilters = meta.columns
              .filter(c => c.type === 'string')
              .map(c => `CAST("${c.name}" AS TEXT) ILIKE $1`);
            if (searchFilters.length > 0) {
              whereClauses.push(`(${searchFilters.join(' OR ')})`);
              queryParams.push(text);
            }
          }
        }

        if (params?.where) {
          Object.entries(params.where).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
              const paramIdx = queryParams.length + 1;
              whereClauses.push(`CAST("${key}" AS TEXT) ILIKE $${paramIdx}`);
              queryParams.push(`%${val}%`);
            }
          });
        }

        if (whereClauses.length > 0) {
          const whereStr = ` WHERE ${whereClauses.join(' AND ')}`;
          querySql += whereStr;
          countSql += whereStr;
        }

        // Sorting
        if (params?.sortField) {
          const order = params.sortOrder === 'asc' ? 'ASC' : 'DESC';
          querySql += ` ORDER BY "${params.sortField}" ${order}`;
        } else {
          querySql += ` ORDER BY "id" DESC`;
        }

        // Pagination
        const page = params?.page || 1;
        const limit = params?.limit || 20;
        const offset = (page - 1) * limit;
        
        const limitParamIdx = queryParams.length + 1;
        const offsetParamIdx = queryParams.length + 2;
        querySql += ` LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`;
        
        const queryParamsWithPage = [...queryParams, limit, offset];

        // Execute query
        const data: any[] = await prisma.$queryRawUnsafe(querySql, ...queryParamsWithPage);
        const countData: any[] = await prisma.$queryRawUnsafe(countSql, ...queryParams);
        const total = Number(countData[0]?.cnt || 0);

        return { data, total };
      } catch (e) {
        return { data: [], total: 0 };
      }
    },
    async createRecord(tableName, data) {
      const keys = Object.keys(data).map(k => `"${k}"`);
      const vals = Object.values(data);
      const placeholders = vals.map((_, i) => `$${i + 1}`);

      const insertSql = `INSERT INTO "${tableName}" (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
      const inserted: any[] = await prisma.$queryRawUnsafe(insertSql, ...vals);
      
      // Update count in metadata
      await prisma.$executeRawUnsafe(`
        UPDATE "_sidata_metadata" SET "rowCount" = "rowCount" + 1 WHERE "name" = $1
      `, tableName);

      return inserted[0];
    },
    async updateRecord(tableName, id, data) {
      const keys = Object.keys(data);
      const vals = Object.values(data);
      
      const setClauses = keys.map((key, i) => `"${key}" = $${i + 1}`);
      const updateSql = `UPDATE "${tableName}" SET ${setClauses.join(', ')} WHERE "id" = $${keys.length + 1} RETURNING *`;
      
      const updated: any[] = await prisma.$queryRawUnsafe(updateSql, ...vals, id);
      return updated[0];
    },
    async deleteRecord(tableName, id) {
      const deleted: any[] = await prisma.$queryRawUnsafe(`
        DELETE FROM "${tableName}" WHERE "id" = $1 RETURNING *
      `, id);

      // Decrement count in metadata
      await prisma.$executeRawUnsafe(`
        UPDATE "_sidata_metadata" SET "rowCount" = GREATEST("rowCount" - 1, 0) WHERE "name" = $1
      `, tableName);

      return deleted[0];
    },

    // System Table operations
    importHistory: {
      async findMany() {
        return prisma.$queryRawUnsafe(`SELECT * FROM "ImportHistory" ORDER BY "id" DESC`);
      },
      async create(data) {
        const records: any[] = await prisma.$queryRawUnsafe(`
          INSERT INTO "ImportHistory" ("fileName", "fileSize", "importTime", "status", "totalRecords", "migratedRecords", "failedRecords", "duplicatesCount", "missingValuesCount", "qualityScore")
          VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9) RETURNING *
        `, data.fileName, data.fileSize, data.status, data.totalRecords, data.migratedRecords, data.failedRecords, data.duplicatesCount, data.missingValuesCount, data.qualityScore || 100);
        return records[0];
      },
      async clearAll() {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ImportHistory" RESTART IDENTITY`);
      }
    },
    auditLogs: {
      async findMany() {
        return prisma.$queryRawUnsafe(`SELECT * FROM "AuditLog" ORDER BY "id" DESC`);
      },
      async create(data) {
        const records: any[] = await prisma.$queryRawUnsafe(`
          INSERT INTO "AuditLog" ("timestamp", "action", "details", "user", "ipAddress", "status")
          VALUES (NOW(), $1, $2, $3, $4, $5) RETURNING *
        `, data.action, data.details, data.user, data.ipAddress || '127.0.0.1', data.status || 'SUCCESS');
        return records[0];
      },
      async clearAll() {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "AuditLog" RESTART IDENTITY`);
      }
    },
    users: {
      async findByUsername(username) {
        const records: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "User" WHERE LOWER("username") = LOWER($1) LIMIT 1`, username.trim());
        return records[0] || null;
      },
      async create(data) {
        // Ensure table columns exist
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fullName" TEXT`);
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nip" TEXT`);
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT`);
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT`);
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "unitKerja" TEXT`);
        } catch (e) {}

        const records: any[] = await prisma.$queryRawUnsafe(`
          INSERT INTO "User" ("username", "passwordHash", "role", "createdAt", "fullName", "nip", "email", "phoneNumber", "unitKerja")
          VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8) RETURNING *
        `, data.username, data.passwordHash, data.role || 'Viewer', data.fullName || '', data.nip || '', data.email || '', data.phoneNumber || '', data.unitKerja || '');
        return records[0];
      },
      async findMany() {
        return prisma.$queryRawUnsafe(`SELECT * FROM "User" ORDER BY "id" ASC`);
      },
      async updateProfile(userId, profileData) {
        // Ensure table columns exist
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fullName" TEXT`);
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT`);
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT`);
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nip" TEXT`);
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT`);
          await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "unitKerja" TEXT`);
        } catch (e) {
          // ignore
        }

        const keys = Object.keys(profileData);
        const vals = Object.values(profileData);
        const setClauses = keys.map((key, i) => `"${key}" = $${i + 1}`);
        const updateSql = `UPDATE "User" SET ${setClauses.join(', ')} WHERE "id" = $${keys.length + 1} RETURNING *`;
        const updated: any[] = await prisma.$queryRawUnsafe(updateSql, ...vals, userId);
        return updated[0];
      },
      async deleteUser(userId) {
        const count = await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE "id" = $1`, userId);
        return count > 0;
      }
    },
    dashboardWidgets: {
      async findMany() {
        return prisma.$queryRawUnsafe(`SELECT * FROM "DashboardWidget" ORDER BY "id" DESC`);
      },
      async create(data) {
        const records: any[] = await prisma.$queryRawUnsafe(`
          INSERT INTO "DashboardWidget" ("title", "type", "sourceTable", "xColumn", "yColumn", "createdAt")
          VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *
        `, data.title, data.type, data.sourceTable, data.xColumn, data.yColumn);
        return records[0];
      },
      async delete(id) {
        const count = await prisma.$executeRawUnsafe(`DELETE FROM "DashboardWidget" WHERE "id" = $1`, id);
        return count > 0;
      },
      async clearAll() {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "DashboardWidget" RESTART IDENTITY`);
      }
    },
    accessRequests: {
      async findMany() {
        return prisma.$queryRawUnsafe(`SELECT * FROM "AccessRequest" ORDER BY "id" DESC`);
      },
      async create(data) {
        const records: any[] = await prisma.$queryRawUnsafe(`
          INSERT INTO "AccessRequest" ("username", "requestedRole", "status", "createdAt")
          VALUES ($1, $2, 'PENDING', NOW()) RETURNING *
        `, data.username, data.requestedRole);
        return records[0];
      },
      async updateStatus(id, status) {
        const records: any[] = await prisma.$queryRawUnsafe(`
          UPDATE "AccessRequest" SET "status" = $1 WHERE "id" = $2 RETURNING *
        `, status, id);
        
        // If approved, dynamically update the user's role
        if (status === 'APPROVED' && records[0]) {
          const req = records[0];
          await prisma.$executeRawUnsafe(`UPDATE "User" SET "role" = $1 WHERE LOWER("username") = LOWER($2)`, req.requestedRole, req.username);
        }
        
        return records[0];
      }
    },
    pipelineJobs: {
      async findMany() {
        try {
          return prisma.$queryRawUnsafe(`SELECT * FROM "PipelineJob" ORDER BY "id" DESC`);
        } catch(e) {
          return [];
        }
      },
      async create(data) {
        try {
          const records: any[] = await prisma.$queryRawUnsafe(`
            INSERT INTO "PipelineJob" ("jobName", "status", "startedAt", "durationMs")
            VALUES ($1, $2, NOW(), $3) RETURNING *
          `, data.jobName, data.status || 'PROCESSING', data.durationMs || 0);
          return records[0];
        } catch(e) {
          return { id: 999, ...data };
        }
      },
      async updateStatus(id, status, durationMs = 1200) {
        try {
          const records: any[] = await prisma.$queryRawUnsafe(`
            UPDATE "PipelineJob" SET "status" = $1, "durationMs" = $2 WHERE "id" = $3 RETURNING *
          `, status, durationMs, id);
          return records[0];
        } catch(e) {
          return { id, status, durationMs };
        }
      }
    },

    async testConnection() {
      try {
        await prisma.$queryRawUnsafe('SELECT 1');
        return { success: true, message: 'Successfully connected to PostgreSQL.' };
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to verify connection to PostgreSQL.' };
      }
    },
    async initializeSchema() {
      try {
        // System Tables definition in PostgreSQL
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "_sidata_metadata" (
            "name" VARCHAR(255) PRIMARY KEY,
            "displayName" VARCHAR(255) NOT NULL,
            "sourceFile" VARCHAR(255) NOT NULL,
            "creator" VARCHAR(255) NOT NULL,
            "rowCount" INTEGER NOT NULL DEFAULT 0,
            "columnsJson" TEXT NOT NULL,
            "qualityScore" INTEGER NOT NULL DEFAULT 100,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "User" (
            "id" SERIAL PRIMARY KEY,
            "username" VARCHAR(255) UNIQUE NOT NULL,
            "passwordHash" VARCHAR(255) NOT NULL,
            "role" VARCHAR(50) DEFAULT 'Viewer',
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "ImportHistory" (
            "id" SERIAL PRIMARY KEY,
            "fileName" VARCHAR(255) NOT NULL,
            "fileSize" INTEGER NOT NULL,
            "importTime" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "status" VARCHAR(50) NOT NULL,
            "totalRecords" INTEGER NOT NULL,
            "migratedRecords" INTEGER NOT NULL,
            "failedRecords" INTEGER NOT NULL,
            "duplicatesCount" INTEGER NOT NULL,
            "missingValuesCount" INTEGER NOT NULL,
            "qualityScore" INTEGER NOT NULL DEFAULT 100
          )
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "AuditLog" (
            "id" SERIAL PRIMARY KEY,
            "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "action" VARCHAR(100) NOT NULL,
            "details" TEXT NOT NULL,
            "user" VARCHAR(100) NOT NULL,
            "ipAddress" VARCHAR(50) DEFAULT '127.0.0.1',
            "status" VARCHAR(50) DEFAULT 'SUCCESS'
          )
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "DashboardWidget" (
            "id" SERIAL PRIMARY KEY,
            "title" VARCHAR(255) NOT NULL,
            "type" VARCHAR(50) NOT NULL,
            "sourceTable" VARCHAR(255) NOT NULL,
            "xColumn" VARCHAR(255) NOT NULL,
            "yColumn" VARCHAR(255) NOT NULL,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "AccessRequest" (
            "id" SERIAL PRIMARY KEY,
            "username" VARCHAR(255) NOT NULL,
            "requestedRole" VARCHAR(50) NOT NULL,
            "status" VARCHAR(50) DEFAULT 'PENDING',
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "PipelineJob" (
            "id" SERIAL PRIMARY KEY,
            "jobName" VARCHAR(255) NOT NULL,
            "status" VARCHAR(50) NOT NULL,
            "startedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "durationMs" INTEGER DEFAULT 0
          )
        `);

        // Seed admin user if User table is empty
        const usersCount: any[] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM "User"');
        if (Number(usersCount[0]?.count || 0) === 0) {
          await prisma.$executeRawUnsafe(`
            INSERT INTO "User" ("username", "passwordHash", "role", "createdAt")
            VALUES ('admin', '$2a$10$eImiTxRdxN1q.64jF86OBeK72m8A24bHq1yUq3Q3u3R3r3t3y3u3i', 'Administrator', NOW())
          `);
        }

        return { success: true, message: 'PostgreSQL dynamic schema tables generated successfully.' };
      } catch (err: any) {
        return { success: false, message: err.message || 'Error occurred during PostgreSQL dynamic migration.' };
      }
    }
  };
}
