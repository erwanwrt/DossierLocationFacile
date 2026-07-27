import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { pool } from "@/lib/auth";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

function getValidIp(value: string | null) {
  const candidate = value?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

export function getClientIp(headers: Headers) {
  const cloudflareIp = getValidIp(headers.get("cf-connecting-ip"));
  if (cloudflareIp) {
    return cloudflareIp;
  }

  const realIp = getValidIp(headers.get("x-real-ip"));
  if (realIp) {
    return realIp;
  }

  const forwardedIps = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter((value) => isIP(value));

  return forwardedIps?.at(-1) || null;
}

function hashClientIp(ipAddress: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing env.BETTER_AUTH_SECRET");
  }

  return createHmac("sha256", secret)
    .update(`submission-rate-limit:${ipAddress}`)
    .digest("hex");
}

export async function enforceSubmissionRateLimit(
  ipAddress: string
): Promise<RateLimitResult> {
  const rateLimitKey = hashClientIp(ipAddress);
  const result = await pool.query<{
    request_count: number;
    retry_after_seconds: number;
  }>(
    `
      INSERT INTO public.submission_rate_limits (
        rate_limit_key,
        window_start,
        request_count,
        updated_at
      )
      VALUES ($1, NOW(), 1, NOW())
      ON CONFLICT (rate_limit_key) DO UPDATE
      SET
        request_count = CASE
          WHEN public.submission_rate_limits.window_start
            <= NOW() - ($2 * INTERVAL '1 second')
          THEN 1
          ELSE public.submission_rate_limits.request_count + 1
        END,
        window_start = CASE
          WHEN public.submission_rate_limits.window_start
            <= NOW() - ($2 * INTERVAL '1 second')
          THEN NOW()
          ELSE public.submission_rate_limits.window_start
        END,
        updated_at = NOW()
      RETURNING
        request_count,
        GREATEST(
          1,
          CEIL(
            EXTRACT(
              EPOCH FROM (
                window_start
                + ($2 * INTERVAL '1 second')
                - NOW()
              )
            )
          )
        )::integer AS retry_after_seconds
    `,
    [rateLimitKey, RATE_LIMIT_WINDOW_SECONDS]
  );

  const row = result.rows[0];
  return {
    allowed: row.request_count <= RATE_LIMIT_MAX,
    retryAfterSeconds: row.retry_after_seconds,
  };
}
