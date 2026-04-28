/**
 * SC-009: Single source of truth for the JWT secret.
 * All auth routes import from here — no more duplicate bootstrap or drift risk.
 */
import { TextEncoder } from 'util';

const raw = process.env.NEXTAUTH_SECRET;

if (!raw && process.env.NODE_ENV === 'production') {
  throw new Error('NEXTAUTH_SECRET must be set in production');
}

export const JWT_SECRET = new TextEncoder().encode(
  raw || 'dev-secret-key-change-in-production'
);
