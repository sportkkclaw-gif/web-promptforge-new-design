// app/api/templates/[id]/versions/[versionId]/route.ts
// GET /api/templates/:id/versions/:versionId — Get specific version detail (owner only)
// Supports :versionId as CUID id OR as integer version number

import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface Params { params: { id: string; versionId: string } }

const CUID_PATTERN = /^[a-z][A-Za-z0-9]{24}$/;
function isValidId(id: string): boolean {
  return CUID_PATTERN.test(id);
}

// Helper: resolve prompt id from id-or-slug param
async function resolvePromptId(idOrSlug: string): Promise<string | null> {
  if (isValidId(idOrSlug)) return idOrSlug;
  const prompt = await prisma.prompt.findUnique({ where: { slug: idOrSlug }, select: { id: true } });
  return prompt?.id ?? null;
}

export async function GET(request: NextRequest, { params }: Params) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    return error('No token provided', 401);
  }

  const session = getSession(token);
  if (!session) {
    return error('Session expired or invalid', 401);
  }

  try {
    const promptId = await resolvePromptId(params.id);
    if (!promptId) return error('Template not found', 404);

    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } });
    if (!prompt) return error('Template not found', 404);
    if (prompt.ownerId !== session.userId) return error('Forbidden', 403);

    // versionId can be a CUID id OR an integer version number
    let version;
    if (isValidId(params.versionId)) {
      version = await prisma.promptVersion.findUnique({
        where: { id: params.versionId, promptId },
      });
    } else {
      const versionNum = parseInt(params.versionId, 10);
      if (!isNaN(versionNum)) {
        version = await prisma.promptVersion.findUnique({
          where: { promptId_version: { promptId, version: versionNum } },
        });
      }
    }

    if (!version) return error('Version not found', 404);

    return ok({ version });
  } catch {
    return error('Failed to fetch version');
  }
}