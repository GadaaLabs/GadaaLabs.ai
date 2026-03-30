// Simple in-memory rate limiter — per IP, resets every window
const store = new Map<string, { count: number; reset: number }>();

const WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 10;

export function checkRateLimit(
  ip: string,
  maxRequests = DEFAULT_MAX_REQUESTS
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.reset) {
    store.set(ip, { count: 1, reset: now + WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}
