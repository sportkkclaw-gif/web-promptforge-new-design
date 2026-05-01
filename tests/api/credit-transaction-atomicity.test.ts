// API Tests: Credit Transaction Atomicity
// tests/api/credit-transaction-atomicity.test.ts
//
// Covers FULL_BUILD_CHECKLIST §13.1 line 384: Credit transaction atomicity tests
// - Rollback: no partial state on failure inside $transaction
// - deductCredits: user update + ledger entry are atomic (both succeed or both fail)
// - grantCredits: same atomicity guarantee
// - balanceAfter consistency

/** @jest-environment node */

import prisma from '@/lib/prisma';
import { deductCredits, grantCredits } from '@/lib/quota';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TEST_USER_A = 'atomic-test-user-a';
const TEST_USER_B = 'atomic-test-user-b';
const TEST_USER_C = 'atomic-test-user-c';

async function getCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.credits ?? 0;
}

async function getLedgerEntries(userId: string) {
  return prisma.creditsLedger.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

async function upsertUser(id: string, credits: number) {
  await prisma.user.upsert({
    where: { id },
    create: { id, email: `${id}@test.local`, username: id, credits, role: 'USER' },
    update: { credits },
  });
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('Credit Transaction Atomicity', () => {
  beforeAll(async () => {
    await upsertUser(TEST_USER_A, 100);
    await upsertUser(TEST_USER_B, 50);
    await upsertUser(TEST_USER_C, 200);
  });

  afterAll(async () => {
    await prisma.creditsLedger.deleteMany({
      where: { userId: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_C] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [TEST_USER_A, TEST_USER_B, TEST_USER_C] } },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // §5.1.3 — Atomic credit deduction: user credits update + ledger entry committed
  // together, or neither is (no partial state on success path)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('deductCredits — atomic commit on success', () => {
    it('updates user credits and creates ledger entry in the same transaction', async () => {
      const before = await getCredits(TEST_USER_A);
      const ledgerBefore = await getLedgerEntries(TEST_USER_A);
      const ledgerCountBefore = ledgerBefore.length;

      const result = await deductCredits(TEST_USER_A, 10, 'Atomic test deduction', 'test', 'ref-atomic-1');

      const after = await getCredits(TEST_USER_A);
      const ledgerAfter = await getLedgerEntries(TEST_USER_A);

      // Both user credits updated AND ledger entry created atomically
      expect(after).toBe(before - 10);
      expect(result.newBalance).toBe(after);
      expect(ledgerAfter.length).toBe(ledgerCountBefore + 1);
      expect(ledgerAfter[0].delta).toBe(-10);
      expect(ledgerAfter[0].balanceAfter).toBe(after);
      expect(ledgerAfter[0].refType).toBe('test');
      expect(ledgerAfter[0].refId).toBe('ref-atomic-1');
    });

    it('reflects correct balanceAfter after multiple sequential deductions', async () => {
      await prisma.user.update({ where: { id: TEST_USER_A }, data: { credits: 100 } });

      await deductCredits(TEST_USER_A, 30, 'First deduction', 'test', 'seq-ref-1');
      const ledgerAfter1 = await getLedgerEntries(TEST_USER_A);
      expect(ledgerAfter1[0].balanceAfter).toBe(70);

      await deductCredits(TEST_USER_A, 20, 'Second deduction', 'test', 'seq-ref-2');
      const ledgerAfter2 = await getLedgerEntries(TEST_USER_A);
      expect(ledgerAfter2[0].balanceAfter).toBe(50);

      const user = await prisma.user.findUnique({ where: { id: TEST_USER_A } });
      expect(user!.credits).toBe(50);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // §5.1.3 — Atomic rollback: if either operation fails, neither is committed
  // We verify this by checking that the operation throws AND no partial state exists
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('deductCredits — rollback on failure (no partial state)', () => {
    it('throws and leaves no partial state when user has insufficient credits', async () => {
      // Set known balance
      await prisma.user.update({ where: { id: TEST_USER_A }, data: { credits: 5 } });
      const ledgerBefore = await getLedgerEntries(TEST_USER_A);
      const ledgerCountBefore = ledgerBefore.length;
      const creditsBefore = await getCredits(TEST_USER_A);

      // Attempt to deduct more than available
      await expect(
        deductCredits(TEST_USER_A, 100, 'Should fail — insufficient', 'test', 'insufficient-ref')
      ).rejects.toThrow('Insufficient credits');

      // No partial state: credits unchanged, no phantom ledger entry
      const creditsAfter = await getCredits(TEST_USER_A);
      const ledgerAfter = await getLedgerEntries(TEST_USER_A);
      expect(creditsAfter).toBe(creditsBefore);
      expect(ledgerAfter.length).toBe(ledgerCountBefore); // no phantom entry
    });

    it('throws and leaves no partial state when user does not exist', async () => {
      const ledgerBefore = await getLedgerEntries('nonexistent-atomic-user-xyz');

      await expect(
        deductCredits('nonexistent-atomic-user-xyz', 10, 'Should fail — no user', 'test', 'no-user-ref')
      ).rejects.toThrow('User not found');

      // No state change
      const ledgerAfter = await getLedgerEntries('nonexistent-atomic-user-xyz');
      expect(ledgerAfter.length).toBe(ledgerBefore.length);
    });

    it('throws and leaves no partial state when user has exactly zero credits', async () => {
      await prisma.user.update({ where: { id: TEST_USER_B }, data: { credits: 0 } });
      const ledgerBefore = await getLedgerEntries(TEST_USER_B);
      const creditsBefore = await getCredits(TEST_USER_B);

      await expect(
        deductCredits(TEST_USER_B, 1, 'Should fail — zero credits', 'test', 'zero-credit-ref')
      ).rejects.toThrow('Insufficient credits');

      const creditsAfter = await getCredits(TEST_USER_B);
      const ledgerAfter = await getLedgerEntries(TEST_USER_B);
      expect(creditsAfter).toBe(creditsBefore);
      expect(ledgerAfter.length).toBe(ledgerBefore.length);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // §5.1.4 — Atomic credit grant: both user update + ledger entry together
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('grantCredits — atomic commit on success', () => {
    it('updates user credits and creates ledger entry in the same transaction', async () => {
      const before = await getCredits(TEST_USER_B);
      const ledgerBefore = await getLedgerEntries(TEST_USER_B);
      const ledgerCountBefore = ledgerBefore.length;

      const result = await grantCredits(TEST_USER_B, 25, 'Atomic test grant', 'admin_grant', 'grant-ref-1');

      const after = await getCredits(TEST_USER_B);
      const ledgerAfter = await getLedgerEntries(TEST_USER_B);

      expect(after).toBe(before + 25);
      expect(result.newBalance).toBe(after);
      expect(ledgerAfter.length).toBe(ledgerCountBefore + 1);
      expect(ledgerAfter[0].delta).toBe(25);
      expect(ledgerAfter[0].balanceAfter).toBe(after);
      expect(ledgerAfter[0].refType).toBe('admin_grant');
    });
  });

  describe('grantCredits — rollback on failure (no partial state)', () => {
    it('throws and leaves no partial state when user does not exist', async () => {
      const ledgerBefore = await getLedgerEntries('nonexistent-grant-user-xyz');

      await expect(
        grantCredits('nonexistent-grant-user-xyz', 100, 'Should fail — no user', 'admin_grant', 'grant-no-user')
      ).rejects.toThrow('User not found');

      const ledgerAfter = await getLedgerEntries('nonexistent-grant-user-xyz');
      expect(ledgerAfter.length).toBe(ledgerBefore.length);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // §5.1.8 — balanceAfter consistency: ledger entry balanceAfter matches actual
  // user credits immediately after transaction commits
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('balanceAfter consistency', () => {
    it('ledger balanceAfter matches actual user credits after deduction', async () => {
      // Set known balance
      await prisma.user.update({ where: { id: TEST_USER_C }, data: { credits: 100 } });

      await deductCredits(TEST_USER_C, 7, 'Balance check deduction', 'test', 'balance-ref-1');

      const ledger = await getLedgerEntries(TEST_USER_C);
      const actualCredits = await getCredits(TEST_USER_C);
      expect(ledger[0].balanceAfter).toBe(actualCredits);
      expect(ledger[0].balanceAfter).toBe(93);
    });

    it('ledger balanceAfter matches actual user credits after grant', async () => {
      await prisma.user.update({ where: { id: TEST_USER_C }, data: { credits: 100 } });

      await grantCredits(TEST_USER_C, 15, 'Balance check grant', 'admin_grant', 'balance-grant-ref-1');

      const ledger = await getLedgerEntries(TEST_USER_C);
      const actualCredits = await getCredits(TEST_USER_C);
      expect(ledger[0].balanceAfter).toBe(actualCredits);
      expect(ledger[0].balanceAfter).toBe(115);
    });

    it('multiple deductions maintain correct balanceAfter in sequence', async () => {
      await prisma.user.update({ where: { id: TEST_USER_C }, data: { credits: 50 } });

      await deductCredits(TEST_USER_C, 5, 'Multi-1', 'test', 'multi-1');
      const ledger1 = await getLedgerEntries(TEST_USER_C);
      expect(ledger1[0].balanceAfter).toBe(45);

      await deductCredits(TEST_USER_C, 10, 'Multi-2', 'test', 'multi-2');
      const ledger2 = await getLedgerEntries(TEST_USER_C);
      expect(ledger2[0].balanceAfter).toBe(35);

      await deductCredits(TEST_USER_C, 5, 'Multi-3', 'test', 'multi-3');
      const ledger3 = await getLedgerEntries(TEST_USER_C);
      expect(ledger3[0].balanceAfter).toBe(30);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // Concurrent deduction safety: last-write-wins at DB level prevents overdraft
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Concurrent deduction safety', () => {
    it('two simultaneous deductions of full balance: exactly one succeeds, no overdraft', async () => {
      // Set TEST_USER_C to exactly 10 credits
      await prisma.user.update({ where: { id: TEST_USER_C }, data: { credits: 10 } });
      // Clear prior ledger entries to get clean state
      await prisma.creditsLedger.deleteMany({ where: { userId: TEST_USER_C } });

      // Fire two concurrent deductions each trying to deduct all 10 credits
      const results = await Promise.allSettled([
        deductCredits(TEST_USER_C, 10, 'Concurrent A', 'test', 'concurrent-a'),
        deductCredits(TEST_USER_C, 10, 'Concurrent B', 'test', 'concurrent-b'),
      ]);

      const finalCredits = await getCredits(TEST_USER_C);
      const ledger = await getLedgerEntries(TEST_USER_C);
      const deductionEntries = ledger.filter(e => e.delta < 0);

      // Final balance must be 0 — at most one deduction succeeded (DB serializes)
      expect(finalCredits).toBe(0);
      // Exactly one ledger deduction entry was created (one succeeded)
      expect(deductionEntries.length).toBe(1);
    });

    it('simultaneous deduction and grant: both succeed without overdraft', async () => {
      await prisma.user.update({ where: { id: TEST_USER_C }, data: { credits: 50 } });
      await prisma.creditsLedger.deleteMany({ where: { userId: TEST_USER_C } });

      const results = await Promise.allSettled([
        deductCredits(TEST_USER_C, 30, 'Concurrent deduct', 'test', 'concurrent-deduct'),
        grantCredits(TEST_USER_C, 20, 'Concurrent grant', 'admin_grant', 'concurrent-grant'),
      ]);

      const finalCredits = await getCredits(TEST_USER_C);
      const ledger = await getLedgerEntries(TEST_USER_C);

      // Final: 50 - 30 + 20 = 40
      expect(finalCredits).toBe(40);
      // Both ledger entries should exist (one per operation)
      expect(ledger.length).toBe(2);
    });
  });
});
