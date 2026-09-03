// Force Turbopack Cache Invalidation
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, ROLE_PERMISSIONS } from '@/backend/lib/auth';
import { getDbClient } from '@/db';
import { ApiResponse } from '@/backend/lib/api-response';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return ApiResponse.error('Not logged in', null, 401);
    }

    const payload = verifyToken(token);
    if (!payload) {
      return ApiResponse.error('Invalid or expired session', null, 401);
    }

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const user = await db.users.findByUsername(payload.username);
    if (!user) {
      return ApiResponse.error('User not found', null, 404);
    }

    return ApiResponse.success({
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName || '',
      avatarUrl: user.avatarUrl || '',
      email: user.email || '',
      nip: user.nip || '',
      phoneNumber: user.phoneNumber || '',
      unitId: user.unitId || undefined,
      unitKode: user.unitKode || undefined,
      accessScope: user.accessScope || 'OWN_UNIT',
      permissions: ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS['VIEWER']
    }, 'User profile fetched successfully');

  } catch (error: any) {
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return ApiResponse.error('Not logged in', null, 401);
    }

    const payload = verifyToken(token);
    if (!payload) {
      return ApiResponse.error('Invalid or expired session', null, 401);
    }

    const body = await request.json();
    const { fullName, avatarUrl, email, nip, phoneNumber, unitKerja } = body;

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const updatedUser = await db.users.updateProfile(payload.userId, {
      fullName: fullName || '',
      avatarUrl: avatarUrl || '',
      email: email || '',
      nip: nip || '',
      phoneNumber: phoneNumber || '',
      unitKerja: unitKerja || ''
    });

    // Write audit log
    await db.auditLogs.create({
      action: 'UPDATE_PROFILE',
      details: `User updated profile: "${updatedUser.username}"`,
      user: updatedUser.username
    });

    return ApiResponse.success({
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      fullName: updatedUser.fullName || '',
      avatarUrl: updatedUser.avatarUrl || '',
      email: updatedUser.email || '',
      nip: updatedUser.nip || '',
      phoneNumber: updatedUser.phoneNumber || '',
      unitKerja: updatedUser.unitKerja || ''
    }, 'User profile updated successfully');

  } catch (error: any) {
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
}