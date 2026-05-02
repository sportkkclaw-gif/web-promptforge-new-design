// API Tests: Email Verification + Password Reset auth flows (route module unit tests)
// tests/api/auth-email-password.test.ts

/**
 * @jest-environment node
 */

import { hashPassword, createSession, deleteSession, getSession } from '../../lib/auth';

// Dynamically import route modules to test handler functions directly
let registerRoute: typeof import('../../app/api/auth/register/route');
let loginRoute: typeof import('../../app/api/auth/login/route');
let verifyEmailRoute: typeof import('../../app/api/auth/verify-email/route');
let forgotPasswordRoute: typeof import('../../app/api/auth/forgot-password/route');
let resetPasswordRoute: typeof import('../../app/api/auth/reset-password/route');

beforeAll(async () => {
  registerRoute = await import('../../app/api/auth/register/route');
  loginRoute = await import('../../app/api/auth/login/route');
  verifyEmailRoute = await import('../../app/api/auth/verify-email/route');
  forgotPasswordRoute = await import('../../app/api/auth/forgot-password/route');
  resetPasswordRoute = await import('../../app/api/auth/reset-password/route');
});

// Helper to make mock NextRequest
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

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

function makeAuthorizedRequest(
  method: string,
  url: string,
  token: string,
  body?: unknown
) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  return makeRequest(method, url, body, headers);
}

