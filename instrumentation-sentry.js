// instrumentation-sentry.js — Safe Sentry re-export
// This module dynamically imports @sentry/nextjs only when available.
// It replaces the direct static import so Next.js build doesn't fail
// when @sentry/nextjs is not installed.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

'use strict';

let Sentry;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require('@sentry/nextjs');
} catch {
  Sentry = undefined;
}

module.exports = { Sentry };
// Re-export as named export to match the ESM-style import in instrumentation.ts
module.exports.Sentry = Sentry;
module.exports.Sentry = Sentry;