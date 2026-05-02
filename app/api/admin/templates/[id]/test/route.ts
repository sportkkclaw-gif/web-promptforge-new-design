import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { requireAdmin } from '@/lib/auth-admin';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

const TestBodySchema = z.object({
  parameters: z.record(z.unknown()).optional(),
});

interface Params { params: { id: string } }

// POST /api/admin/templates/[id]/test
// Test a template/prompt (admin-only mock test endpoint)
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const parsed = TestBodySchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const { parameters } = parsed.data;

  // Mock test: always succeeds with placeholder result
  const testId = `test_${Date.now()}_${params.id}`;

  const ip = getClientIp(request);
  await writeAuditLog({
    userId: auth.userId,
    action: 'TEMPLATE_TEST',
    target: `template:${params.id}`,
    metadata: { testId, parametersTested: parameters ?? {} },
    ipAddress: ip,
  });

  return ok({
    testId,
    status: 'passed',
    parametersTested: parameters ?? {},
    message: 'Mock test passed — no errors detected',
  });
}
