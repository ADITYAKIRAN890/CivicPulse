import { NextResponse, NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'civicspulse_user_id';

const PROTECTED_ROUTES = [
  '/admin',
  '/doctor',
  '/doctor-portal',
  '/department-portal',
  '/canteen-pos',
  '/grievance-portal',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (isProtected) {
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('error', 'unauthenticated');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/doctor/:path*',
    '/doctor-portal/:path*',
    '/department-portal/:path*',
    '/canteen-pos/:path*',
    '/grievance-portal/:path*',
  ],
};
