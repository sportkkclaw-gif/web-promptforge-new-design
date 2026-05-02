// instrumentation.ts — Next.js App Router Sentry instrumentation
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// SETUP:
//   1. npm install @sentry/nextjs
//   2. Add SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN to your environment
//   3. Sentry activates automatically when @sentry/nextjs is installed AND
//      DSN env vars are present (env-guarded — won't crash if missing).

// ─── Server-side register (fires once at Next.js server startup) ─────────────
export async function register() {
  // Server-side Sentry config is handled by sentry.server.config.ts and
  // sentry.edge.config.ts which are auto-loaded by the Next.js runtime.
  // The env-guarded init there ensures no crash if @sentry/nextjs is absent
  // or if SENTRY_DSN is not set.
  if (process.env.NODE_ENV === 'development') {
    console.log('[Sentry] Instrumentation registered');
  }
}

// ─── Client-side error handler ───────────────────────────────────────────────
export const onError = (err: Error) => {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const isProduction = process.env.NODE_ENV === 'production';

  // Attempt to capture via dynamic import — only activates if package is installed
  if (dsn && dsn !== 'CHANGE_ME' && isProduction) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require('@sentry/nextjs');
      Sentry.captureException(err);
    } catch {
      // Sentry package not installed — ignore
    }
  }

  // Always log to stderr so noisy errors surface in dev/CI logs
  console.error('[Sentry] Unhandled error:', err.message);

  // Prevent duplicate auto-capture by Next.js instrumentation wrappers
  return false;
};