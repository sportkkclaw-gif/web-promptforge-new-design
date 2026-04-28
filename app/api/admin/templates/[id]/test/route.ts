import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';

// POST /api/admin/templates/[id]/test
// Test a template/prompt (admin-only mock test endpoint)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { parameters } = body;

    // Mock test: always succeeds with placeholder result
    return ok({
      testId: `test_${Date.now()}_${params.id}`,
      status: 'passed',
      parametersTested: parameters ?? {},
      message: 'Mock test passed — no errors detected',
    });
  } catch {
    return error('Test failed');
  }
}
