// POST /api/auth/oauth/:provider
// Initiates OAuth flow for supported providers (google, github)

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { z } from 'zod';
import crypto from 'crypto';
import { writeAuditLog, getClientIp } from '@/lib/audit';

// Supported OAuth providers
const SUPPORTED_PROVIDERS = ['google', 'github'] as const;
type Provider = typeof SUPPORTED_PROVIDERS[number];

// OAuth configuration per provider
interface OAuthProviderConfig {
  clientId: string;
  authorizationUrl: string;
  scopes: string[];
}

// Get OAuth config dynamically to allow env var changes between tests
function getOAuthConfig(provider: Provider): OAuthProviderConfig | null {
  switch (provider) {
    case 'google': {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return null;
      return {
        clientId,
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        scopes: ['openid', 'email', 'profile'],
      };
    }
    case 'github': {
      const clientId = process.env.GITHUB_CLIENT_ID;
      if (!clientId) return null;
      return {
        clientId,
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        scopes: ['read:user', 'user:email'],
      };
    }
    default:
      return null;
  }
}

// In-flight authorization state storage (nonce -> state)
const pendingAuthorizations = new Map<string, { provider: Provider; redirectUri: string; createdAt: Date }>();

const InitRequestSchema = z.object({
  redirectUri: z.string().url('Invalid redirect URI'),
});

/**
 * Validate redirect URI against allowlist and security rules.
 * - Allows URIs matching origins in OAUTH_ALLOWED_REDIRECT_ORIGINS (comma-separated env var)
 * - Falls back to safe localhost development origins (http://localhost:* and http://127.0.0.1:*)
 * - Enforces HTTPS for any non-localhost origin
 * Returns true if allowed, false if rejected.
 */
function isRedirectUriAllowed(redirectUri: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    // Already validated as URL by Zod, but defensive check
    return false;
  }

  const origin = parsed.origin;
  const protocol = parsed.protocol;

  // Check explicit allowlist from env
  const allowedOriginsEnv = process.env.OAUTH_ALLOWED_REDIRECT_ORIGINS;
  if (allowedOriginsEnv) {
    const allowedList = allowedOriginsEnv.split(',').map((s) => s.trim());
    if (allowedList.includes(origin)) {
      return true;
    }
    // Origin not in allowlist
    return false;
  }

  // Default safe origins: any localhost variant (localhost, 127.0.0.1, ::1)
  // Protocol must be http for localhost (https not required for dev)
  if (
    (origin === 'http://localhost' ||
      origin.startsWith('http://localhost:') ||
      origin === 'http://127.0.0.1' ||
      origin.startsWith('http://127.0.0.1:') ||
      origin === 'http://[::1]' ||
      origin.startsWith('http://[::1]:')) &&
    protocol === 'http:'
  ) {
    return true;
  }

  // Non-localhost origins must use HTTPS
  if (protocol !== 'https:') {
    return false;
  }

  // For non-localhost HTTPS origins without explicit allowlist, reject as safe default
  // (prevent open redirect to external domains via HTTPS redirect)
  return false;
}

export async function POST(
  request: NextRequest,
  context: { params: { provider: string } }
) {
  const ip = getClientIp(request);
  const { provider: providerParam } = context.params;

  // Validate provider is supported
  if (!SUPPORTED_PROVIDERS.includes(providerParam as Provider)) {
    return error(
      `Unsupported provider: '${providerParam}'. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`,
      400
    );
  }

  const provider = providerParam as Provider;

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON', 400);
  }

  const parsed = InitRequestSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const { redirectUri } = parsed.data;

  // Enforce redirect URI security validation
  if (!isRedirectUriAllowed(redirectUri)) {
    return error(
      'Redirect URI not allowed. Must be a localhost development URL, an HTTPS origin in OAUTH_ALLOWED_REDIRECT_ORIGINS, or explicitly allowlisted.',
      400
    );
  }

  // Check provider configuration is present
  const config = getOAuthConfig(provider);
  if (!config) {
    return error(`${provider} OAuth not configured`, 500);
  }

  // Build authorization URL with state parameter
  const state = crypto.randomBytes(16).toString('hex');

  // Store state for later verification (with expiry of 10 minutes)
  pendingAuthorizations.set(state, {
    provider,
    redirectUri,
    createdAt: new Date(),
  });

  // Clean up expired states on every request
  const now = new Date();
  for (const [key, val] of pendingAuthorizations) {
    if (now.getTime() - val.createdAt.getTime() > 10 * 60 * 1000) {
      pendingAuthorizations.delete(key);
    }
  }

  // Construct authorization URL
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
  });

  const authorizationUrl = `${config.authorizationUrl}?${params.toString()}`;

  await writeAuditLog({ action: 'OAUTH_INITIATE', metadata: { provider }, ipAddress: ip });

  return ok({
    provider,
    authorizationUrl,
    state, // Client should store this for verification in callback
  });
}