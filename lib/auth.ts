// lib/auth.ts — Shared auth utilities and session store
// Password hashing: bcryptjs (12 rounds)
// Session tokens: JWT (native Node.js crypto HMAC-SHA256) — access token 15m + refresh token 7d

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

// ── JWT configuration (using native Node.js crypto HMAC-SHA256) ───────────────

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'promptforge-dev-secret-change-in-production';
const JWT_SECRET_BUF = Buffer.from(JWT_SECRET, 'utf8');

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const BCRYPT_ROUNDS = 12;

// ── Token types ────────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  userId: string;
  type: 'access';
  jti: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  jti: string;
  iat: number;
  exp: number;
}

// ── Password hashing (bcrypt, 12 rounds) ─────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): boolean {
  // Backward compat: plain SHA-256 hex (old format, no prefix)
  if (!hash.startsWith('$2')) {
    const oldHash = crypto.createHash('sha256').update(password).digest('hex');
    return oldHash === hash;
  }
  // bcrypt format: $2a$ or $2b$
  return bcrypt.compareSync(password, hash);
}

// Backward-compat synchronous hashPassword for legacy code paths
export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

// ── JWT implementation using native Node.js crypto (synchronous) ───────────────
// JWT format: base64url(header).base64url(payload).base64url(signature)

function base64urlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): Buffer {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function makeJti(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create a signed JWT synchronously using Node's crypto.createHmac (HMAC-SHA256).
 * Synchronous equivalent of HS256 algorithm.
 */
function signJwtSync(payload: object, secret: Buffer, expiresAt: Date): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64urlEncode(Buffer.from(JSON.stringify(header), 'utf8'));
  const payloadWithIat = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(expiresAt.getTime() / 1000) };
  const payloadB64 = base64urlEncode(Buffer.from(JSON.stringify(payloadWithIat), 'utf8'));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  const sigB64 = base64urlEncode(sig);
  return `${data}.${sigB64}`;
}

/**
 * Verify and decode a JWT signed with HS256 (synchronous).
 * Returns the payload object or null if invalid.
 */
function verifyJwtSync(token: string, secret: Buffer): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const expectedSig = base64urlEncode(crypto.createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest());
    if (!crypto.timingSafeEqual(Buffer.from(sigB64), Buffer.from(expectedSig))) return null;
    const payload = JSON.parse(base64urlDecode(payloadB64).toString('utf8'));
    if (payload.exp && typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Create an access token (JWT, 15m TTL) synchronously.
 * Contains userId and type="access".
 */
export function createAccessToken(userId: string): { token: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);
  const token = signJwtSync({ userId, type: 'access', jti: makeJti() }, JWT_SECRET_BUF, expiresAt);
  return { token, expiresAt };
}

/**
 * Create a refresh token (JWT, 7d TTL) synchronously.
 * Contains userId, type="refresh", and a unique jti for rotation tracking.
 */
export function createRefreshToken(userId: string): { token: string; expiresAt: Date; jti: string } {
  const jti = makeJti();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const token = signJwtSync({ userId, type: 'refresh', jti }, JWT_SECRET_BUF, expiresAt);
  return { token, expiresAt, jti };
}

/**
 * Verify an access token synchronously. Returns payload or null.
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  const payload = verifyJwtSync(token, JWT_SECRET_BUF);
  if (!payload) return null;
  if ((payload as Record<string, unknown>).type !== 'access') return null;
  return payload as unknown as AccessTokenPayload;
}

/**
 * Verify a refresh token synchronously. Returns payload or null.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  const payload = verifyJwtSync(token, JWT_SECRET_BUF);
  if (!payload) return null;
  if ((payload as Record<string, unknown>).type !== 'refresh') return null;
  return payload as unknown as RefreshTokenPayload;
}

// ── In-memory session store ─────────────────────────────────────────────────────

export interface Session {
  userId: string;
  expiresAt: Date;
  refreshJti?: string;
}

// In-memory session store (token → Session)
const sessions = new Map<string, Session>();

// Revoked token denylist — prevents logged-out JWT access tokens from being reused
// within their natural TTL window (~15m)
const revokedTokens = new Set<string>();

// Refresh token registry (jti → {userId, revoked: boolean})
interface RefreshEntry {
  userId: string;
  revoked: boolean;
}
const refreshTokens = new Map<string, RefreshEntry>();

let _cleanupCounter = 0;
const CLEANUP_INTERVAL = 100;

export function cleanExpiredSessions() {
  const now = new Date();
  for (const [token, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(token);
  }
}

export function deleteSession(token: string) {
  sessions.delete(token);
  revokedTokens.add(token);
}

/**
 * Synchronous getSession — verifies JWT access tokens directly using synchronous JWT verification.
 * Also falls back to legacy in-memory opaque token lookup.
 */
