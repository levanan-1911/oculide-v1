import type { Metadata, Viewport } from 'next';
import React from 'react';
import './globals.css';
import IpPreloader from '@/components/common/IpPreloader';

export const metadata: Metadata = {
  applicationName: 'Oculide',
  title: {
    default: 'Oculide - AI Proctoring & Laboratory LMS',
    template: '%s | Oculide',
  },
  description:
    'Hệ thống quản lý phòng thực hành lập trình và giám sát thi trực tuyến bằng AI.',
  icons: {
    icon: '/oculide-logo.png',
    shortcut: '/oculide-logo.png',
    apple: '/oculide-logo.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#91040A',
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;0,900;1,300;1,400;1,500;1,700;1,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans text-foreground antialiased">
        <IpPreloader />
        {children}
      </body>
    </html>
  );
}
