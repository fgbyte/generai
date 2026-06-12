/**
 * Maps Meta Graph API errors to sanitized HTTP responses.
 * NEVER returns raw Meta error to client — logs full error server-side, returns safe message.
 *
 * Error code reference:
 *   - 190 (code) = invalid/expired token
 *   - 4 with subcode 9004 = media not ready
 *   - 4 with subcode 2207001 = rate limit
 *   - 429 (status) = rate limit
 *   - 4xx other = client error
 *   - 5xx = server error / Meta unavailable
 */

import { InstagramApiError } from "./instagram";

export interface SanitizedError {
  status: number;
  body: { error: string; code?: string; retryAfterSeconds?: number };
}

export function isRateLimitError(error: unknown): boolean {
  if (error instanceof InstagramApiError) {
    if (error.status === 429) return true;
    if (error.code === 4 && error.subcode === "2207001") return true;
  }
  return false;
}

export function isTokenExpiredError(error: unknown): boolean {
  if (error instanceof InstagramApiError) {
    return error.code === 190;
  }
  return false;
}

export function sanitizeMetaError(error: unknown): SanitizedError {
  // Log full error server-side (without the request URL/token)
  if (error instanceof InstagramApiError) {
    console.error("[Meta]", {
      code: error.code,
      subcode: error.subcode,
      message: error.message,
      type: error.type,
    });
  } else if (error instanceof Error) {
    console.error("[Meta non-IG-error]", error.message);
  }

  if (isTokenExpiredError(error) && error instanceof InstagramApiError) {
    return {
      status: 401,
      body: {
        error: "Instagram connection expired. Please reconnect.",
        code: "TOKEN_EXPIRED",
      },
    };
  }

  if (isRateLimitError(error) && error instanceof InstagramApiError) {
    return {
      status: 429,
      body: {
        error: "Instagram rate limit reached. Try again later.",
        retryAfterSeconds: 60,
      },
    };
  }

  if (error instanceof InstagramApiError) {
    // Subcode 9004 = media not ready
    if (error.code === 4 && error.subcode === "9004") {
      return {
        status: 503,
        body: { error: "Instagram is still processing. Try again in a moment." },
      };
    }
    // Other 4xx
    if ((error.status ?? 0) >= 400 && (error.status ?? 0) < 500) {
      return {
        status: 400,
        body: { error: "Instagram rejected the request." },
      };
    }
    // 5xx
    return {
      status: 502,
      body: { error: "Instagram is temporarily unavailable." },
    };
  }

  // Unknown / non-InstagramApiError
  return {
    status: 500,
    body: { error: "An unexpected error occurred." },
  };
}
