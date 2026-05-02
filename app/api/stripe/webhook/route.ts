import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { error, ok } from '@/lib/api';
import { writeAuditLog, getClientIp } from '@/lib/audit';

function parseCredits(metadata: Record<string, string> | null | undefined): number {
  const raw = metadata?.credits;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!signature) return error('Missing stripe-signature header', 400);
  if (!webhookSecret || webhookSecret === 'whsec_you..._secret') return error('Stripe webhook not configured', 500);
  if (!stripeSecret || stripeSecret === 'sk_you..._key') return error('Stripe secret not configured', 500);

  const rawBody = await request.text();

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-02-24.acacia' });
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        id: string;
        metadata?: Record<string, string>;
      };

      const userId = session.metadata?.userId;
      const credits = parseCredits(session.metadata);
      const packageId = session.metadata?.packageId ?? null;

      if (!userId || credits <= 0) {
        return error('Invalid checkout.session.completed metadata', 400);
      }

      const existing = await prisma.creditsLedger.findFirst({
        where: {
          userId,
          refType: 'stripe_checkout',
          refId: session.id,
          delta: { gt: 0 },
        },
      });

      if (!existing) {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({ where: { id: userId } });
          if (!user) throw new Error('User not found');

          const newBalance = user.credits + credits;

          await tx.user.update({
            where: { id: userId },
            data: { credits: newBalance },
          });

          await tx.creditsLedger.create({
            data: {
              userId,
              delta: credits,
              reason: `Stripe checkout completed (${packageId ?? 'unknown-package'})`,
              refType: 'stripe_checkout',
              refId: session.id,
              balanceAfter: newBalance,
            },
          });
        });
      }

      await writeAuditLog({
        userId,
        action: 'CREDITS_PURCHASE',
        target: `stripe:checkout:${session.id}`,
        metadata: {
          eventType: event.type,
          packageId,
          credits,
          idempotentSkip: Boolean(existing),
        },
        ipAddress: getClientIp(request),
      });

      return ok({ received: true, eventType: event.type, idempotentSkip: Boolean(existing) });
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as {
        id: string;
        metadata?: Record<string, string>;
      };

      const userId = charge.metadata?.userId;
      const credits = parseCredits(charge.metadata);

      if (!userId || credits <= 0) {
        return error('Invalid charge.refunded metadata', 400);
      }

      const existingRefund = await prisma.creditsLedger.findFirst({
        where: {
          userId,
          refType: 'stripe_refund',
          refId: charge.id,
          delta: { lt: 0 },
        },
      });

      if (!existingRefund) {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({ where: { id: userId } });
          if (!user) throw new Error('User not found');

          const newBalance = Math.max(0, user.credits - credits);

          await tx.user.update({
            where: { id: userId },
            data: { credits: newBalance },
          });

          await tx.creditsLedger.create({
            data: {
              userId,
              delta: -credits,
              reason: `Stripe charge refunded (${charge.id})`,
              refType: 'stripe_refund',
              refId: charge.id,
              balanceAfter: newBalance,
            },
          });
        });
      }

      await writeAuditLog({
        userId,
        action: 'CREDITS_PURCHASE',
        target: `stripe:refund:${charge.id}`,
        metadata: {
          eventType: event.type,
          credits,
          idempotentSkip: Boolean(existingRefund),
        },
        ipAddress: getClientIp(request),
      });

      return ok({ received: true, eventType: event.type, idempotentSkip: Boolean(existingRefund) });
    }

    return ok({ received: true, ignored: true, eventType: event.type });
  } catch (e) {
    console.error('[stripe/webhook] error', e);
    return error('Invalid Stripe webhook payload', 400);
  }
}
