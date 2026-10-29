// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        // Admin app service worker controls /admin (it lives at the site root).
        source: '/admin-sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/admin' },
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
      {
        source: '/admin-manifest.webmanifest',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
      {
        // Admin pages and customer invoice links must never be cached or indexed.
        source: '/(admin|i)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/admin/dashboard', destination: '/admin', permanent: true },
      { source: '/admin/appointments', destination: '/admin/schedule', permanent: true },
      { source: '/admin/vehicles', destination: '/admin/inventory', permanent: true },
      { source: '/admin/testimonials', destination: '/admin/reviews', permanent: true },
    ];
  },
};

module.exports = nextConfig;
