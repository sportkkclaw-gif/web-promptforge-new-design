// lib/auth-api-key.ts — API key authentication middleware/helper
// Validates API key tokens from Authorization header against the ApiKey DB store.
// Returns userId on success so callers can use it for quota/logging.
// Does NOT modify the request — purely a validation helper.

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { error } from '@/lib/api';

export interface ApiKeyAuthResult {
  userId: string;
  keyId: string;
}

/**
 * Hash a raw API key the same way it was stored at creation time.
 * Key format: pfk_live_<48 hex chars>
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Validate an API key token from the Authorization header.
 *
 * Contract:
 *  - If header contains a Bearer token that looks like an API key (pfk_live_ prefix),
 *    validate against the ApiKey store.
 *  - Reject revoked/expired/unknown keys with 401.
 *  - Return userId + keyId on success.
 *
 * Returns null if the header doesn't look like an API key (caller should
 * fall back to session auth), or if validation fails.
 */
export async function validateApiKey(authHeader: string | null): Promise<ApiKeyAuthResult | null> {
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token.startsWith('pfk_live_')) return null;

  const keyHash = hashApiKey(token);

  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash },
  });

  if (!apiKey) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update lastUsedAt (fire-and-forget)
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { userId: apiKey.userId, keyId: apiKey.id };
}

/**
 * Middleware helper: enforce API key auth on a NextRequest.
 *
 * Usage in a route handler:
 *   const auth = await requireApiKey(request);
 *   if (auth instanceof Response) return auth; // already sent 401
 *
 * Returns ApiKeyAuthResult on success (caller uses .userId).
 * Returns a NextResponse 401 error when no valid API key is present.
 */
export async function requireApiKey(
  request: NextRequest
): Promise<ApiKeyAuthResult | Response> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return error('No authorization header required for API key auth', 401);
  }
  const result = await validateApiKey(authHeader);
  if (!result) {
    return error('Invalid or expired API key', 401);
  }
  return result;
}
