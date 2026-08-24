import { getDbClient } from '@/db';
import { withAuth } from '@/backend/lib/auth';

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { dbType, dbConfig } = body;
    const db = getDbClient(dbType, dbConfig);
    const result = await db.testConnection();
    return Response.json(result);
  } catch (error: any) {
    return Response.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
});
