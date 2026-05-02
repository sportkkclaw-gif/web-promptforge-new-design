// This file configures the Sentry SDK for Edge runtime error tracking.
// It is automatically loaded by Next.js Edge runtime.
// Env-guarded: Sentry only activates when SENTRY_DSN is configured AND
// @sentry/nextjs package is installed.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

let initSentry = false;

try {
  // Dynamic import — only succeeds if @sentry/nextjs is installed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/nextjs');
  const dsn = process.env.SENTRY_DSN;

  if (dsn && dsn !== 'CHANGE_ME') {
    Sentry.init({
      dsn,
      debug: process.env.NODE_ENV === 'development',
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
      sampleRate: process.env.NODE_ENV === 'production' ? 0.5 : 1.0,
      enabled: ['production', 'staging'].includes(process.env.NODE_ENV || ''),
      ignoreErrors: ['TypeError: Failed to fetch'],
      attachStacktrace: true,
      normalizeDepth: 4,
    });
    initSentry = true;
    console.log('[Sentry] Edge SDK initialized');
  } else {
    console.log('[Sentry] Edge SDK skipped — SENTRY_DSN not configured');
  }
} catch {
  console.log('[Sentry] Edge SDK skipped — @sentry/nextjs not installed (run: npm install @sentry/nextjs)');
}

export { initSentry };