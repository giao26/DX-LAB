import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1'],
  async headers() {
    return ['/portal/:path*', '/bff/session/:path*'].map(source => ({ source, headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }] }));
  },
};

export default nextConfig;
