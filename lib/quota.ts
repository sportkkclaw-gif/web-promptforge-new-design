// Quota Service - validates user credit usage and plan limits

import prisma from '@/lib/prisma';

export interface QuotaCheck {
  allowed: boolean;
  currentCredits: number;
  requiredCredits: number;
  reason?: string;
}

export async function checkGenerationQuota(userId: string, creditsToSpend: number): Promise<QuotaCheck> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, currentCredits: 0, requiredCredits: creditsToSpend, reason: 'User not found' };

  const subscription = await prisma.subscription.findFirst({
    where: { workspace: { ownerId: userId } },
    include: { plan: true },
  });

  const plan = subscription?.plan;
  const creditQuota = plan?.creditQuota ?? 50;

  // Get usage this period
  const periodStart = new Date();
  periodStart.setDate(1);
  const usage = await prisma.creditsLedger.aggregate({
    where: {
      userId,
      createdAt: { gte: periodStart },
      delta: { lt: 0 },
    },
    _sum: { delta: true },
  });

  const usedCredits = Math.abs(usage._sum.delta ?? 0);
  const remaining = creditQuota - usedCredits;

  if (remaining < creditsToSpend) {
    return {
      allowed: false,
      currentCredits: remaining,
      requiredCredits: creditsToSpend,
      reason: `Insufficient credits. Need ${creditsToSpend}, have ${remaining} remaining this period.`,
    };
  }

  return {
    allowed: true,
    currentCredits: user.credits,
    requiredCredits: creditsToSpend,
  };
}

export async function deductCredits(userId: string, amount: number, reason: string, refType?: string, refId?: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.credits < amount) throw new Error('Insufficient user credits');

    await tx.user.update({ where: { id: userId }, data: { credits: user.credits - amount } });
    await tx.creditsLedger.create({
      data: { userId, delta: -amount, reason, refType, refId },
    });
  });
}
