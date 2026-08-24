import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { config, ensureConfigValidated } from './config';
import { rateLimit } from './rate-limiter';

export interface UserSession {
  userId: number;
  username: string;
  role: string;
  unitId?: number;
  unitKode?: string;
  accessScope?: 'ALL_UNITS' | 'OWN_UNIT';
  permissions?: string[];
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'ADMIN_PUSAT': ['dashboard.view', 'data.view', 'data.create', 'data.update', 'data.delete', 'data.export', 'user.manage', 'unit.manage', 'system.manage', 'all_units.view'],
  'ADMIN_UNIT': ['dashboard.view', 'data.view', 'data.create', 'data.update', 'data.delete', 'data.export'],
  'EDITOR_UNIT': ['dashboard.view', 'data.view', 'data.create', 'data.update'],
  'VIEWER': ['dashboard.view', 'data.view']
};

export type AuthenticatedHandler = (
  request: Request,
  user: UserSession,
  context: any
) => Promise<Response>;

import { withRequestContext, requestContextStorage } from './observability';

export function withAuth(handler: AuthenticatedHandler) {
  return withRequestContext(async (request: Request, context: any) => {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access. Session token required.' },
        { status: 401 }
      );
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access. Invalid or expired session.' },
        { status: 401 }
      );
    }

    // Centralized rate limiting per route per user ID or IP
    const { pathname } = new URL(request.url);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1';
    const rateLimitKey = `rl:${user.userId || ip}:${request.method}:${pathname}`;
    
    const limitResult = rateLimit(rateLimitKey, { limit: 60, windowMs: 60 * 1000 });
    if (!limitResult.success) {
      const retryAfter = Math.ceil((limitResult.resetTime - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ success: false, message: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } }
      );
    }

    const store = requestContextStorage.getStore();
    if (store) {
      store.userId = user.username;
    }

    return await handler(request, user, context);
  });
}

export async function getSessionUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch (e) {
    return null;
  }
}

// Salted password hashing using standard PBKDF2
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Verify a password against a stored PBKDF2 hash
export function verifyPassword(password: string, storedHash: string): boolean {
  if (password === storedHash) return true; // Plaintext verification fallback
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, originalHash] = parts;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  } catch (e) {
    return false;
  }
}

// Sign a session into a standard HS256 JWT
export function signToken(payload: UserSession): string {
  ensureConfigValidated();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days expiration
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', config.jwtSecret);
  hmac.update(`${header}.${body}`);
  const signature = hmac.digest('base64url');
  
  return `${header}.${body}.${signature}`;
}

// Verify a HS256 JWT and return user session data
export function verifyToken(token: string): UserSession | null {
  try {
    ensureConfigValidated();
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    
    // Verify signature
    const hmac = crypto.createHmac('sha256', config.jwtSecret);
    hmac.update(`${header}.${body}`);
    const expectedSignature = hmac.digest('base64url');
    
    if (signature !== expectedSignature) return null;
    
    const decodedBody = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    
    // Check expiry
    if (decodedBody.exp && decodedBody.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Strict schema check to mitigate Broken Object Level Authorization & malformed sessions
    if (
      typeof decodedBody.userId !== 'number' ||
      typeof decodedBody.username !== 'string' ||
      typeof decodedBody.role !== 'string'
    ) {
      return null;
    }
    
    return {
      userId: decodedBody.userId,
      username: decodedBody.username,
      role: decodedBody.role,
      unitId: decodedBody.unitId,
      unitKode: decodedBody.unitKode,
      accessScope: decodedBody.accessScope,
      permissions: decodedBody.permissions
    };
  } catch (e) {
    return null;
  }
}
