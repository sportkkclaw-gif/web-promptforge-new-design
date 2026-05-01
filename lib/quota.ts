// Quota Service - validates user credit usage and plan limits
// Implements FULL_BUILD_CHECKLIST §5.1 (Atomic deductions, Immutable ledger, Overdraft prevention)
// and §5.2 (Monthly quota enforcement, Per-user quota check, Overage handling)

import prisma from '@/lib/prisma';

/**
 * Returns the current period start (first day of current month, midnight UTC).
 * Billing periods are calendar-month based.
 */
export function getCurrentPeriodStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Returns the current period end (first day of NEXT month, midnight UTC).
 */
export function getCurrentPeriodEnd(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

/**
 * Checks whether a team workspace has available aggregate quota for a generation request.
 * Aggregates all negative delta creditsLedger entries for all workspace members in the
 * current billing period, then compares against the team plan creditQuota.
 *
 * Checklist 5.2.3: Per-team quota check (aggregated team usage vs. team plan)
 */
export async function checkTeamQuota(
  workspaceId: string,
  creditsToSpend: number
): Promise<{ allowed: boolean; reason?: string; teamUsed: number; teamQuota: number; periodRemaining: number }> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { plan: true, members: { select: { userId: true } } },
  });
  if (!workspace) return { allowed: false, reason: 'Workspace not found', teamUsed: 0, teamQuota: 0, periodRemaining: 0 };

  const plan = workspace.plan;
  const teamQuota = plan?.creditQuota ?? 50;
  const memberIds = workspace.members.map((m) => m.userId);

  const periodStart = getCurrentPeriodStart();
  const usage = await prisma.creditsLedger.aggregate({
    where: {
      userId: { in: memberIds },
      workspaceId,
      createdAt: { gte: periodStart },
      delta: { lt: 0 },
    },
    _sum: { delta: true },
  });

  const teamUsed = Math.abs(usage._sum.delta ?? 0);
  const periodRemaining = Math.max(0, teamQuota - teamUsed);

  if (periodRemaining < creditsToSpend) {
    return {
      allowed: false,
      reason: `Team quota exceeded. Need ${creditsToSpend}, team has ${periodRemaining} remaining this period (quota: ${teamQuota}).`,
      teamUsed,
      teamQuota,
      periodRemaining,
    };
  }

  return { allowed: true, teamUsed, teamQuota, periodRemaining };
}

/**
 * Checks whether the user's subscription is active and currentPeriodEnd has passed,
 * indicating a new billing period has begun. Returns true if credits should be
 * treated as freshly allocated for the new period.
 *
 * Also validates the subscription status is active/trialing.
 *
 * Checklist 5.2.1: Monthly quota reset logic (based on plan billing period)
 * Checklist 5.3.3: Subscription renewal (monthly credits reset + allocation)
 */
export async function checkSubscriptionStatus(userId: string): Promise<{
  isActive: boolean;
  isRenewal: boolean;
  currentPeriodEnd: Date | null;
  planCode: string | null;
}> {
  const now = new Date();

  const subscription = await prisma.subscription.findFirst({
    where: {
      workspace: { ownerId: userId },
      status: { in: ['active', 'trialing'] },
    },
    orderBy: { createdAt: 'desc' },
    include: { plan: { select: { code: true } } },
  });

  if (!subscription) {
    return { isActive: false, isRenewal: false, currentPeriodEnd: null, planCode: null };
  }

  const isRenewal = subscription.currentPeriodEnd < now;
  return {
    isActive: subscription.status === 'active' || subscription.status === 'trialing',
    isRenewal,
    currentPeriodEnd: subscription.currentPeriodEnd,
    planCode: subscription.plan.code,
  };
}

export interface QuotaCheck {
  allowed: boolean;
  currentCredits: number;      // wallet balance
  requiredCredits: number;
  reason?: string;
  periodRemaining?: number;   // monthly quota remaining
}

