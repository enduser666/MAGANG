import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDbClient } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Not logged in' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Invalid or expired session' }, { status: 401 });
    }

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const user = await db.users.findByUsername(payload.username);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName || '',
        avatarUrl: user.avatarUrl || '',
        email: user.email || '',
        nip: user.nip || '',
        phoneNumber: user.phoneNumber || '',
        unitKerja: user.unitKerja || ''
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Not logged in' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Invalid or expired session' }, { status: 401 });
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

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        fullName: updatedUser.fullName || '',
        avatarUrl: updatedUser.avatarUrl || '',
        email: updatedUser.email || '',
        nip: updatedUser.nip || '',
        phoneNumber: updatedUser.phoneNumber || '',
        unitKerja: updatedUser.unitKerja || ''
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
