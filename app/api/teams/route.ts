// app/api/teams/route.ts
// POST /api/teams  — create a new team (workspace)
// GET /api/teams   — list all workspaces the authenticated user belongs to

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

const CreateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
});

export async function POST(request: NextRequest) {
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

  const parsed = CreateTeamSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 422);
  }

  const { name, slug } = parsed.data;

  // Check slug uniqueness
  const existing = await prisma.workspace.findUnique({ where: { slug } });
  if (existing) {
    return error('Team with this slug already exists', 409);
  }

  // Get or create a FREE plan for the new workspace
  let plan = await prisma.plan.findUnique({ where: { code: 'FREE' } });
  if (!plan) {
    plan = await prisma.plan.create({
      data: { code: 'FREE', monthlyPrice: 0, creditQuota: 50, maxSeats: 1 },
    });
  }

  try {
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        ownerId: session.userId,
        planId: plan.id,
      },
      include: {
        plan: true,
        owner: { select: { id: true, username: true, email: true } },
        members: { select: { id: true, userId: true, role: true } },
      },
    });

    // Auto-add creator as owner member
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: session.userId,
        role: 'owner',
      },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'TEAM_CREATE',
      target: workspace.id,
      metadata: { name, slug },
      ipAddress: getClientIp(request),
    });

    return ok({ workspace }, 201);
  } catch (err) {
    // Handle unique constraint violation (race condition on slug)
    if ((err as { code?: string }).code === 'P2002') {
      return error('Team with this slug already exists', 409);
    }
    console.error('[POST /api/teams] DB error:', err);
    return error('Failed to create team', 500);
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  try {
    // List all workspaces where the user is a member
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.userId },
      include: {
        workspace: {
          include: {
            plan: { select: { code: true, monthlyPrice: true, creditQuota: true, maxSeats: true } },
            owner: { select: { id: true, username: true, avatarUrl: true } },
            _count: { select: { members: true } },
          },
        },
      },
    });

    const teams = memberships.map((m) => ({
      id: m.workspace.id,
      slug: m.workspace.slug,
      name: m.workspace.name,
      role: m.role,
      plan: m.workspace.plan,
      owner: m.workspace.owner,
      memberCount: m.workspace._count.members,
      createdAt: m.workspace.createdAt,
      updatedAt: m.workspace.updatedAt,
    }));

    return ok({ teams });
  } catch (err) {
    console.error('[GET /api/teams] DB error:', err);
    return error('Failed to fetch teams', 500);
  }
}
