import fs from 'fs';
import path from 'path';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import mysql from 'mysql2/promise';

export interface MySqlConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export interface DbInterface {
  episodes: {
    findMany(params?: {
      where?: {
        search?: string;
        season?: number;
        director?: string;
        writer?: string;
      };
      orderBy?: {
        field: string;
        direction: 'asc' | 'desc';
      };
      skip?: number;
      take?: number;
    }): Promise<any[]>;
    findUnique(id: number): Promise<any | null>;
    create(data: any): Promise<any>;
    update(id: number, data: any): Promise<any>;
    delete(id: number): Promise<any>;
    createMany(data: any[]): Promise<{ count: number; successCount: number; failedCount: number }>;
    count(params?: {
      where?: {
        search?: string;
        season?: number;
        director?: string;
        writer?: string;
      };
    }): Promise<number>;
    deleteMany(): Promise<void>;
  };
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
    create(data: { username: string; passwordHash: string; role?: string }): Promise<any>;
  };
  testConnection(): Promise<{ success: boolean; message: string }>;
  initializeSchema(): Promise<{ success: boolean; message: string }>;
}

// Sandbox File Database Helpers
const SANDBOX_FILE = path.join(process.cwd(), 'src/lib/sandbox_db.json');

function readSandbox() {
  if (!fs.existsSync(SANDBOX_FILE)) {
    const initialData = { episodes: [], importHistory: [], auditLogs: [], users: [] };
    fs.writeFileSync(SANDBOX_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const data = fs.readFileSync(SANDBOX_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.users) parsed.users = [];
    return parsed;
  } catch (e) {
    return { episodes: [], importHistory: [], auditLogs: [], users: [] };
  }
}

function writeSandbox(data: any) {
  fs.writeFileSync(SANDBOX_FILE, JSON.stringify(data, null, 2));
}

// MySQL Dynamic Cache
const prismaClientsCache = new Map<string, PrismaClient>();

function parseDbConfig(configStr: string | null): MySqlConfig | null {
  if (!configStr) return null;
  try {
    const decoded = Buffer.from(configStr, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

export function getDbClient(dbType: string, dbConfigBase64: string | null): DbInterface {
  const isSandbox = dbType === 'sandbox' || !dbConfigBase64;
  const config = parseDbConfig(dbConfigBase64);

  if (isSandbox || !config) {
    // Return Sandbox Mock Database Client
    return {
      episodes: {
        async findMany(params) {
          const db = readSandbox();
          let list = [...db.episodes];

          // Apply filters
          if (params?.where) {
            const { search, season, director, writer } = params.where;
            if (search) {
              const q = search.toLowerCase();
              list = list.filter(
                (e: any) =>
                  e.title.toLowerCase().includes(q) ||
                  e.summary.toLowerCase().includes(q)
              );
            }
            if (season !== undefined && season !== null && !isNaN(season)) {
              list = list.filter((e: any) => e.season === season);
            }
            if (director) {
              list = list.filter((e: any) => e.director.includes(director));
            }
            if (writer) {
              list = list.filter((e: any) => e.writers.includes(writer));
            }
          }

          // Apply ordering
          if (params?.orderBy) {
            const { field, direction } = params.orderBy;
            list.sort((a: any, b: any) => {
              let valA = a[field];
              let valB = b[field];
              if (typeof valA === 'string') valA = valA.toLowerCase();
              if (typeof valB === 'string') valB = valB.toLowerCase();
              if (valA < valB) return direction === 'asc' ? -1 : 1;
              if (valA > valB) return direction === 'asc' ? 1 : -1;
              return 0;
            });
          } else {
            // Default sort by id desc
            list.sort((a: any, b: any) => b.id - a.id);
          }

          // Apply pagination
          const skip = params?.skip ?? 0;
          const take = params?.take ?? 50;
          return list.slice(skip, skip + take);
        },
        async findUnique(id) {
          const db = readSandbox();
          return db.episodes.find((e: any) => e.id === id) || null;
        },
        async create(data) {
          const db = readSandbox();
          const newId = db.episodes.length > 0 ? Math.max(...db.episodes.map((e: any) => e.id)) + 1 : 1;
          const newEpisode = { id: newId, createdAt: new Date().toISOString(), ...data };
          db.episodes.push(newEpisode);
          writeSandbox(db);
          return newEpisode;
        },
        async update(id, data) {
          const db = readSandbox();
          const idx = db.episodes.findIndex((e: any) => e.id === id);
          if (idx === -1) throw new Error('Record not found');
          db.episodes[idx] = { ...db.episodes[idx], ...data };
          writeSandbox(db);
          return db.episodes[idx];
        },
        async delete(id) {
          const db = readSandbox();
          const idx = db.episodes.findIndex((e: any) => e.id === id);
          if (idx === -1) throw new Error('Record not found');
          const deleted = db.episodes.splice(idx, 1)[0];
          writeSandbox(db);
          return deleted;
        },
        async createMany(dataList) {
          const db = readSandbox();
          let currentId = db.episodes.length > 0 ? Math.max(...db.episodes.map((e: any) => e.id)) + 1 : 1;
          const inserted: any[] = [];
          let successCount = 0;
          let failedCount = 0;

          for (const item of dataList) {
            try {
              // Basic structure validation
              if (!item.title || isNaN(Number(item.season))) {
                failedCount++;
                continue;
              }
              const record = {
                id: currentId++,
                createdAt: new Date().toISOString(),
                season: Number(item.season),
                title: String(item.title),
                summary: String(item.summary || ''),
                rating: Number(item.rating || 0),
                votes: Number(item.votes || 0),
                viewership: Number(item.viewership || 0),
                duration: Number(item.duration || 0),
                releaseDate: item.releaseDate ? new Date(item.releaseDate).toISOString() : null,
                guestStars: item.guestStars ? String(item.guestStars) : null,
                director: String(item.director || 'Unknown'),
                writers: String(item.writers || 'Unknown'),
              };
              inserted.push(record);
              successCount++;
            } catch (err) {
              failedCount++;
            }
          }

          db.episodes.push(...inserted);
          writeSandbox(db);
          return { count: successCount, successCount, failedCount };
        },
        async count(params) {
          const db = readSandbox();
          let list = db.episodes;
          if (params?.where) {
            const { search, season, director, writer } = params.where;
            if (search) {
              const q = search.toLowerCase();
              list = list.filter(
                (e: any) =>
                  e.title.toLowerCase().includes(q) ||
                  e.summary.toLowerCase().includes(q)
              );
            }
            if (season !== undefined && season !== null && !isNaN(season)) {
              list = list.filter((e: any) => e.season === season);
            }
            if (director) {
              list = list.filter((e: any) => e.director.includes(director));
            }
            if (writer) {
              list = list.filter((e: any) => e.writers.includes(writer));
            }
          }
          return list.length;
        },
        async deleteMany() {
          const db = readSandbox();
          db.episodes = [];
          writeSandbox(db);
        },
      },
      importHistory: {
        async findMany() {
          const db = readSandbox();
          return [...db.importHistory].sort((a: any, b: any) => b.id - a.id);
        },
        async create(data) {
          const db = readSandbox();
          const newId = db.importHistory.length > 0 ? Math.max(...db.importHistory.map((e: any) => e.id)) + 1 : 1;
          const newHistory = { id: newId, importTime: new Date().toISOString(), ...data };
          db.importHistory.push(newHistory);
          writeSandbox(db);
          return newHistory;
        },
        async clearAll() {
          const db = readSandbox();
          db.importHistory = [];
          writeSandbox(db);
        }
      },
      auditLogs: {
        async findMany() {
          const db = readSandbox();
          return [...db.auditLogs].sort((a: any, b: any) => b.id - a.id);
        },
        async create(data) {
          const db = readSandbox();
          const newId = db.auditLogs.length > 0 ? Math.max(...db.auditLogs.map((e: any) => e.id)) + 1 : 1;
          const newLog = { id: newId, timestamp: new Date().toISOString(), ...data };
          db.auditLogs.push(newLog);
          writeSandbox(db);
          return newLog;
        },
        async clearAll() {
          const db = readSandbox();
          db.auditLogs = [];
          writeSandbox(db);
        }
      },
      users: {
        async findByUsername(username) {
          const db = readSandbox();
          return db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase()) || null;
        },
        async create(data) {
          const db = readSandbox();
          const newId = db.users.length > 0 ? Math.max(...db.users.map((u: any) => u.id)) + 1 : 1;
          const newUser = { id: newId, createdAt: new Date().toISOString(), role: 'analyst', ...data };
          db.users.push(newUser);
          writeSandbox(db);
          return newUser;
        }
      },
      async testConnection() {
        return { success: true, message: 'Connected to local sandbox database successfully.' };
      },
      async initializeSchema() {
        return { success: true, message: 'Local sandbox database schema is already active.' };
      },
    };
  }

  // Get or Create Cached Prisma Client for MySQL
  const cacheKey = `${config.host}:${config.port}:${config.user}:${config.database}`;
  let prisma: PrismaClient;

  if (prismaClientsCache.has(cacheKey)) {
    prisma = prismaClientsCache.get(cacheKey)!;
  } else {
    const adapter = new PrismaMariaDb({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: 10,
    });
    prisma = new PrismaClient({ adapter });
    prismaClientsCache.set(cacheKey, prisma);
  }

  // Return Real MySQL Database Client
  return {
    episodes: {
      async findMany(params) {
        const where: any = {};
        if (params?.where) {
          const { search, season, director, writer } = params.where;
          if (search) {
            where.OR = [
              { title: { contains: search } },
              { summary: { contains: search } },
            ];
          }
          if (season !== undefined && season !== null && !isNaN(season)) {
            where.season = season;
          }
          if (director) {
            where.director = { contains: director };
          }
          if (writer) {
            where.writers = { contains: writer };
          }
        }

        const orderBy: any = {};
        if (params?.orderBy) {
          orderBy[params.orderBy.field] = params.orderBy.direction;
        } else {
          orderBy.id = 'desc';
        }

        return prisma.episode.findMany({
          where,
          orderBy,
          skip: params?.skip,
          take: params?.take,
        });
      },
      async findUnique(id) {
        return prisma.episode.findUnique({ where: { id } });
      },
      async create(data) {
        return prisma.episode.create({ data });
      },
      async update(id, data) {
        return prisma.episode.update({ where: { id }, data });
      },
      async delete(id) {
        return prisma.episode.delete({ where: { id } });
      },
      async createMany(dataList) {
        let successCount = 0;
        let failedCount = 0;
        // Batch inserting individually to collect failures per row if there are column validations
        for (const item of dataList) {
          try {
            await prisma.episode.create({
              data: {
                season: Number(item.season),
                title: String(item.title),
                summary: String(item.summary || ''),
                rating: Number(item.rating || 0),
                votes: Number(item.votes || 0),
                viewership: Number(item.viewership || 0),
                duration: Number(item.duration || 0),
                releaseDate: item.releaseDate ? new Date(item.releaseDate) : null,
                guestStars: item.guestStars ? String(item.guestStars) : null,
                director: String(item.director || 'Unknown'),
                writers: String(item.writers || 'Unknown'),
              }
            });
            successCount++;
          } catch (e) {
            failedCount++;
          }
        }
        return { count: successCount, successCount, failedCount };
      },
      async count(params) {
        const where: any = {};
        if (params?.where) {
          const { search, season, director, writer } = params.where;
          if (search) {
            where.OR = [
              { title: { contains: search } },
              { summary: { contains: search } },
            ];
          }
          if (season !== undefined && season !== null && !isNaN(season)) {
            where.season = season;
          }
          if (director) {
            where.director = { contains: director };
          }
          if (writer) {
            where.writers = { contains: writer };
          }
        }
        return prisma.episode.count({ where });
      },
      async deleteMany() {
        await prisma.episode.deleteMany();
      },
    },
    importHistory: {
      async findMany() {
        return prisma.importHistory.findMany({ orderBy: { id: 'desc' } });
      },
      async create(data) {
        return prisma.importHistory.create({ data });
      },
      async clearAll() {
        await prisma.importHistory.deleteMany();
      }
    },
    auditLogs: {
      async findMany() {
        return prisma.auditLog.findMany({ orderBy: { id: 'desc' } });
      },
      async create(data) {
        return prisma.auditLog.create({ data });
      },
      async clearAll() {
        await prisma.auditLog.deleteMany();
      }
    },
    users: {
      async findByUsername(username) {
        return prisma.user.findUnique({ where: { username } });
      },
      async create(data) {
        return prisma.user.create({ data });
      }
    },
    async testConnection() {
      try {
        // Connect to server using direct connection to verify credentials
        const connection = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
        });
        await connection.end();
        return { success: true, message: 'Database server reached successfully.' };
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to connect to MySQL database.' };
      }
    },
    async initializeSchema() {
      try {
        // 1. Connect without database to ensure database exists
        const connection = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``);
        await connection.end();

        // 2. Run CREATE TABLE scripts
        const pool = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
        });

        // Episode Table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS \`Episode\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`season\` INT NOT NULL,
            \`title\` VARCHAR(255) NOT NULL,
            \`summary\` TEXT NOT NULL,
            \`rating\` DOUBLE NOT NULL,
            \`votes\` INT NOT NULL,
            \`viewership\` DOUBLE NOT NULL,
            \`duration\` INT NOT NULL,
            \`releaseDate\` DATETIME NULL,
            \`guestStars\` TEXT NULL,
            \`director\` VARCHAR(255) NOT NULL,
            \`writers\` VARCHAR(255) NOT NULL,
            \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // ImportHistory Table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS \`ImportHistory\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`fileName\` VARCHAR(255) NOT NULL,
            \`fileSize\` INT NOT NULL,
            \`importTime\` DATETIME DEFAULT CURRENT_TIMESTAMP,
            \`status\` VARCHAR(50) NOT NULL,
            \`totalRecords\` INT NOT NULL,
            \`migratedRecords\` INT NOT NULL,
            \`failedRecords\` INT NOT NULL,
            \`duplicatesCount\` INT NOT NULL,
            \`missingValuesCount\` INT NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // AuditLog Table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS \`AuditLog\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`timestamp\` DATETIME DEFAULT CURRENT_TIMESTAMP,
            \`action\` VARCHAR(100) NOT NULL,
            \`details\` TEXT NOT NULL,
            \`user\` VARCHAR(100) NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // User Table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS \`User\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`username\` VARCHAR(255) NOT NULL UNIQUE,
            \`passwordHash\` VARCHAR(255) NOT NULL,
            \`role\` VARCHAR(50) DEFAULT 'analyst',
            \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.end();

        return { success: true, message: 'Database schema tables initialized successfully.' };
      } catch (err: any) {
        return { success: false, message: err.message || 'Failed to initialize database tables.' };
      }
    },
  };
}
