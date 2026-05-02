// POST /api/users/me/api-keys
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const KEY_PREFIX = 'pfk_live_';

const CreateKeySchema = z.object({
  name: z
    .string()
    .min(1, 'name must be a 1–100 character string')
    .max(100, 'name must be a 1–100 character string'),
  expiresInDays: z
    .number({ errorMap: () => ({ message: 'expiresInDays must be a positive integer' }) })
    .int('expiresInDays must be a positive integer')
    .positive('expiresInDays must be a positive integer')
    .optional(),
});

/** Hash a raw API key for storage */
function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * The first 8 chars of the SHA-256 hash of the raw key.
 * Stored as-is in DB; prepended with KEY_PREFIX only when returned in API responses.
 * DB field comment says "e.g. pfk_live_" but the actual stored value is just the 8 hex chars.
 */
function keyPrefix(hash: string): string {
  return hash.slice(0, 8);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return error('No token provided', 401);
  }

  const session = getSession(token);
  if (!session) {
    return error('Session expired or invalid', 401);
  }

  let keys;
  try {
    keys = await prisma.apiKey.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.error('[GET /api/users/me/api-keys] DB error:', err);
    return error('Internal server error', 500);
  }

  // Never return keyHash — only safe metadata
  return ok(
    keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: KEY_PREFIX + k.keyPrefix,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })),
  );
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const ip = getClientIp(request);

  if (!token) {
    return error('No token provided', 401);
  }

  const session = getSession(token);
  if (!session) {
    return error('Session expired or invalid', 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = CreateKeySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.errors[0];
    const msg = issue?.message || 'Validation failed';
    // Zod 3.x with errorMap: missing object property shows "Required" instead of custom message
    if (msg === 'Required' && issue?.path?.[0] === 'name') {
      return error('name must be a 1–100 character string', 400);
    }
    return error(msg, 400);
  }

  const { name, expiresInDays } = parsed.data;

  let expiresAt: Date | null = null;
  if (expiresInDays != null) {
    expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  }

  // Generate raw key: prefix + 48 random hex chars = 56 total chars
  const randomPart = crypto.randomBytes(24).toString('hex');
  const rawKey = KEY_PREFIX + randomPart;
  const keyHash = hashKey(rawKey);

  let created;
  try {
    created = await prisma.apiKey.create({
      data: {
        userId: session.userId,
        name,
        keyPrefix: keyPrefix(keyHash),
        keyHash,
        expiresAt,
      },
    });
  } catch (err) {
    console.error('[POST /api/users/me/api-keys] DB error:', err);
    return error('Internal server error', 500);
  }

  await writeAuditLog({
    userId: session.userId,
    action: 'API_KEY_CREATE',
    target: created.id,
    metadata: { name, expiresAt: expiresAt?.toISOString() ?? null },
    ipAddress: ip,
  });

  // Return raw key ONLY on creation — it cannot be retrieved again
  return ok(
    {
      id: created.id,
      name: created.name,
      key: rawKey,
      keyPrefix: KEY_PREFIX + created.keyPrefix,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
    },
    201,
  );
}
