import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  applicationName: 'Oculide',
  title: {
    default: 'Oculide - AI Proctoring & Laboratory LMS',
    template: '%s | Oculide',
  },
  description:
    'Hệ thống quản lý phòng thực hành lập trình và giám sát thi trực tuyến bằng AI.',
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
