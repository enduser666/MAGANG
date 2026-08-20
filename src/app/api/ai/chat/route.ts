import { getDbClient } from '@/db';
import { AIAssistantService } from '@/services/ai/assistant';
import { ApiResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth';

export const POST = withAuth(async (request, sessionUser) => {
  try {
    // 2. Initialize database client
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    // 3. Find user profile from DB to access unit kerja
    const user = await db.users.findByUsername(sessionUser.username);
    if (!user) {
      return ApiResponse.error('Akun tidak ditemukan di database.', null, 404);
    }

    // 4. Parse request payload
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return ApiResponse.error('Pertanyaan tidak boleh kosong.', null, 400);
    }

    // 5. Call assistant service
    const responseText = await AIAssistantService.chat(message, db, {
      role: user.role,
      username: user.username,
      unitKerja: user.unitKerja || ''
    });

    // 6. Write audit log for AI interaction
    await db.auditLogs.create({
      action: 'AI_ASSISTANT_QUERY',
      details: `User questioned AI: "${message.length > 60 ? message.substring(0, 57) + '...' : message}"`,
      user: user.username
    });

    return ApiResponse.success(responseText, 'AI assistant query executed successfully');

  } catch (error: any) {
    console.error('API /api/ai/chat Error:', error);
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});
