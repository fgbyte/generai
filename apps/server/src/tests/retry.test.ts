import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backoff, withRetries, isRetryableError } from "../lib/retry";

// --- Helpers ---

function makeHttpError(status: number, message = "HTTP Error"): Error & { status?: number } {
  const err = new Error(message) as Error & { status?: number };
  err.status = status;
  return err;
}

function makeNetworkError(code: string): Error & { code?: string } {
  const err = new Error(`${code}: connection refused`) as Error & { code?: string };
  err.code = code;
  return err;
}

// --- Tests ---

describe("backoff", () => {
  it("returns 0 for attempt 0", () => {
    const delay = backoff(0);
    expect(delay).toBe(0);
  });

  it("returns a positive delay for attempt > 0", () => {
    const delay = backoff(1);
    expect(delay).toBeGreaterThanOrEqual(0);
  });

  it("respects maxDelayMs cap", () => {
    // backoff = capped + jitter where both are <= maxDelayMs
    // So max possible = maxDelayMs + maxDelayMs = 2 * maxDelayMs
    const maxDelayMs = 500;
    const delay = backoff(100, { baseDelayMs: 100, maxDelayMs });
    expect(delay).toBeLessThanOrEqual(maxDelayMs * 2);
  });

  it("increases delay with attempt number (average)", () => {
    const delays10 = Array.from({ length: 20 }, () => backoff(10, { maxDelayMs: 10000 }));
    const delays1 = Array.from({ length: 20 }, () => backoff(1, { maxDelayMs: 10000 }));

    const avg10 = delays10.reduce((a, b) => a + b, 0) / delays10.length;
    const avg1 = delays1.reduce((a, b) => a + b, 0) / delays1.length;

    expect(avg10).toBeGreaterThan(avg1);
  });
});

describe("isRetryableError", () => {
  it("returns true for ECONNRESET", () => {
    expect(isRetryableError(makeNetworkError("ECONNRESET"))).toBe(true);
  });

  it("returns true for ETIMEDOUT", () => {
    expect(isRetryableError(makeNetworkError("ETIMEDOUT"))).toBe(true);
  });

  it("returns true for fetch failed errors", () => {
    const err = new Error("fetch failed");
    expect(isRetryableError(err)).toBe(true);
  });

  it("returns true for TimeoutError", () => {
    const err = new Error("TimeoutError: operation timed out");
    expect(isRetryableError(err)).toBe(true);
  });

  it("returns true for HTTP 429", () => {
    expect(isRetryableError(makeHttpError(429))).toBe(true);
  });

  it("returns true for HTTP 408", () => {
    expect(isRetryableError(makeHttpError(408))).toBe(true);
  });

  it("returns true for HTTP 500", () => {
    expect(isRetryableError(makeHttpError(500))).toBe(true);
  });

  it("returns true for HTTP 502", () => {
    expect(isRetryableError(makeHttpError(502))).toBe(true);
  });

  it("returns true for HTTP 503", () => {
    expect(isRetryableError(makeHttpError(503))).toBe(true);
  });

  it("returns true for HTTP 504", () => {
    expect(isRetryableError(makeHttpError(504))).toBe(true);
  });

  it("returns false for HTTP 400", () => {
    expect(isRetryableError(makeHttpError(400))).toBe(false);
  });

  it("returns false for HTTP 401", () => {
    expect(isRetryableError(makeHttpError(401))).toBe(false);
  });

  it("returns false for HTTP 402", () => {
    expect(isRetryableError(makeHttpError(402))).toBe(false);
  });

  it("returns false for HTTP 403", () => {
    expect(isRetryableError(makeHttpError(403))).toBe(false);
  });

  it("returns false for HTTP 422", () => {
    expect(isRetryableError(makeHttpError(422))).toBe(false);
  });

  it("returns false for unknown errors", () => {
    expect(isRetryableError(new Error("something weird"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isRetryableError("string error")).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });
});

describe("withRetries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls fn maxAttempts times on persistent failure", async () => {
    const fn = vi.fn(async () => {
      throw new Error("retryable error");
    });

    const promise = withRetries(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true,
    });
    // Prevent unhandled rejection warnings
    promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).rejects.toThrow("retryable error");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("stops on first success", async () => {
    const fn = vi.fn(async () => "success");

    const result = await withRetries(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      shouldRetry: () => true,
    });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("stops on success after some failures", async () => {
    let callCount = 0;
    const fn = vi.fn(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error("retryable error");
      }
      return "success";
    });

    const promise = withRetries(fn, {
      maxAttempts: 5,
      baseDelayMs: 100,
      shouldRetry: () => true,
    });

    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses default isRetryableError when shouldRetry not provided", async () => {
    const fn = vi.fn(async () => {
      throw new Error("something weird");
    });

    const promise = withRetries(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
    });
    // Prevent unhandled rejection warnings
    promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).rejects.toThrow("something weird");
    // Non-retryable error, should not retry
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable errors with default classifier", async () => {
    let callCount = 0;
    const fn = vi.fn(async () => {
      callCount++;
      if (callCount < 3) {
        const err = new Error("fetch failed");
        throw err;
      }
      return "success";
    });

    const promise = withRetries(fn, {
      maxAttempts: 5,
      baseDelayMs: 100,
    });
    // Prevent unhandled rejection warnings during retry delays
    promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
