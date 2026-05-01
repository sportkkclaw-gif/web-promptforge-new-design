// app/api/credits/purchase/route.ts
// POST /api/credits/purchase — Purchase credits via Stripe Checkout (or mock mode)
// Batch 4.4 / Batch 5.3 checklist items

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { writeAuditLog, getClientIp } from '@/lib/audit';

// Credit packages available for purchase
const CREDIT_PACKAGES: Record<string, { credits: number; priceUsd: number; label: string }> = {
  'credits_100': { credits: 100, priceUsd: 5, label: '100 Credits' },
  'credits_500': { credits: 500, priceUsd: 20, label: '500 Credits (20% off)' },
  'credits_1000': { credits: 1000, priceUsd: 35, label: '1,000 Credits (30% off)' },
  'credits_5000': { credits: 5000, priceUsd: 150, label: '5,000 Credits (40% off)' },
};

const PurchaseSchema = z.object({
  packageId: z.string(),
});

async function resolveUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return null;
  const session = getSession(token);
  return session?.userId ?? null;
}

export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId) return error('No token provided', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = PurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return error('packageId is required', 400);
  }

  const { packageId } = parsed.data;
  const pkg = CREDIT_PACKAGES[packageId];
  if (!pkg) {
    return error(`Unknown packageId: ${packageId}. Available: ${Object.keys(CREDIT_PACKAGES).join(', ')}`, 400);
  }

  // Check if Stripe is configured; fall back to mock mode
  const stripeEnabled = !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_SECRET_KEY !== 'sk_your_stripe_secret_key'
  );

  try {
    let checkoutUrl: string;
    let sessionId: string;

    if (stripeEnabled) {
      // Real Stripe Checkout session creation
      // Dynamic import to avoid build errors when Stripe SDK isn't available
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-02-24.acacia',
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: Math.round(pkg.priceUsd * 100),
              product_data: {
                name: `PromptForge Credits — ${pkg.label}`,
                description: `${pkg.credits} credits added to your PromptForge account`,
              },
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/billing?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/billing?purchase=cancelled`,
        metadata: {
          userId,
          packageId,
          credits: String(pkg.credits),
        },
      });

      checkoutUrl = session.url!;
      sessionId = session.id;
    } else {
      // Mock mode: simulate instant purchase for development/demo
      // In production this path should not be used without Jason approval
      checkoutUrl = `mock://checkout?package=${packageId}&user=${userId}`;
      sessionId = `mock_session_${Date.now()}`;

      // Immediately grant credits in mock mode (simulating webhook)
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return error('User not found', 404);

      const newBalance = user.credits + pkg.credits;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { credits: newBalance },
        }),
        prisma.creditsLedger.create({
          data: {
            userId,
            delta: pkg.credits,
            reason: `Purchased ${pkg.credits} credits (mock mode)`,
            refType: 'purchase',
            refId: sessionId,
            balanceAfter: newBalance,
          },
        }),
      ]);
    }

    await writeAuditLog({
      userId,
      action: 'CREDITS_PURCHASE',
      target: `credits:purchase:${packageId}`,
      metadata: {
        packageId,
        credits: pkg.credits,
        priceUsd: pkg.priceUsd,
        stripeEnabled,
        sessionId,
      },
      ipAddress: getClientIp(request),
    });

    return ok({
      checkoutUrl,
      sessionId,
      packageId,
      credits: pkg.credits,
      priceUsd: pkg.priceUsd,
      label: pkg.label,
      stripeEnabled,
    });
  } catch (err) {
    console.error('[/api/credits/purchase] Error:', err);
    return error('Failed to create checkout session', 500);
  }
}

export async function GET(request: NextRequest) {
  // Return available credit packages (public endpoint)
  const userId = await resolveUserId(request);

  const packages = Object.entries(CREDIT_PACKAGES).map(([id, pkg]) => ({
    id,
    label: pkg.label,
    credits: pkg.credits,
    priceUsd: pkg.priceUsd,
    pricePerCredit: +(pkg.priceUsd / pkg.credits).toFixed(4),
  }));

  if (userId) {
    await writeAuditLog({
      userId,
      action: 'QUOTA_VIEW',
      target: 'credits:purchase:packages',
      metadata: {},
      ipAddress: getClientIp(request),
    });
  }

  return ok({ packages });
}
