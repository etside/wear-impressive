import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Hide the floating Next.js dev indicators. The "N" + bot button at the
  // bottom were dimming the dashboard with a full-screen overlay.
  devIndicators: false,

  // Disable Turbopack to avoid WASM binding issues
  turbopack: undefined,

  async rewrites() {
    return [
      // Proxy API requests to the Laravel backend during development
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
