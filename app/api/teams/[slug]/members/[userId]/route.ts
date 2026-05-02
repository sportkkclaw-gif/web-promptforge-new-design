// app/api/teams/[slug]/members/[userId]/route.ts
// PATCH /api/teams/:slug/members/:userId — update member role/quota
// DELETE /api/teams/:slug/members/:userId — remove a member

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

interface Params { params: { slug: string; userId: string } }

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

const UpdateMemberSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  const body = await request.json();
  const parsed = UpdateMemberSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 422);
  }

  const { role } = parsed.data;

  try {
    const workspace = await prisma.workspace.findUnique({ where: { slug: params.slug } });
    if (!workspace) return error('Team not found', 404);

    // Get caller's membership
    const callerMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.userId } },
    });
    if (!callerMembership) return error('You are not a member of this team', 403);

    // Get target user's membership
    const targetMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: params.userId } },
    });
    if (!targetMembership) return error('Target user is not a member of this team', 404);

    // RBAC: owner or admin can update roles; cannot demote owner
    if (targetMembership.role === 'owner') {
      return error('Cannot modify the owner role', 403);
    }

    if (!hasPermission(callerMembership.role, 'admin')) {
      return error('Only owners and admins can update member roles', 403);
    }

    // Admin can promote to admin or demote; owner can do anything
    if (role && !hasPermission(callerMembership.role, 'owner')) {
      // Admins cannot promote to admin unless they are owners
      if (role === 'admin' && callerMembership.role !== 'owner') {
        return error('Only owners can promote members to admin', 403);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (role !== undefined) updateData.role = role;

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 400);
    }

    const updated = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: params.userId } },
      data: updateData,
      include: {
        user: { select: { id: true, username: true, email: true, avatarUrl: true } },
      },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'TEAM_MEMBER_UPDATE',
      target: workspace.id,
      metadata: { targetUserId: params.userId, updatedFields: Object.keys(updateData) },
      ipAddress: getClientIp(request),
    });

    return ok({ member: updated });
  } catch (err) {
    console.error('[PATCH /api/teams/:slug/members/:userId] DB error:', err);
    return error('Failed to update member');
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  try {
    const workspace = await prisma.workspace.findUnique({ where: { slug: params.slug } });
    if (!workspace) return error('Team not found', 404);

    // Get caller's membership
    const callerMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.userId } },
    });
    if (!callerMembership) return error('You are not a member of this team', 403);

    // Get target user's membership
    const targetMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: params.userId } },
    });
    if (!targetMembership) return error('Target user is not a member of this team', 404);

    // Cannot remove owner
    if (targetMembership.role === 'owner') {
      return error('Cannot remove the team owner', 403);
    }

    // RBAC: owner or admin can remove; members can remove themselves
    const isSelfRemove = session.userId === params.userId;
    if (!isSelfRemove && !hasPermission(callerMembership.role, 'admin')) {
      return error('Only owners and admins can remove other members', 403);
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: params.userId } },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'TEAM_MEMBER_REMOVE',
      target: workspace.id,
      metadata: { removedUserId: params.userId, selfRemove: isSelfRemove },
      ipAddress: getClientIp(request),
    });

    return ok({ removed: true });
  } catch (err) {
    console.error('[DELETE /api/teams/:slug/members/:userId] DB error:', err);
    return error('Failed to remove member');
  }
}
