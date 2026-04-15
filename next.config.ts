import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.39.1.55', '10.39.8.59', 'alwahaapools.local'],
  images: {
    unoptimized: true,
  },
  experimental: {
    proxyClientMaxBodySize: '25mb',
  },
};

export default nextConfig;
