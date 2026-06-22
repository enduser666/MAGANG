import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDbClient } from '@/lib/db';
import { verifyPassword, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'Username and password required' }, { status: 400 });
    }

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    // Find user
    const user = await db.users.findByUsername(username.trim());
    if (!user) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 400 });
    }

    // Verify password
    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 400 });
    }

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
      action: 'USER_LOGIN',
      details: `User logged in: "${user.username}"`,
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
