/**
 * DataLab Access Control — in-memory store
 *
 * MVP: env-var seeded in-memory Map.
 * Production replacement: swap the Map for Vercel KV, Upstash Redis, or a Prisma model.
 *
 * Env vars:
 *   DATALAB_ADMIN_IDS   — comma-separated GitHub user IDs with admin rights
 *   DATALAB_ALLOWED_IDS — comma-separated GitHub user IDs pre-seeded with access
 */

export interface DataLabUser {
  userId: string;
  userName: string;
  email?: string;
  grantedAt: number;
  grantedBy: string; // admin userId who granted access
}

// ---------------------------------------------------------------------------
// Helpers for reading env vars
// ---------------------------------------------------------------------------

function readIdList(envVar: string | undefined): string[] {
  if (!envVar) return [];
  return envVar
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Admin list — derived purely from the env var; never changes at runtime
// ---------------------------------------------------------------------------

const ADMIN_IDS: ReadonlySet<string> = new Set(
  readIdList(process.env.DATALAB_ADMIN_IDS)
);

// ---------------------------------------------------------------------------
// In-memory allowed-users store
// ---------------------------------------------------------------------------

// NOTE: in-memory state is per-process; Vercel Serverless Functions may spin up
// multiple instances, so initial seeds come from the env var on every cold start.
const allowedUsers = new Map<string, DataLabUser>();

// Seed from DATALAB_ALLOWED_IDS on module init
(function seedFromEnv() {
  const ids = readIdList(process.env.DATALAB_ALLOWED_IDS);
  for (const id of ids) {
    if (!allowedUsers.has(id)) {
      allowedUsers.set(id, {
        userId: id,
        userName: id, // we only have the ID at seed time
        grantedAt: Date.now(),
        grantedBy: "env-seed",
      });
    }
  }
})();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns true if userId is an admin OR has been explicitly granted access. */
export function hasDataLabAccess(userId: string): boolean {
  return ADMIN_IDS.has(userId) || allowedUsers.has(userId);
}

/** Returns true if userId is in DATALAB_ADMIN_IDS. */
export function isDataLabAdmin(userId: string): boolean {
  return ADMIN_IDS.has(userId);
}

/** Returns all users who have been explicitly granted access (admins excluded). */
export function getAllowedUsers(): DataLabUser[] {
  return Array.from(allowedUsers.values()).sort((a, b) => b.grantedAt - a.grantedAt);
}

/**
 * Grant DataLab access to a user.
 * Calling this for a user who already has access is a no-op (idempotent).
 */
export function grantAccess(
  userId: string,
  userName: string,
  email: string | undefined,
  adminId: string
): void {
  allowedUsers.set(userId, {
    userId,
    userName,
    email,
    grantedAt: Date.now(),
    grantedBy: adminId,
  });
}

/**
 * Revoke DataLab access for a user.
 * Admins cannot be revoked this way — their access is controlled via the env var.
 */
export function revokeAccess(userId: string): void {
  allowedUsers.delete(userId);
}

/** Total number of explicitly-allowed users (does NOT count admins). */
export function getAccessCount(): number {
  return allowedUsers.size;
}

/** Expose admin count for dashboard stats. */
export function getAdminCount(): number {
  return ADMIN_IDS.size;
}
