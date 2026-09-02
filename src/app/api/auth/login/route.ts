import { cookies } from 'next/headers';
import { getDbClient } from '@/db';
import { verifyPassword, signToken, ROLE_PERMISSIONS } from '@/backend/lib/auth';
import { ApiResponse } from '@/backend/lib/api-response';
import { Validators } from '@/backend/lib/validators';
import { rateLimit } from '@/backend/lib/rate-limiter';
import { config } from '@/backend/lib/config';

import { withRequestContext } from '@/backend/lib/observability';

export const POST = withRequestContext(async (request: Request) => {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1';
               
    const limitResult = rateLimit(ip, { limit: 50, windowMs: 60 * 1000 });
    if (!limitResult.success) {
      const retryAfter = Math.ceil((limitResult.resetTime - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ success: false, message: 'Too many login attempts. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter > 0 ? retryAfter : 1)
          }
        }
      );
    }

    const body = await request.json();
    const validation = Validators.login(body);

    if (!validation.success) {
      return ApiResponse.error(validation.errors.join(', '), null, 400);
    }

    const { username, password } = validation.data!;
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    // Find user
    const user = await db.users.findByUsername(username);
    if (!user) {
      return ApiResponse.error('Username atau password salah', null, 400);
    }

    // Verify password
    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return ApiResponse.error('Username atau password salah', null, 400);
    }

    // Create session token
    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      unitId: user.unitId || undefined,
      unitKode: user.unitKode || undefined,
      accessScope: user.accessScope || 'OWN_UNIT',
      permissions: ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS['VIEWER']
    });

    const response = ApiResponse.success({
      id: user.id,
      username: user.username,
      role: user.role,
      unitId: user.unitId,
      unitKode: user.unitKode,
      accessScope: user.accessScope || 'OWN_UNIT',
      permissions: ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS['VIEWER']
    }, 'Sesi masuk berhasil dibuat');

    response.cookies.set('session_token', token, {
      httpOnly: false,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('Login route error:', error);
    return ApiResponse.error('Gagal memproses permintaan masuk', error, 500);
  }
});
