/**
 * SC-007: Audit logging helper.
 * All sensitive actions (login, password reset, post delete, ban, etc.)
 * call writeAuditLog so there's a persistent, queryable trail.
 *
 * IP is stored in truncated form (last octet zeroed) for privacy compliance
 * while still being useful for pattern detection.
 */
import { db } from '@/lib/db';

export type AuditAction =
  | 'SIGNUP'
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'OTP_VERIFY'
  | 'OTP_FAIL'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET'
  | 'ACCOUNT_LOCKED'
  | 'POST_CREATE'
  | 'POST_DELETE'
  | 'CHAT_DELETE'
  | 'MESSAGE_DELETE'
  | 'ACCOUNT_SUSPEND'
  | 'ACCOUNT_BAN'
  | 'REPORT_CREATED';

export type AuditTargetType = 'USER' | 'POST' | 'CHAT' | 'MESSAGE';

export interface AuditParams {
  userId?: string;
  action: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Truncate IP for privacy: "1.2.3.4" → "1.2.3.x"
 * IPv6 last group zeroed: "2001:db8::1" → "2001:db8::x"
 * Exported so callers that store IPs directly (signin, verify-otp) use
 * the same logic and avoid inconsistencies.
 */
export function truncateIp(ip: string | undefined | null): string | null {
  if (!ip || ip === 'unknown') return null;
  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    parts[parts.length - 1] = 'x';
    return parts.join('.');
  }
  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    parts[parts.length - 1] = 'x';
    return parts.join(':');
  }
  return null;
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        ipAddress: truncateIp(params.ipAddress),
        userAgent: params.userAgent
          ? params.userAgent.slice(0, 500) // cap length
          : null,
        metadata: params.metadata
          ? JSON.stringify(params.metadata)
          : null,
      },
    });
  } catch (err) {
    // Audit log failure must never break the primary request
    console.error('[AuditLog] write failed:', err);
  }
}
