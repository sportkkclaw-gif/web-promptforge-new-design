// POST /api/team/invite
import { NextRequest } from 'next/server';
import { ok, error } from '@/lib/api';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { writeAuditLog, getClientIp } from '@/lib/audit';

const InviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  workspaceId: z.string().min(1, 'workspaceId is required'),
  role: z.enum(['admin', 'member', 'viewer']).optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON', 400);
  }

  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.errors[0]?.message || 'Validation failed', 422);
  }

  const { email, workspaceId, role } = parsed.data;

  const invitee = await prisma.user.findUnique({ where: { email } });
  if (!invitee) return error('User not found', 404);

  // Check if already a member
  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: invitee.id } },
  });
  if (existing) return error('User is already a member of this workspace', 409);

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: invitee.id,
      role: role ?? 'member',
    },
  });

  await writeAuditLog({
    userId: invitee.id,
    action: 'TEAM_INVITE',
    target: workspaceId,
    metadata: { role: role ?? 'member' },
    ipAddress: ip,
  });

  return ok({ member, invitee: { id: invitee.id, username: invitee.username } }, 201);
}
