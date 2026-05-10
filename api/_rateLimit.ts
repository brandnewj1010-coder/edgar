import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * 인메모리 IP별 사용량 제한.
 * Vercel 서버리스는 인스턴스별로 메모리가 분리되므로 100% 정확하진 않지만,
 * MVP 단계의 비용 폭주 방어용으로는 충분. 추후 Supabase 카운터로 이전 가능.
 */

const WINDOW_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitOutcome = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export function getClientIp(req: VercelRequest): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0]!.trim();
  if (Array.isArray(xff) && xff.length > 0) {
    return String(xff[0]).split(",")[0]!.trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

export function checkRateLimit(
  ip: string,
  limit: number = DEFAULT_LIMIT,
): RateLimitOutcome {
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt < now) {
    const fresh: Bucket = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(ip, fresh);
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt: fresh.resetAt,
    };
  }

  if (bucket.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function applyRateLimitHeaders(
  res: VercelResponse,
  outcome: RateLimitOutcome,
) {
  res.setHeader("X-RateLimit-Limit", String(outcome.limit));
  res.setHeader("X-RateLimit-Remaining", String(outcome.remaining));
  res.setHeader(
    "X-RateLimit-Reset",
    String(Math.floor(outcome.resetAt / 1000)),
  );
}
