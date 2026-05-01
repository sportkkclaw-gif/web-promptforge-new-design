// app/api/teams/[slug]/route.ts
// GET /api/teams/:slug  — get team details
// PATCH /api/teams/:slug — update team name/logo (owner or admin only)

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

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

const UpdateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
      include: {
        plan: { select: { code: true, monthlyPrice: true, creditQuota: true, maxSeats: true } },
        owner: { select: { id: true, username: true, email: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, username: true, email: true, avatarUrl: true } },
          },
        },
        _count: { select: { members: true, prompts: true } },
      },
    });

    if (!workspace) return error('Team not found', 404);

    return ok({
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        plan: workspace.plan,
        owner: workspace.owner,
        members: workspace.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          user: m.user,
          createdAt: m.createdAt,
        })),
        memberCount: workspace._count.members,
        promptCount: workspace._count.prompts,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
    });
  } catch (err) {
    console.error('[GET /api/teams/:slug] DB error:', err);
    return error('Failed to fetch team');
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  const body = await request.json();
  const parsed = UpdateTeamSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 422);
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
    });
    if (!workspace) return error('Team not found', 404);

    // Get the requesting user's membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: session.userId,
        },
      },
    });

    if (!membership) return error('You are not a member of this team', 403);
    if (!hasPermission(membership.role, 'admin')) {
      return error('Only owners and admins can update team settings', 403);
    }

    const { name, logoUrl } = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;

    if (Object.keys(updateData).length === 0) {
      return error('No fields to update', 400);
    }

    const updated = await prisma.workspace.update({
      where: { id: workspace.id },
      data: updateData,
      include: {
        plan: { select: { code: true, monthlyPrice: true, creditQuota: true, maxSeats: true } },
        owner: { select: { id: true, username: true, email: true, avatarUrl: true } },
      },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'TEAM_UPDATE',
      target: workspace.id,
      metadata: { updatedFields: Object.keys(updateData) },
      ipAddress: getClientIp(request),
    });

    return ok({ workspace: updated });
  } catch (err) {
    console.error('[PATCH /api/teams/:slug] DB error:', err);
    return error('Failed to update team');
  }
}
