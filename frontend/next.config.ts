import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'https://stunning-acceptance-production-9c5c.up.railway.app/api/v1/:path*',
      },
    ];
  },
};
export default nextConfig;
