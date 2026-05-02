// app/api/teams/[slug]/members/accept/route.ts
// POST /api/teams/:slug/members/accept — accept an invite with a token

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

interface Params { params: { slug: string } }

const AcceptSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

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

  const parsed = AcceptSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 422);
  }

  const { token: inviteToken } = parsed.data;
  const ip = getClientIp(request);

  try {
    // Verify the team slug matches
    const workspace = await prisma.workspace.findUnique({ where: { slug: params.slug } });
    if (!workspace) return error('Team not found', 404);

    // Find the invite by token
    const invite = await prisma.teamInvite.findUnique({
      where: { token: inviteToken },
    });

    if (!invite) return error('Invalid invite token', 404);
    if (invite.workspaceId !== workspace.id) return error('Invite token does not belong to this team', 400);
    if (invite.acceptedAt) return error('Invite has already been used', 409);
    if (new Date() > invite.expiresAt) return error('Invite has expired', 410);

    // Verify the accepting user's email matches the invite email
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return error('User not found', 404);
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return error('This invite was sent to a different email address', 403);
    }

    // Check if already a member (shouldn't happen since we check invite, but defensive)
    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.userId } },
    });
    if (existing) return error('You are already a member of this team', 409);

    // Add user as member
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: session.userId,
        role: invite.teamRole,
      },
    });

    // Mark invite as accepted
    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'TEAM_INVITE_ACCEPT',
      target: workspace.id,
      metadata: { inviteId: invite.id, role: invite.teamRole },
      ipAddress: ip,
    });

    return ok({
      member,
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        role: invite.teamRole,
      },
    }, 201);
  } catch (err) {
    console.error('[POST /api/teams/:slug/members/accept] DB error:', err);
    return error('Failed to accept invite', 500);
  }
}
