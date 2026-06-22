import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'data_migration_dashboard_security_secret_998811';

export interface UserSession {
  userId: number;
  username: string;
  role: string;
}

// Salted password hashing using standard PBKDF2
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Verify a password against a stored PBKDF2 hash
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  } catch (e) {
    return false;
  }
}

// Sign a session into a standard HS256 JWT
export function signToken(payload: UserSession): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days expiration
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(`${header}.${body}`);
  const signature = hmac.digest('base64url');
  
  return `${header}.${body}.${signature}`;
}

// Verify a HS256 JWT and return user session data
export function verifyToken(token: string): UserSession | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    
    // Verify signature
    const hmac = crypto.createHmac('sha256', JWT_SECRET);
    hmac.update(`${header}.${body}`);
    const expectedSignature = hmac.digest('base64url');
    
    if (signature !== expectedSignature) return null;
    
    const decodedBody = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    
    // Check expiry
    if (decodedBody.exp && decodedBody.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return {
      userId: decodedBody.userId,
      username: decodedBody.username,
      role: decodedBody.role
    };
  } catch (e) {
    return null;
  }
}
