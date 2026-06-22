import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDbClient } from '@/lib/db';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password || username.trim().length < 3 || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Username must be >= 3 chars, Password must be >= 6 chars' },
        { status: 400 }
      );
    }

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    // Check duplicate username
    const existing = await db.users.findByUsername(username.trim());
    if (existing) {
      return NextResponse.json({ success: false, message: 'Username already taken' }, { status: 400 });
    }

    // Hash password and save user
    const passwordHash = hashPassword(password);
    const user = await db.users.create({
      username: username.trim(),
      passwordHash,
      role: 'analyst'
    });

    // Create session token
    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    // Write audit log
    await db.auditLogs.create({
      action: 'USER_REGISTER',
      details: `User registered: "${user.username}" (role: ${user.role})`,
      user: user.username
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
