// lib/audit.ts — Minimal audit log helper
// Writes AuditLog entries via Prisma; safe to call async from route handlers.

import prisma from '@/lib/prisma';

export type AuditAction =
  | 'REGISTER_SUCCESS'
  | 'REGISTER_FAILURE'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'REFRESH_TOKEN'
  | 'PROFILE_UPDATE'
  | 'API_KEY_CREATE'
  | 'API_KEY_REVOKE'
  | 'ACCOUNT_DELETE'
  | 'ORDER_PLACED'
  | 'EMAIL_VERIFY_SUCCESS'
  | 'EMAIL_VERIFY_FAILURE'
  | 'FORGOT_PASSWORD'
  | 'FORGOT_PASSWORD_FAILURE'
  | 'RESET_PASSWORD_SUCCESS'
  | 'RESET_PASSWORD_FAILURE'
  | 'TEAM_INVITE'
  | 'ANALYTICS_VIEW'
  | 'REVIEW_CREATE'
  | 'COLLECTION_CREATE'
  | 'COLLECTION_UPDATE'
  | 'COLLECTION_DELETE'
  | 'SESSION_VIEW'
  | 'CREDITS_PURCHASE'
  | 'QUOTA_VIEW'
  | 'SAVED_VIEW'
  | 'COLLECTION_ITEMS_VIEW'
  | 'COLLECTION_ITEM_ADD'
  | 'MODERATION_DECISION'
  | 'OAUTH_INITIATE'
  | 'PROMPT_CREATE'
  | 'PROMPT_UPDATE'
  | 'PROMPT_PUBLISH'
  | 'PROMPT_UNPUBLISH'
  | 'PROMPT_ARCHIVE'
  | 'TEMPLATE_LIST'
  | 'TEMPLATE_TEST'
  | 'MARKETPLACE_LIST'
  | 'MARKETPLACE_SEARCH'
  | 'SEARCH_QUERY'
  | 'SUBSCRIPTION_UPDATE'
  | 'QUOTA_VIEW'
  | 'PROMPT_LINT'
  | 'PROMPT_DIFF'
  | 'PROMPT_FORK'
  | 'TEMPLATE_FORK'
  | 'SLUG_GENERATE'
  | 'TEAM_CREATE'
  | 'TEAM_UPDATE'
  | 'TEAM_INVITE_ACCEPT'
  | 'TEAM_MEMBER_UPDATE'
  | 'TEAM_MEMBER_REMOVE'
  | 'ADMIN_CREDITS_GRANT'

interface AuditLogInput {
  userId?: string | null;
  action: AuditAction;
  target?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/** Write an audit log entry. Fire-and-forget; errors are logged but never thrown. */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        target: input.target ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Never let audit log failures affect the primary operation
    console.error('[writeAuditLog] failed to persist audit entry:', err);
  }
}

/**
 * Extract client IP from a NextRequest headers.
 * Handles X-Forwarded-For, X-Real-IP, and CF-Connecting-IP (Cloudflare).
 */
export function getClientIp(request: Request): string | null {
  const header =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip');
  if (!header) return null;
  // X-Forwarded-For can be comma-separated "ip1, ip2, ..."
  return header.split(',')[0].trim();
}