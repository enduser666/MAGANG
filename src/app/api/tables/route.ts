import { getDbClient } from '@/db';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const tables = await db.listTables();
    const activeDatabase = dbType === 'sandbox' && process.env.DB_DRIVER !== 'mysql' 
      ? 'Sandbox' 
      : (process.env.DB_NAME || 'mysql_db');
      
    return Response.json({ success: true, data: tables, database: activeDatabase });
  } catch (error: any) {
    return Response.json(
      { success: false, message: error.message || 'Failed to list tables.' },
      { status: 500 }
    );
  }
});
