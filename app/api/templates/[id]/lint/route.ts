// app/api/templates/[id]/lint/route.ts
// POST /api/templates/:id/lint — run prompt lint on a template
// Supports id-or-slug resolution, auth, and owner-only access.

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { validateApiKey } from '@/lib/auth-api-key';
import prisma from '@/lib/prisma';
import { lintPrompt, type VariableSpec, type ConstraintSpec } from '@/lib/prompt-as-code';

// CUID pattern: starts with letter, 25 chars total (Prisma cuid())
const CUID_PATTERN = /^[a-z][A-Za-z0-9]{24}$/;

interface Params { params: { id: string } }

function isValidId(id: string): boolean {
  return CUID_PATTERN.test(id);
}

async function resolvePromptId(idOrSlug: string): Promise<string | null> {
  if (isValidId(idOrSlug)) return idOrSlug;
  const prompt = await prisma.prompt.findUnique({ where: { slug: idOrSlug }, select: { id: true } });
  return prompt?.id ?? null;
}

async function resolveUserId(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('authorization');
  const apiKeyResult = await validateApiKey(authHeader);
  if (apiKeyResult) return { userId: apiKeyResult.userId };
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return null;
  const session = getSession(token);
  if (!session) return null;
  return { userId: session.userId };
}

export async function POST(request: NextRequest, { params }: Params) {
  const resolvedUserId = await resolveUserId(request);
  if (!resolvedUserId) return error('No token provided', 401);

  const promptId = await resolvePromptId(params.id);
  if (!promptId) return error('Template not found', 404);

  // Ownership guard
  const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
  if (!prompt) return error('Template not found', 404);
  if (prompt.ownerId !== resolvedUserId.userId) return error('Not your template', 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  // variableSpecs and constraints are optional — lintPrompt handles empty specs
  const variableSpecs: VariableSpec[] = (body as any)?.variableSpecs ?? [];
  const constraints: ConstraintSpec | undefined = (body as any)?.constraints;

  const result = lintPrompt(prompt.content, variableSpecs, constraints);

  return ok({ lint: result });
}
