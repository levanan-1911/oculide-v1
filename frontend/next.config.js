/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/admin/dashboard',
        permanent: true,
      },
      {
        source: '/class-manager',
        destination: '/admin/classes',
        permanent: true,
      },
      {
        source: '/user-manager',
        destination: '/admin/users',
        permanent: true,
      },
      {
        source: '/question-manager',
        destination: '/admin/questions',
        permanent: true,
      },
      {
        source: '/schedule-manager',
        destination: '/admin/schedules',
        permanent: true,
      },
      {
        source: '/monitoring-manager',
        destination: '/admin/monitoring',
        permanent: true,
      },
      {
        source: '/report-manager',
        destination: '/admin/reports',
        permanent: true,
      },
      {
        source: '/system-manager',
        destination: '/admin/system',
        permanent: true,
      },
      {
        source: '/join',
        destination: '/student/join',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/docs',
        destination: `${backendUrl}/docs`,
      },
      {
        source: '/openapi.json',
        destination: `${backendUrl}/openapi.json`,
      },
    ];
  },
};

module.exports = nextConfig;
