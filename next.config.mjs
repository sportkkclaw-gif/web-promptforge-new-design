/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },
  // Sentry is configured via sentry.server.config.ts and sentry.edge.config.ts
  // These activate automatically when @sentry/nextjs is installed and
  // SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN env vars are set (env-guarded).
  // Auto-instrumentation via instrumentation.ts register() function.
};

export default nextConfig;
