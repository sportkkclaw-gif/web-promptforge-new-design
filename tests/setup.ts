// Test setup: patch Node 24 fetch to accept relative URLs (for API route tests)
// Node 24+ fetch requires absolute URLs, but our tests use relative /api/... paths

const originalFetch = globalThis.fetch;
const SETUP_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

globalThis.fetch = function fetchWrapper(url, options) {
  if (typeof url === 'string' && url.startsWith('/')) {
    return originalFetch(SETUP_BASE_URL + url, options);
  }
  return originalFetch(url, options);
};

// Reset rate limit store between test files to avoid cross-test pollution
import { resetRateLimitStore } from '../lib/security/rate-limit';
if (typeof (globalThis as { beforeEach?: (fn: () => void) => void }).beforeEach === 'function') {
  ((globalThis as unknown) as { beforeEach: (fn: () => void) => void }).beforeEach(() => {
    resetRateLimitStore();
  });
}
