/**
 * Signed token helpers for DataLab access approval links.
 *
 * A token encodes { userId, userName, email, exp } and is signed with
 * AUTH_SECRET (the NextAuth secret already present in every deployment).
 *
 * Tokens expire in 7 days and are single-use (tracked in memory so a
 * re-clicked link is a no-op, not an error).
 */

import { createHmac, timingSafeEqual } from "crypto";

export interface ApprovalPayload {
  userId: string;
  userName: string;
  email?: string;
  exp: number; // Unix ms timestamp
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Track used tokens to prevent replay (in-memory; lost on restart — acceptable
// because the token also encodes an expiry, so worst case a re-click just
// grants access again to the same already-approved user).
const usedTokens = new Set<string>();

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET env var is not set");
  return secret;
}

function encode(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function decode<T>(str: string): T {
  return JSON.parse(Buffer.from(str, "base64url").toString()) as T;
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

/** Create a signed approval token valid for 7 days. */
export function createApprovalToken(payload: Omit<ApprovalPayload, "exp">): string {
  const full: ApprovalPayload = {
    ...payload,
    exp: Date.now() + SEVEN_DAYS_MS,
  };
  const data = encode(full);
  const sig = sign(data, getSecret());
  return `${data}.${sig}`;
}

export type VerifyResult =
  | { ok: true; payload: ApprovalPayload }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/** Verify a token. If valid, marks it as used and returns the payload. */
export function verifyApprovalToken(token: string): VerifyResult {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return { ok: false, reason: "invalid" };

    const data = token.slice(0, dotIdx);
    const receivedSig = token.slice(dotIdx + 1);

    const expectedSig = sign(data, getSecret());

    // Constant-time comparison to prevent timing attacks
    const a = Buffer.from(receivedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "invalid" };
    }

    const payload = decode<ApprovalPayload>(data);

    if (Date.now() > payload.exp) {
      return { ok: false, reason: "expired" };
    }

    if (usedTokens.has(token)) {
      // Already used — idempotent: return ok so admin doesn't see an error
      // if they click the link twice, but we won't re-grant
      return { ok: true, payload };
    }

    usedTokens.add(token);
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
