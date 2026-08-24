import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ApiResponse } from '@/backend/lib/api-response';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session_token');

    return ApiResponse.success(null, 'Logout berhasil');
  } catch (e) {
    console.error('Logout error:', e);
    return ApiResponse.error('Terjadi kesalahan saat logout', 500);
  }
}
