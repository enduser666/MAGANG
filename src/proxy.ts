import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  const { pathname } = request.nextUrl;

  // Static files and public image assets should pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next();
  }

  const isAuthPage = pathname === '/login';
  const isAuthApi = pathname.startsWith('/api/auth');

  // Protect backend API routes (excluding auth endpoints)
  if (pathname.startsWith('/api') && !isAuthApi) {
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access. Session token required.' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Redirect logic for UI pages
  if (!pathname.startsWith('/api') && !token && !isAuthPage) {
    // If not logged in, redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isAuthPage) {
    // If already logged in, redirect to dashboard root
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all paths except the ones that are explicitly skipped
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
