/** @type {import('next').NextConfig} */

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https://lh3.googleusercontent.com https://maps.googleapis.com https://maps.gstatic.com;
  connect-src 'self' https://maps.googleapis.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, ' ').trim();

const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Control referrer information
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Strict HSTS - only enable when HTTPS is confirmed in production
  // { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Disable browser features not needed
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), geolocation=(self)' },
  // Content Security Policy
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
  // XSS protection (legacy browsers)
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Remove server fingerprint
  { key: 'X-Powered-By', value: '' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,

  // Allow other devices on the local network to access the dev server.
  // List specific LAN IPs and any wildcards needed for your subnet — Next.js
  // dev rejects cross-origin asset requests from any host not listed here.
  allowedDevOrigins: ['192.168.1.113', '192.168.1.215', '192.168.1.*'],

  // Disable source maps in production — reduces build memory & bundle size
  productionBrowserSourceMaps: false,

  // Strip console.* calls from production bundle (keeps dev logs intact)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'maps.googleapis.com' },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders.filter(h => h.value !== ''),
      },
      {
        // Prevent caching of API responses that may contain sensitive data
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },

  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
