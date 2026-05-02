// lib/auth-admin.ts — Admin role auth guard for API routes
// Returns 401 when unauthenticated, 403 when authenticated but not authorized.
// Also exports generalized requireRole() and named role guards.

import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { error } from '@/lib/api';

// ---------------------------------------------------------------------------
// Role constants — mirrors prisma schema default role + SUPERADMIN
// ---------------------------------------------------------------------------
export const UserRole = {
  VISITOR: 'visitor',
  MEMBER: 'member',       // default after registration
  CREATOR: 'creator',     // can publish / sell
  TEAM_ADMIN: 'team_admin',
  ADMIN: 'admin',         // platform admin
  SUPERADMIN: 'superadmin', // platform owner
} as const;

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];

// Convenience aliases
export const Role = UserRole;

// ---------------------------------------------------------------------------
// Auth result shape
// ---------------------------------------------------------------------------
export interface AuthResult {
  userId: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Internal: resolve user from session token
// ---------------------------------------------------------------------------
async function resolveUser(request: NextRequest): Promise<{ userId: string; role: string } | Response> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error('Authentication required', 401);
  }

  const token = authHeader.slice(7);
  const session = getSession(token);
  if (!session) {
    return error('Invalid or expired session', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true },
  });

  if (!user) {
    return error('User not found', 401);
  }

  return { userId: user.id, role: user.role };
}

// ---------------------------------------------------------------------------
// Generalized requireRole: allow any of the supplied roles
// ---------------------------------------------------------------------------
/**
 * Guard: ensures a valid session exists and the user has one of the allowed roles.
 * Call at the top of any protected route handler.
 *
 * @param allowedRoles - array of role strings (e.g. ['admin', 'superadmin'])
 * @returns AuthResult on success, Response (401/403) on failure
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthResult | Response> {
  const resolved = await resolveUser(request);
  if (resolved instanceof Response) return resolved;

  if (!allowedRoles.includes(resolved.role)) {
    return error(`Access denied: requires one of [${allowedRoles.join(', ')}]`, 403);
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Named convenience guards (exported for ergonomic use in route handlers)
// ---------------------------------------------------------------------------
/** Require SUPERADMIN role */
export async function requireSuperadmin(request: NextRequest): Promise<AuthResult | Response> {
  return requireRole(request, [UserRole.SUPERADMIN]);
}

/** Require ADMIN role */
export async function requireAdmin(request: NextRequest): Promise<AuthResult | Response> {
  return requireRole(request, [UserRole.ADMIN]);
}

/** Require TEAM_ADMIN or ADMIN role */
export async function requireTeamAdmin(request: NextRequest): Promise<AuthResult | Response> {
  return requireRole(request, [UserRole.TEAM_ADMIN, UserRole.ADMIN]);
}

/** Require CREATOR, TEAM_ADMIN, or ADMIN role */
export async function requireCreator(request: NextRequest): Promise<AuthResult | Response> {
  return requireRole(request, [UserRole.CREATOR, UserRole.TEAM_ADMIN, UserRole.ADMIN]);
}

/** Require MEMBER or higher role (any authenticated user) */
export async function requireMember(request: NextRequest): Promise<AuthResult | Response> {
  return requireRole(request, [
    UserRole.MEMBER,
    UserRole.CREATOR,
    UserRole.TEAM_ADMIN,
    UserRole.ADMIN,
    UserRole.SUPERADMIN,
  ]);
}
