// API Tests: OAuth initiation endpoints
// tests/api/auth-oauth.test.ts

/**
 * @jest-environment node
 */

// Store original env values
const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
const originalGithubClientId = process.env.GITHUB_CLIENT_ID;

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Helper to make mock NextRequest
function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }
  const absoluteUrl = url.startsWith('/') ? BASE_URL + url : url;
  return new Request(absoluteUrl, init) as unknown as import('next/server').NextRequest;
}

afterAll(() => {
  // Restore original env
  if (originalGoogleClientId !== undefined) {
    process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
  } else {
    delete process.env.GOOGLE_CLIENT_ID;
  }
  if (originalGithubClientId !== undefined) {
    process.env.GITHUB_CLIENT_ID = originalGithubClientId;
  } else {
    delete process.env.GITHUB_CLIENT_ID;
  }
  delete process.env.OAUTH_ALLOWED_REDIRECT_ORIGINS;
});

afterEach(() => {
  // Clean up per-test to prevent env bleed between tests
  delete process.env.OAUTH_ALLOWED_REDIRECT_ORIGINS;
});

describe('API: OAuth Initiation', () => {
  describe('POST /api/auth/oauth/:provider', () => {
    it('should reject unsupported provider with 400', async () => {
      // Ensure no env vars so config checks trigger
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_ID;
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/twitter', {
        redirectUri: 'http://localhost:3000/auth/callback',
      });
      const res = await POST(req, { params: { provider: 'twitter' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('Unsupported provider');
      expect(res.status).toBe(400);
    });

    it('should reject missing redirectUri with 400', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_ID;
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {});
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('should reject invalid redirectUri format with 400', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_ID;
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {
        redirectUri: 'not-a-valid-url',
      });
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('should return 500 when google provider config is missing', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_ID;
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {
        redirectUri: 'http://localhost:3000/auth/callback',
      });
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('not configured');
      expect(res.status).toBe(500);
    });

    it('should return 500 when github provider config is missing', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_ID;
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/github', {
        redirectUri: 'http://localhost:3000/auth/callback',
      });
      const res = await POST(req, { params: { provider: 'github' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toContain('not configured');
      expect(res.status).toBe(500);
    });

    it('should reject arbitrary external redirect URI with 400 (open redirect protection)', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_ID;
      // No OAUTH_ALLOWED_REDIRECT_ORIGINS set
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {
        redirectUri: 'https://evil.com/oauth/callback',
      });
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(400);
      expect(json.error).toContain('not allowed');
    });

    it('should reject http:// external domain redirect URI with 400', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_ID;
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {
        redirectUri: 'http://attacker-site.com/callback',
      });
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('should reject non-allowlisted HTTPS origin with 400', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_ID;
      // OAUTH_ALLOWED_REDIRECT_ORIGINS does NOT include https://legitimate-site.com
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {
        redirectUri: 'https://legitimate-site.com/auth/callback',
      });
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('should accept HTTPS origin when explicitly allowlisted via env', async () => {
      delete process.env.GITHUB_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
// Allowlist includes https://app.example.com
process.env.OAUTH_ALLOWED_REDIRECT_ORIGINS = 'https://app.example.com';
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {
        redirectUri: 'https://app.example.com/auth/callback',
      });
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(res.status).toBe(200);
      expect(json.data.authorizationUrl).toContain('accounts.google.com');
    });

    it('should reject HTTPS origin not in env allowlist with 400', async () => {
      delete process.env.GITHUB_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
// Only allowlist app.example.com, not other-site.com
process.env.OAUTH_ALLOWED_REDIRECT_ORIGINS = 'https://app.example.com';
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {
        redirectUri: 'https://other-site.com/callback',
      });
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('should allow localhost redirect URIs for development', async () => {
      delete process.env.GITHUB_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      // No OAUTH_ALLOWED_REDIRECT_ORIGINS set
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {
        redirectUri: 'http://localhost:3000/auth/callback',
      });
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should allow 127.0.0.1 redirect URIs for development', async () => {
      delete process.env.GITHUB_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {
        redirectUri: 'http://127.0.0.1:8080/auth/callback',
      });
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should allow IPv6 localhost redirect URIs with port for development', async () => {
      delete process.env.GITHUB_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {
        redirectUri: 'http://[::1]:3000/auth/callback',
      });
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should reject https://localhost as non-dev protocol without allowlist', async () => {
      delete process.env.GITHUB_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      // localhost HTTPS is not allowed without explicit allowlist
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {
        redirectUri: 'https://localhost:3000/auth/callback',
      });
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(400);
    });

    it('should accept https://localhost when explicitly allowlisted', async () => {
      delete process.env.GITHUB_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.OAUTH_ALLOWED_REDIRECT_ORIGINS = 'https://localhost:3000';
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {
        redirectUri: 'https://localhost:3000/auth/callback',
      });
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(res.status).toBe(200);
    });

    it('should initiate OAuth flow for google provider when configured', async () => {
      // Set up env for this test
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      delete process.env.GITHUB_CLIENT_ID;
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/google', {
        redirectUri: 'http://localhost:3000/auth/callback',
      });
      const res = await POST(req, { params: { provider: 'google' } });
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.authorizationUrl).toContain('accounts.google.com');
      expect(json.data.provider).toBe('google');
      expect(json.data.state).toBeDefined();
      expect(res.status).toBe(200);
    });

    it('should initiate OAuth flow for github provider when configured', async () => {
      // Set up env for this test
      delete process.env.GOOGLE_CLIENT_ID;
      process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
      const { POST } = await import('../../app/api/auth/oauth/route');

      const req = makeRequest('POST', '/api/auth/oauth/github', {
        redirectUri: 'http://localhost:3000/auth/callback',
      });
      const res = await POST(req, { params: { provider: 'github' } });
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.authorizationUrl).toContain('github.com');
      expect(json.data.provider).toBe('github');
      expect(json.data.state).toBeDefined();
      expect(res.status).toBe(200);
    });
  });
});