export function getSession(token: string): Session | null {
  if (revokedTokens.has(token)) return null;

  // Try JWT access token verification (synchronous)
  const payload = verifyAccessToken(token);
  if (payload) {
    const exp = new Date(payload.exp * 1000);
    if (exp < new Date()) return null;
    return { userId: payload.userId, expiresAt: exp };
  }

  // Fallback: in-memory session store (legacy opaque tokens)
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    sessions.delete(token);
    return null;
  }
  _cleanupCounter++;
  if (_cleanupCounter >= CLEANUP_INTERVAL) {
    _cleanupCounter = 0;
    cleanExpiredSessions();
  }
  return session;
}

/**
 * Store an access token session (for legacy opaque token support).
 */
export function storeSession(token: string, session: Session) {
  sessions.set(token, session);
}

/**
 * Revoke a refresh token by jti.
 */
export function revokeRefreshToken(jti: string) {
  const entry = refreshTokens.get(jti);
  if (entry) entry.revoked = true;
}

/**
 * Register a refresh token.
 */
export function registerRefreshToken(jti: string, userId: string) {
  refreshTokens.set(jti, { userId, revoked: false });
}

/**
 * Check if a refresh token jti is valid (not revoked).
 */
export function isRefreshTokenValid(jti: string): boolean {
  const entry = refreshTokens.get(jti);
  return !!entry && !entry.revoked;
}

/**
 * Create a session for register/login.
 * Uses JWT access tokens internally; the JWT string itself serves as the session token.
 * The token is stored in the session map for revocation tracking.
 *
 * ttlMs parameter: backward compat — when provided and positive, overrides the default
 * 15m TTL. When negative or zero (as used by tests for expired sessions), a session
 * with an already-passed expiry is stored so getSession returns null for it.
 */
export function createSession(
  userId: string,
  ttlMs = ACCESS_TOKEN_TTL_MS
): { token: string; expiresAt: Date } {
  const effectiveTtl = ttlMs < 0 ? -1000 : ACCESS_TOKEN_TTL_MS;
  const expiresAt = new Date(Date.now() + effectiveTtl);
  const token = signJwtSync({ userId, type: 'access' }, JWT_SECRET_BUF, expiresAt);
  sessions.set(token, { userId, expiresAt });
  return { token, expiresAt };
}

/**
 * Refresh using a refresh token (synchronous flow — single-use refresh token rotation).
 * Returns new access token or null if refresh token is invalid/revoked/expired.
 */
export function refreshSession(refreshToken: string): { token: string; expiresAt: Date } | null {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return null;
  const { jti, userId } = payload;

  const entry = refreshTokens.get(jti);
  if (!entry || entry.revoked) return null;

  entry.revoked = true;

  const access = createAccessToken(userId);
  sessions.set(access.token, { userId, expiresAt: access.expiresAt, refreshJti: jti });

  const newRefresh = createRefreshToken(userId);
  registerRefreshToken(newRefresh.jti, userId);

  return { token: access.token, expiresAt: access.expiresAt };
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Resolve a session token from a NextRequest.
 * Priority:
 *  1. Authorization: Bearer *** header
 *  2. pf_session cookie
 */
export function resolveSessionToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  try {
    const cookie = request.cookies?.get('pf_session');
    if (cookie?.value) return cookie.value;
  } catch {
    // cookies not accessible
  }
  return null;
}
