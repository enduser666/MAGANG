import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const users = await db.users.findMany();
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to list users.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const body = await request.json();
    const { username, password, role, fullName, nip, email, phoneNumber, unitKerja } = body;

    if (!username || !password) {
      return NextResponse.json({ success: false, message: 'Username and password are required.' }, { status: 400 });
    }

    const existingUser = await db.users.findByUsername(username.trim());
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'Username already exists.' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    const newUser = await db.users.create({
      username: username.trim(),
      passwordHash,
      role: role || 'Viewer',
      fullName: fullName || '',
      nip: nip || '',
      email: email || '',
      phoneNumber: phoneNumber || '',
      unitKerja: unitKerja || ''
    });

    // Write audit log
    await db.auditLogs.create({
      action: 'CREATE_USER',
      details: `Administrator created user account: "${newUser.username}" (${newUser.role})`,
      user: 'Administrator'
    });

    return NextResponse.json({ success: true, data: newUser });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create user.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const body = await request.json();
    const { userId, role, fullName, nip, email, phoneNumber, unitKerja } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
    }

    const updatedUser = await db.users.updateProfile(Number(userId), {
      role,
      fullName,
      nip,
      email,
      phoneNumber,
      unitKerja
    });

    // Write audit log
    await db.auditLogs.create({
      action: 'UPDATE_USER_ROLE',
      details: `Administrator updated user role/profile for "${updatedUser.username}" to ${updatedUser.role}`,
      user: 'Administrator'
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update user.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
    }

    const success = await db.users.deleteUser(Number(userId));
    if (!success) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    // Write audit log
    await db.auditLogs.create({
      action: 'DELETE_USER',
      details: `Administrator deleted user account with ID: ${userId}`,
      user: 'Administrator'
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete user.' },
      { status: 500 }
    );
  }
}
