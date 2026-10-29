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
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      {
        source: '/docs',
        destination: 'http://localhost:8000/docs',
      },
      {
        source: '/openapi.json',
        destination: 'http://localhost:8000/openapi.json',
      },
    ];
  },
};

module.exports = nextConfig;
