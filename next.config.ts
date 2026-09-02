import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'tesseract.js', 'pdfjs-dist'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '*.ngrok-free.dev', '*.ngrok.app', '*.ngrok.io'],
    },
  },
  // Izinkan request HMR/WebSocket Next.js selama di akses via ngrok
  // allowedDevOrigins: ['crazy-abstain-early.ngrok-free.dev', 'localhost:3000'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none';${process.env.NODE_ENV === 'production' ? ' upgrade-insecure-requests;' : ''}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
