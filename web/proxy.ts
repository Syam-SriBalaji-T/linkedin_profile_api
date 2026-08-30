import { NextResponse, type NextRequest } from 'next/server';
import { sessionCookieName } from '@/lib/constants';

// Redirect convenience only, NOT the security boundary: app/page.tsx
// re-validates the session and every /api/* route requires it.
export function proxy(req: NextRequest): NextResponse {
  const hasCookie = Boolean(req.cookies.get(sessionCookieName())?.value);

  if (!hasCookie && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login'],
};
