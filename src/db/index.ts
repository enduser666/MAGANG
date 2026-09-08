import { DbInterface } from './types';
import { MySQLAdapter } from './adapters/MySQLAdapter';
import { PrismaClient } from '../generated/prisma/client';
import { config } from '../backend/lib/config';

// Global cache untuk PrismaClient per koneksi (hanya digunakan oleh PostgreSQL client)
const globalForPrisma = globalThis as unknown as {
  prismaClientsCache: Map<string, PrismaClient>;
};

const prismaClientsCache = globalForPrisma.prismaClientsCache || new Map<string, PrismaClient>();

if (config.nodeEnv !== 'production') {
  globalForPrisma.prismaClientsCache = prismaClientsCache;
}

// Global singleton untuk MySQL adapter
const globalForDb = globalThis as unknown as {
  mysqlAdapterInstance: MySQLAdapter | null;
};

/**
 * Factory untuk mendapatkan DbInterface yang sesuai dengan konfigurasi.
 *
 * Urutan prioritas:
 * 1. Jika DB_DRIVER=mysql dan bukan test env & tidak force sandbox → MySQLAdapter (singleton)
 * 2. Jika dbType=sandbox / tidak ada dbConfigBase64 / forceSandbox / test env → SandboxClient
 * 3. Selain itu → PostgreSQL client (Prisma-based)
 */
export function getDbClient(
  dbType: string,
  dbConfigBase64: string | null,
  forceSandbox = false
): DbInterface {
  if (!globalForDb.mysqlAdapterInstance) {
    globalForDb.mysqlAdapterInstance = new MySQLAdapter();
  }
  return globalForDb.mysqlAdapterInstance;
}

// Re-export tipe & interface agar konsumen bisa import dari 'src/db'
export type {
  ColumnDefinition,
  TableMetadata,
  QueryParams,
  DbInterface,
  IngestionValidationReport,
} from './types';

// Re-export utilitas kolaborasi
export {
  COLLABORATION_COLUMNS,
  ensureCollaborationColumns,
  HIDDEN_COLLABORATION_COLUMNS,
  filterCollaborationColumns,
  injectCollaborationDefaults,
} from './collaboration';

// Re-export validasi
export {
  validateDatasetSchema,
} from './validation';

// Re-export utilitas sandbox
export {
  SANDBOX_FILE,
  readSandbox,
  writeSandbox,
  type SandboxSystem,
  type SandboxData,
} from './sandbox';
