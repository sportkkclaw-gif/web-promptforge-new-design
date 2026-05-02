import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { writeAuditLog, getClientIp } from '@/lib/audit';
import { z } from 'zod';

// CUID pattern: starts with letter, 25 chars total (Prisma cuid())
const CUID_PATTERN = /^[a-z][A-Za-z0-9]{24}$/;

const AddItemSchema = z.object({
  promptId: z.string().min(1, 'promptId is required').regex(CUID_PATTERN, 'promptId must be a valid CUID'),
  note: z.string().max(1000).optional(),
});

interface Params { params: { id: string } }

function isValidId(id: string): boolean {
  return CUID_PATTERN.test(id);
}

export async function GET(request: NextRequest, { params }: Params) {
  if (!isValidId(params.id)) {
    return error('Invalid collection ID', 400);
  }

  const ip = getClientIp(request);
  // Optional auth — log view if token present
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const session = token ? getSession(token) : null;

  try {
    const items = await prisma.collectionItem.findMany({
      where: { collectionId: params.id },
      include: {
        prompt: {
          select: { id: true, title: true, slug: true, summary: true, status: true, viewCount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (session) {
      await writeAuditLog({ userId: session.userId, action: 'COLLECTION_ITEMS_VIEW', target: params.id, ipAddress: ip });
    }

    return ok({ items });
  } catch {
    return error('Failed to fetch collection items');
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!isValidId(params.id)) {
    return error('Invalid collection ID', 400);
  }

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

  const parsed = AddItemSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 400);
  }

  const ip = getClientIp(request);
  const { promptId, note } = parsed.data;

  try {
    const item = await prisma.collectionItem.upsert({
      where: { collectionId_promptId: { collectionId: params.id, promptId } },
      update: { note },
      create: { collectionId: params.id, promptId, note },
    });

    await writeAuditLog({
      userId: session.userId,
      action: 'COLLECTION_ITEM_ADD',
      target: params.id,
      metadata: { promptId, note },
      ipAddress: ip,
    });

    return ok({ item }, 201);
  } catch {
    return error('Failed to add item to collection');
  }
}