/**
 * Checks whether the user has BOTH sufficient wallet balance AND sufficient
 * monthly quota to cover the requested spend.
 *
 * Checklist 5.1.9: Overdraft prevention — reject if balance < cost
 * Checklist 5.2.2: Per-user quota check — generations this month vs. plan limit
 */
export async function checkGenerationQuota(userId: string, creditsToSpend: number): Promise<QuotaCheck> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, currentCredits: 0, requiredCredits: creditsToSpend, reason: 'User not found' };

  // ── Wallet balance check (5.1.9 overdraft prevention) ──────────────────────
  if (user.credits < creditsToSpend) {
    return {
      allowed: false,
      currentCredits: user.credits,
      requiredCredits: creditsToSpend,
      reason: `Insufficient credits. Need ${creditsToSpend}, have ${user.credits} in wallet.`,
    };
  }

  // ── Monthly quota check (5.2.2) ────────────────────────────────────────────
  const periodStart = getCurrentPeriodStart();

  const subscription = await prisma.subscription.findFirst({
    where: { workspace: { ownerId: userId } },
    include: { plan: true },
  });

  const plan = subscription?.plan;
  const creditQuota = plan?.creditQuota ?? 50;

  const usage = await prisma.creditsLedger.aggregate({
    where: {
      userId,
      createdAt: { gte: periodStart },
      delta: { lt: 0 },
    },
    _sum: { delta: true },
  });

  const usedCredits = Math.abs(usage._sum.delta ?? 0);
  const periodRemaining = Math.max(0, creditQuota - usedCredits);

  if (periodRemaining < creditsToSpend) {
    return {
      allowed: false,
      currentCredits: user.credits,
      requiredCredits: creditsToSpend,
      reason: `Monthly quota exceeded. Need ${creditsToSpend}, have ${periodRemaining} remaining this period (quota: ${creditQuota}).`,
      periodRemaining,
    };
  }

  return {
    allowed: true,
    currentCredits: user.credits,
    requiredCredits: creditsToSpend,
    periodRemaining,
  };
}

export interface DeductResult {
  allowed: boolean;
  reason?: string;
  newBalance?: number;
}

/**
 * Atomically deducts credits from the user's wallet.
 * Writes an immutable CreditsLedger entry with the running balance snapshot.
 *
 * Checklist 5.1.3: Atomic credit deduction on generation request (ACID transaction)
 * Checklist 5.1.8: Running balance (balanceAfter) calculated in app, verified by DB
 *
 * NOTE: Quota pre-check MUST be done by the caller via checkGenerationQuota() before
 * invoking deductCredits(), because quota enforcement is call-site specific (e.g. generation
 * uses quota; purchase uses separate credit purchase path).
 */
export async function deductCredits(
  userId: string,
  amount: number,
  reason: string,
  refType?: string,
  refId?: string
): Promise<{ newBalance: number }> {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (user.credits < amount) throw new Error('Insufficient credits');

    // Compute running balance after this deduction
    const balanceAfter = user.credits - amount;

    await tx.user.update({
      where: { id: userId },
      data: { credits: balanceAfter },
    });

    // CreditsLedger entry is IMMUTABLE — no updatedAt, no update/delete operations
    // balanceAfter provides independent verification without recalculation
    await tx.creditsLedger.create({
      data: {
        userId,
        delta: -amount,
        reason,
        refType: refType ?? 'generation',
        refId,
        balanceAfter,
      },
    });

    return { newBalance: balanceAfter };
  });
}

/**
 * Atomically grants credits to a user (manual admin grant or refund).
 * Writes an immutable CreditsLedger entry.
 *
 * Checklist 5.1.4: Credit grant on admin manual grant
 */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: string,
  refType?: string,
  refId?: string
): Promise<{ newBalance: number }> {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const balanceAfter = user.credits + amount;

    await tx.user.update({
      where: { id: userId },
      data: { credits: balanceAfter },
    });

    await tx.creditsLedger.create({
      data: {
        userId,
        delta: amount,
        reason,
        refType: refType ?? 'admin_grant',
        refId,
        balanceAfter,
      },
    });

    return { newBalance: balanceAfter };
  });
}
