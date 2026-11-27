import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function parseJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function isTokenExpired(payload: any): boolean {
  if (!payload || !payload.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rawToken = request.cookies.get('oculide_token')?.value;
  const cookieRole = request.cookies.get('oculide_role')?.value;

  const payload = rawToken ? parseJwtPayload(rawToken) : null;
  const tokenValid = Boolean(rawToken && payload && !isTokenExpired(payload));
  const userRole = (cookieRole || payload?.role || '').toLowerCase();

  // 1. Nếu đã đăng nhập hợp lệ mà truy cập trang /login -> Tự động chuyển hướng về Dashboard tương ứng
  if (pathname === '/login') {
    if (tokenValid) {
      const target =
        userRole === 'admin'
          ? '/admin/dashboard'
          : userRole === 'instructor'
          ? '/instructor/dashboard'
          : '/student/dashboard';
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  // 2. Chỉ bảo vệ các tuyến đường riêng tư: /admin/*, /instructor/*, /student/*, /profile
  const isProtected =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/instructor') ||
    pathname.startsWith('/student') ||
    pathname === '/profile';

  if (!isProtected) {
    return NextResponse.next();
  }

  // 3. Chưa đăng nhập hoặc Token đã hết hạn -> Chặn đứng và chuyển hướng về /login
  if (!tokenValid) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', `${pathname}${request.nextUrl.search}`);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('oculide_token');
    response.cookies.delete('oculide_role');
    return response;
  }

  // 4. Kiểm tra phân quyền truy cập theo vai trò (Role-Based Access Control)
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    const target = userRole === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (pathname.startsWith('/instructor') && userRole !== 'instructor' && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/student/dashboard', request.url));
  }

  if (pathname.startsWith('/student') && userRole !== 'student') {
    const target = userRole === 'admin' ? '/admin/dashboard' : '/instructor/dashboard';
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/admin/:path*',
    '/instructor/:path*',
    '/student/:path*',
    '/profile',
  ],
};
