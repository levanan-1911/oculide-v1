import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Oculide - AI Proctoring & Laboratory LMS',
  description: 'Hệ thống giám sát phòng thực hành lập trình trực tuyến & gác thi bằng AI chuẩn IEEE 830',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}

