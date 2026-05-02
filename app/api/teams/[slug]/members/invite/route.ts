// app/api/teams/[slug]/members/invite/route.ts
// POST /api/teams/:slug/members/invite — create an invite token (owner or admin only)

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';
import crypto from 'crypto';

interface Params { params: { slug: string } }

// RBAC: role hierarchy
const ROLE_LEVEL: Record<string, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

function hasPermission(userRole: string, requiredRole: string): boolean {
  return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[requiredRole] ?? 0);
}

const InviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member', 'viewer']).optional().default('member'),
});

// Token expires in 7 days
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function generateInviteToken(): string {
  return `tmi_${crypto.randomBytes(24).toString('hex')}`;
}

export async function POST(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON', 400);
  }

  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 422);
  }

  const { email, role } = parsed.data;
  const ip = getClientIp(request);

  try {
    const workspace = await prisma.workspace.findUnique({ where: { slug: params.slug } });
    if (!workspace) return error('Team not found', 404);

    // Check permission: only owner or admin can invite
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: workspace.id, userId: session.userId },
      },
    });
    if (!membership) return error('You are not a member of this team', 403);
    if (!hasPermission(membership.role, 'admin')) {
      return error('Only owners and admins can invite members', 403);
    }

    // Find invitee by email
    const invitee = await prisma.user.findUnique({ where: { email } });
    if (!invitee) return error('User not found', 404);

    // Check if already a member
    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: invitee.id } },
    });
    if (existing) return error('User is already a member of this team', 409);

    // Invalidate any existing pending invite for this email/workspace
    await prisma.teamInvite.updateMany({
      where: { workspaceId: workspace.id, email, acceptedAt: null },
      data: { acceptedAt: new Date() }, // soft-expire
    });

    // Create invite token
    const inviteToken = generateInviteToken();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    const invite = await prisma.teamInvite.create({
      data: {
        workspaceId: workspace.id,
        email,
        token: inviteToken,
        teamRole: role,
        invitedById: session.userId,
        expiresAt,
      },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'TEAM_INVITE',
      target: workspace.id,
      metadata: { invitedUserId: invitee.id, invitedEmail: email, teamRole: role, tokenId: invite.id },
      ipAddress: ip,
    });

    // Return the full invite URL (frontend would construct the email link)
    const inviteUrl = `/teams/${params.slug}/join?token=${inviteToken}`;

    return ok({
      invite: {
        id: invite.id,
        email,
        teamRole: role,
        expiresAt: invite.expiresAt.toISOString(),
        inviteUrl,
        invitee: { id: invitee.id, username: invitee.username },
      },
    }, 201);
  } catch (err) {
    console.error('[POST /api/teams/:slug/members/invite] DB error:', err);
    return error('Failed to invite member', 500);
  }
}
