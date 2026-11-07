import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Chỉ bảo vệ các tuyến đường riêng tư: /admin/*, /instructor/*, /student/*
  const isProtected =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/instructor') ||
    pathname.startsWith('/student');

  if (!isProtected) {
    return NextResponse.next();
  }

  // Ngoại lệ: trang /student/join có thể mở trước để xem giao diện tham gia
  if (pathname === '/student/join') {
    return NextResponse.next();
  }

  const token = request.cookies.get('oculide_token')?.value;
  const role = request.cookies.get('oculide_role')?.value;

  // 1. Chưa đăng nhập (không có cookie token) -> Đá về trang đăng nhập
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Kiểm tra phân quyền vai trò (Role-Based Access)
  if (pathname.startsWith('/admin') && role !== 'admin') {
    const target = role === 'instructor' ? '/instructor/dashboard' : '/student/dashboard';
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (pathname.startsWith('/instructor') && role !== 'instructor' && role !== 'admin') {
    return NextResponse.redirect(new URL('/student/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/instructor/:path*',
    '/student/:path*',
  ],
};
