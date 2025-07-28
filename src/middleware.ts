import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Prevent API routes from being called during build time
  if (process.env.NODE_ENV === 'production' && request.nextUrl.pathname.startsWith('/api/')) {
    // Add headers to prevent caching of API routes
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}; 