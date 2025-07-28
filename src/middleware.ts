import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Prevent static generation and add dynamic headers
  const response = NextResponse.next();
  
  // Add headers to prevent static generation and caching
  response.headers.set('Cache-Control', 'no-store, must-revalidate, no-cache, private');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');
  response.headers.set('X-Accel-Buffering', 'no');
  
  // Force dynamic rendering
  response.headers.set('X-Next-Dynamic', '1');
  
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 