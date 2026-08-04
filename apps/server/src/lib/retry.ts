/**
 * Retry utilities — exponential backoff with jitter, retry wrapper, and error classification.
 * No external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackoffOpts {
  baseDelayMs?: number;
  maxDelayMs?: number;
}

interface WithRetriesOpts {
  maxAttempts: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (err: unknown) => boolean;
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

/** Codes / messages that indicate a transient network failure. */
const RETRYABLE_NETWORK = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const NON_RETRYABLE_HTTP_STATUSES = new Set([400, 401, 402, 403, 422]);

function extractHttpStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status: unknown }).status;
    if (typeof s === "number") return s;
  }
  return undefined;
}

function extractErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as { code: unknown }).code;
    if (typeof c === "string") return c;
  }
  return undefined;
}

function extractMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return undefined;
}

/**
 * Classify an error as retryable or not.
 *
 * Retryable:
 *   - Network codes: ECONNRESET, ETIMEDOUT, ECONNREFUSED, EPIPE, ENOTFOUND, EAI_AGAIN
 *   - Messages containing "fetch failed" or "TimeoutError"
 *   - HTTP 408, 429, 500, 502, 503, 504
 *
 * NOT retryable:
 *   - HTTP 400, 401, 402, 403, 422
 *   - Everything else
 */
export function isRetryableError(err: unknown): boolean {
  const code = extractErrorCode(err);
  const status = extractHttpStatus(err);
  const message = extractMessage(err);

  // Non-retryable HTTP statuses take precedence (fast fail for 4xx)
  if (status !== undefined && NON_RETRYABLE_HTTP_STATUSES.has(status)) {
    return false;
  }

  // Retryable HTTP statuses
  if (status !== undefined && RETRYABLE_HTTP_STATUSES.has(status)) {
    return true;
  }

  // Retryable network error codes
  if (code !== undefined && RETRYABLE_NETWORK.has(code)) {
    return true;
  }

  // Retryable message patterns
  if (message) {
    const lower = message.toLowerCase();
    if (lower.includes("fetch failed")) return true;
    if (lower.includes("timeouterror") || lower.includes("timed out")) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Backoff
// ---------------------------------------------------------------------------

/**
 * Exponential backoff with full jitter.
 *
 * delay = min(maxDelay, base * 2^attempt) + random(0, min(...))
 *
 * Attempt 0 always returns 0 (no delay before the first try).
 */
export function backoff(attempt: number, opts?: BackoffOpts): number {
  if (attempt <= 0) return 0;

  const base = opts?.baseDelayMs ?? 1000;
  const max = opts?.maxDelayMs ?? 30_000;

  const exponential = base * 2 ** (attempt - 1);
  const capped = Math.min(exponential, max);
  const jitter = Math.random() * capped;

  return capped + jitter;
}

// ---------------------------------------------------------------------------
// withRetries
// ---------------------------------------------------------------------------

/**
 * Execute `fn`, retrying up to `maxAttempts` times.
 *
 * Between retries, waits `backoff(attempt)` milliseconds.
 * Uses `isRetryableError` by default for classification; supply `shouldRetry`
 * to override.
 */
export async function withRetries<T>(fn: () => Promise<T>, opts: WithRetriesOpts): Promise<T> {
  const { maxAttempts, shouldRetry = isRetryableError } = opts;

  let lastErr: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      const canRetry = attempt < maxAttempts - 1 && shouldRetry(err);
      if (!canRetry) throw err;

      const delay = backoff(attempt + 1, {
        baseDelayMs: opts.baseDelayMs,
        maxDelayMs: opts.maxDelayMs,
      });

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Unreachable but satisfies TS
  throw lastErr;
}
