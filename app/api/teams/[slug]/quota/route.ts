// GET /api/teams/:slug/quota — team quota pool, usage, and allocation dashboard
// Implements FULL_BUILD_CHECKLIST §7.3 P0:
// - Team quota pool (monthly credits)
// - Per-member allocation from pool
// - Team quota usage dashboard
// - Overage handling at team level

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getCurrentPeriodStart, getCurrentPeriodEnd } from '@/lib/quota';
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

export async function GET(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
      include: {
        plan: { select: { code: true, creditQuota: true, maxSeats: true } },
        members: {
          include: {
            user: { select: { id: true, username: true, email: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!workspace) return error('Team not found', 404);

    // Verify membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: workspace.id, userId: session.userId },
      },
    });

    if (!membership) return error('You are not a member of this team', 403);

    // Only owners and admins can view full quota details
    const canViewQuota = hasPermission(membership.role, 'admin');

    const periodStart = getCurrentPeriodStart();
    const periodEnd = getCurrentPeriodEnd();

    // Team-level usage: aggregate all members' negative deltas in current period
    const memberIds = workspace.members.map(m => m.userId);
    const usage = await prisma.creditsLedger.aggregate({
      where: {
        userId: { in: memberIds },
        workspaceId: workspace.id,
        createdAt: { gte: periodStart },
        delta: { lt: 0 },
      },
      _sum: { delta: true },
    });

    const teamUsed = Math.abs(usage._sum.delta ?? 0);
    const teamQuota = workspace.plan?.creditQuota ?? 50;
    const teamRemaining = Math.max(0, teamQuota - teamUsed);
    const teamPurchasedCredits = 0; // purchased credits tracked separately

    // Per-member usage
    const memberUsage = canViewQuota
      ? await Promise.all(
          workspace.members.map(async (member) => {
            const memberUsageResult = await prisma.creditsLedger.aggregate({
              where: {
                userId: member.userId,
                workspaceId: workspace.id,
                createdAt: { gte: periodStart },
                delta: { lt: 0 },
              },
              _sum: { delta: true },
            });
            const used = Math.abs(memberUsageResult._sum.delta ?? 0);
            const alloc = member.allocatedCredits; // persisted allocation
            return {
              userId: member.userId,
              user: member.user,
              role: member.role,
              allocatedCredits: alloc,
              usedCredits: used,
              remainingCredits: Math.max(0, alloc - used),
            };
          })
        )
      : [];

    // Subscription info
    const subscription = await prisma.subscription.findFirst({
      where: { workspaceId: workspace.id, status: { in: ['active', 'trialing'] } },
      include: { plan: { select: { code: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return ok({
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        plan: workspace.plan,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        quota: {
          totalCredits: teamQuota,
          usedCredits: teamUsed,
          remainingCredits: teamRemaining,
          purchasedCredits: teamPurchasedCredits,
          overageEnabled: workspace.plan?.code === 'ENTERPRISE',
        },
        subscription: subscription ? {
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          planCode: subscription.plan.code,
        } : null,
        memberUsage,
      },
    });
  } catch (err) {
    console.error('[GET /api/teams/:slug/quota] DB error:', err);
    return error('Failed to fetch team quota');
  }
}

// PATCH /api/teams/:slug/quota — update per-member allocation (owner/admin only)
const PatchQuotaSchema = z.object({
  memberAllocations: z.record(z.string(), z.number().int().min(0)).optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) return error('No token provided', 401);

  const session = getSession(token);
  if (!session) return error('Session expired or invalid', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = PatchQuotaSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  // Empty payload is a no-op success
  const allocations = parsed.data.memberAllocations;
  if (!allocations || Object.keys(allocations).length === 0) {
    return ok({ message: 'No allocation updates submitted' });
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
      include: {
        plan: { select: { creditQuota: true } },
        members: { select: { userId: true, allocatedCredits: true } },
      },
    });

    if (!workspace) return error('Team not found', 404);

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: workspace.id, userId: session.userId },
      },
    });

    if (!membership) return error('You are not a member of this team', 403);

    // Only owners and admins can manage allocations
    if (!hasPermission(membership.role, 'admin')) {
      return error('Only owners and admins can manage quota allocations', 403);
    }

    // Validate: all member IDs must belong to this workspace
    const workspaceMemberUserIds = new Set(workspace.members.map(m => m.userId));
    for (const userId of Object.keys(allocations)) {
      if (!workspaceMemberUserIds.has(userId)) {
        return error(`Member '${userId}' does not belong to this team`, 400);
      }
    }

    // Validate: total allocated credits must not exceed team quota
    // Compute totalAfterUpdate by replacing allocations for specified members, keeping others unchanged
    const existingAllocations = new Map(workspace.members.map(m => [m.userId, m.allocatedCredits ?? 0]));
    for (const [userId, credits] of Object.entries(allocations)) {
      existingAllocations.set(userId, credits);
    }
    const totalAfterUpdate = Array.from(existingAllocations.values()).reduce((sum, v) => sum + v, 0);
    const teamQuota = workspace.plan?.creditQuota ?? 50;
    if (totalAfterUpdate > teamQuota) {
      return error(
        `Total allocated ${totalAfterUpdate} exceeds team quota of ${teamQuota}`,
        400
      );
    }

    // Atomic write: update all member allocations in a transaction
    await prisma.$transaction(
      Object.entries(allocations).map(([userId, allocatedCredits]) =>
        prisma.workspaceMember.update({
          where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
          data: { allocatedCredits },
        })
      )
    );

    return ok({ message: 'Allocations updated', memberAllocations: allocations });
  } catch (err) {
    console.error('[PATCH /api/teams/:slug/quota] DB error:', err);
    return error('Failed to update quota');
  }
}