// ---------------------------------------------------------------------------
// POST /api/auth/verify-email
// ---------------------------------------------------------------------------
describe('POST /api/auth/verify-email', () => {
  it('verifies email with valid deterministic token (register → verify)', async () => {
    // Register a test user — register now issues a deterministic emailVerifyToken in test mode
    const uniqueEmail = `test_verify_${Date.now()}@example.com`;
    const uniqueUsername = `testverify_${Date.now()}`;
    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'password123',
      })
    );
    expect(regRes.status).toBe(201);
    const regJson = await regRes.json();
    expect(regJson.ok).toBe(true);
    const userId = regJson.data.user.id;
    const emailVerifyToken = regJson.data.emailVerifyToken as string;
    expect(emailVerifyToken).toBeDefined();
    expect(emailVerifyToken.startsWith('verify_')).toBe(true);

    // Use the emailVerifyToken returned from register to verify the email
    const verifyRes = await verifyEmailRoute.POST(
      makeRequest('POST', '/api/auth/verify-email', { token: emailVerifyToken })
    );
    expect(verifyRes.status).toBe(200);
    const verifyJson = await verifyRes.json();
    expect(verifyJson.ok).toBe(true);
    expect(verifyJson.data.message).toBe('Email verified successfully');
  });

  it('returns 401 for invalid token', async () => {
    const res = await verifyEmailRoute.POST(
      makeRequest('POST', '/api/auth/verify-email', { token: 'not_a_valid_token' })
    );
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toBe('Invalid or expired token');
  });

  it('returns 401 for token with no matching user', async () => {
    const res = await verifyEmailRoute.POST(
      makeRequest('POST', '/api/auth/verify-email', { token: 'verify_nonexistentuserid' })
    );
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('returns 401 when reusing an already-consumed verify token', async () => {
    // Register + verify
    const uniqueEmail = `test_already_${Date.now()}@example.com`;
    const uniqueUsername = `testalready_${Date.now()}`;
    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'password123',
      })
    );
    const { data: regData } = await regRes.json();
    const emailVerifyToken = regData.emailVerifyToken as string;

    // Verify the first time
    await verifyEmailRoute.POST(
      makeRequest('POST', '/api/auth/verify-email', { token: emailVerifyToken })
    );

    // Verify token is one-time use — second attempt should fail
    const res2 = await verifyEmailRoute.POST(
      makeRequest('POST', '/api/auth/verify-email', { token: emailVerifyToken })
    );
    const json2 = await res2.json();
    expect(json2.ok).toBe(false);
    expect(json2.error).toBe('Invalid or expired token');
    expect(res2.status).toBe(401);
  });

  it('returns 422 for missing token (Zod validation)', async () => {
    const res = await verifyEmailRoute.POST(
      makeRequest('POST', '/api/auth/verify-email', {})
    );
    expect(res.status).toBe(422);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request(BASE_URL + '/api/auth/verify-email', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as import('next/server').NextRequest;
    const res = await verifyEmailRoute.POST(req);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------
describe('POST /api/auth/forgot-password', () => {
  it('returns deterministic reset token for test user', async () => {
    const uniqueEmail = `test_fp_${Date.now()}@example.com`;
    const uniqueUsername = `testfp_${Date.now()}`;

    // Register first
    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'password123',
      })
    );
    const { data: regData } = await regRes.json();
    const userId = regData.user.id;

    // Request password reset
    const fpRes = await forgotPasswordRoute.POST(
      makeRequest('POST', '/api/auth/forgot-password', { email: uniqueEmail })
    );
    expect(fpRes.status).toBe(200);
    const fpJson = await fpRes.json();
    expect(fpJson.ok).toBe(true);
    expect(fpJson.data.message).toBe('If that email exists, a reset link has been sent');
    expect(fpJson.data.resetToken).toBe(`reset_verify_${userId}`);
  });

  it('returns 200 but no token for non-test email (email enumeration prevention)', async () => {
    const fpRes = await forgotPasswordRoute.POST(
      makeRequest('POST', '/api/auth/forgot-password', { email: 'realuser@example.com' })
    );
    expect(fpRes.status).toBe(200);
    const json = await fpRes.json();
    expect(json.ok).toBe(true);
    // Non-test users don't get token in response (would be sent via email in production)
    expect(json.data.resetToken).toBeUndefined();
  });

  it('returns 200 even for non-existent email (info leakage prevention)', async () => {
    const fpRes = await forgotPasswordRoute.POST(
      makeRequest('POST', '/api/auth/forgot-password', { email: 'nobody@example.com' })
    );
    expect(fpRes.status).toBe(200);
    const json = await fpRes.json();
    expect(json.ok).toBe(true);
  });

  it('returns 422 for invalid email format', async () => {
    const res = await forgotPasswordRoute.POST(
      makeRequest('POST', '/api/auth/forgot-password', { email: 'not-an-email' })
    );
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(422);
  });

  it('returns 400 for missing email', async () => {
    const res = await forgotPasswordRoute.POST(
      makeRequest('POST', '/api/auth/forgot-password', {})
    );
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(422);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request(BASE_URL + '/api/auth/forgot-password', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as import('next/server').NextRequest;
    const res = await forgotPasswordRoute.POST(req);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// ---------------------------------------------------------------------------
describe('POST /api/auth/reset-password', () => {
  it('resets password successfully with valid deterministic token', async () => {
    const uniqueEmail = `test_reset_${Date.now()}@example.com`;
    const uniqueUsername = `testreset_${Date.now()}`;
    const originalPassword = 'originalPass123';
    const newPassword = 'newPassword456';

    // Register
    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: originalPassword,
      })
    );
    const { data: regData } = await regRes.json();
    const userId = regData.user.id;

    // Issue reset token
    const fpRes = await forgotPasswordRoute.POST(
      makeRequest('POST', '/api/auth/forgot-password', { email: uniqueEmail })
    );
    const { data: fpData } = await fpRes.json();
    const resetToken = fpData.resetToken as string;

    // Reset password
    const resetRes = await resetPasswordRoute.POST(
      makeRequest('POST', '/api/auth/reset-password', {
        token: resetToken,
        newPassword,
      })
    );
    expect(resetRes.status).toBe(200);
    const resetJson = await resetRes.json();
    expect(resetJson.ok).toBe(true);
    expect(resetJson.data.message).toBe('Password reset successfully');

    // Old password no longer works
    const oldLoginRes = await loginRoute.POST(
      makeRequest('POST', '/api/auth/login', { email: uniqueEmail, password: originalPassword })
    );
    expect(oldLoginRes.status).toBe(401);

    // New password works
    const newLoginRes = await loginRoute.POST(
      makeRequest('POST', '/api/auth/login', { email: uniqueEmail, password: newPassword })
    );
    expect(newLoginRes.status).toBe(200);
    const newLoginJson = await newLoginRes.json();
    expect(newLoginJson.ok).toBe(true);
    expect(newLoginJson.data.user.id).toBe(userId);
  });

  it('returns 401 for invalid token', async () => {
    const res = await resetPasswordRoute.POST(
      makeRequest('POST', '/api/auth/reset-password', {
        token: 'not_a_valid_token',
        newPassword: 'newPassword123',
      })
    );
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
    expect(json.error).toBe('Invalid or expired token');
  });

  it('returns 401 for token not matching any user', async () => {
    const res = await resetPasswordRoute.POST(
      makeRequest('POST', '/api/auth/reset-password', {
        token: 'reset_verify_nonexistentuser',
        newPassword: 'newPassword123',
      })
    );
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('returns 401 for expired token (token reuse prevention — token already invalidated)', async () => {
    const uniqueEmail = `test_expired_${Date.now()}@example.com`;
    const uniqueUsername = `testexpired_${Date.now()}`;

    await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'password123',
      })
    );

    const fpRes = await forgotPasswordRoute.POST(
      makeRequest('POST', '/api/auth/forgot-password', { email: uniqueEmail })
    );
    const { data: fpData } = await fpRes.json();
    const resetToken = fpData.resetToken as string;

    // First reset succeeds
    await resetPasswordRoute.POST(
      makeRequest('POST', '/api/auth/reset-password', {
        token: resetToken,
        newPassword: 'firstPass123',
      })
    );

    // Second use of same token fails (token was invalidated after first use)
    const secondRes = await resetPasswordRoute.POST(
      makeRequest('POST', '/api/auth/reset-password', {
        token: resetToken,
        newPassword: 'secondPass456',
      })
    );
    const secondJson = await secondRes.json();
    expect(secondJson.ok).toBe(false);
    expect(secondRes.status).toBe(401);
    expect(secondJson.error).toBe('Invalid or expired token');
  });

  it('returns 422 for password < 8 chars', async () => {
    const res = await resetPasswordRoute.POST(
      makeRequest('POST', '/api/auth/reset-password', {
        token: 'some_token',
        newPassword: 'short',
      })
    );
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(422);
  });

  it('returns 422 for missing token', async () => {
    const res = await resetPasswordRoute.POST(
      makeRequest('POST', '/api/auth/reset-password', { newPassword: 'newPassword123' })
    );
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(422);
  });

  it('returns 422 for missing newPassword', async () => {
    const res = await resetPasswordRoute.POST(
      makeRequest('POST', '/api/auth/reset-password', { token: 'some_token' })
    );
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(res.status).toBe(422);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request(BASE_URL + '/api/auth/reset-password', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as import('next/server').NextRequest;
    const res = await resetPasswordRoute.POST(req);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Sensitive-data safety: passwordHash must never appear in API responses
// ---------------------------------------------------------------------------
describe('Sensitive-data safety: no passwordHash leakage', () => {
  it('register response must not contain passwordHash', async () => {
    const uniqueEmail = `test_noleak_${Date.now()}@example.com`;
    const uniqueUsername = `testnoleak_${Date.now()}`;
    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'password123',
      })
    );
    const json = await regRes.json();
    expect(json.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(json.data)).not.toContain('passwordHash');
  });

  it('session response must not contain passwordHash', async () => {
    const uniqueEmail = `test_session_noleak_${Date.now()}@example.com`;
    const uniqueUsername = `testsessnoleak_${Date.now()}`;
    const regRes = await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'password123',
      })
    );
    const { data } = await regRes.json();
    const token = data.token;

    const sessionRes = await loginRoute.POST(
      makeRequest('POST', '/api/auth/login', { email: uniqueEmail, password: 'password123' })
    );
    const sessionJson = await sessionRes.json();
    expect(JSON.stringify(sessionJson.data)).not.toContain('passwordHash');
    expect(sessionJson.data.user?.passwordHash).toBeUndefined();
  });

  it('login response must not contain passwordHash', async () => {
    const uniqueEmail = `test_login_noleak_${Date.now()}@example.com`;
    const uniqueUsername = `testloginnoleak_${Date.now()}`;
    await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'password123',
      })
    );
    const loginRes = await loginRoute.POST(
      makeRequest('POST', '/api/auth/login', { email: uniqueEmail, password: 'password123' })
    );
    const json = await loginRes.json();
    expect(json.data?.user?.passwordHash).toBeUndefined();
    expect(JSON.stringify(json.data)).not.toContain('passwordHash');
  });

  it('forgot-password response must not contain passwordHash', async () => {
    const uniqueEmail = `test_fp_noleak_${Date.now()}@example.com`;
    const uniqueUsername = `testfpnoleak_${Date.now()}`;
    await registerRoute.POST(
      makeRequest('POST', '/api/auth/register', {
        email: uniqueEmail,
        username: uniqueUsername,
        password: 'password123',
      })
    );
    const fpRes = await forgotPasswordRoute.POST(
      makeRequest('POST', '/api/auth/forgot-password', { email: uniqueEmail })
    );
    const json = await fpRes.json();
    expect(JSON.stringify(json.data)).not.toContain('passwordHash');
  });
});
