import { NextResponse } from "next/server";
import { auth } from "./auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role;

  // Protect /checkin -> Only ATHLETE or ADMIN can access
  if (pathname.startsWith('/checkin')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/api/auth/signin', req.url));
    }
    if (role !== 'ATHLETE' && role !== 'ADMIN') {
      return new NextResponse("Forbidden: This interface is strictly for Nexus Core Athletes.", { status: 403 });
    }
  }

  // Protect /dashboard/clinical -> Only CLINICIAN or ADMIN can access
  if (pathname.startsWith('/dashboard/clinical')) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/api/auth/signin', req.url));
    }
    if (role !== 'CLINICIAN' && role !== 'ADMIN') {
      return new NextResponse("Forbidden: This dashboard requires Clinician RBAC authorization.", { status: 403 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
