import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Hide the floating Next.js dev indicators. The "N" + bot button at the
  // bottom were dimming the dashboard with a full-screen overlay.
  devIndicators: false,

  // Disable Turbopack to avoid WASM binding issues
  turbopack: undefined,

  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
