/**
 * Analytics event type definitions and PII-safe property filtering.
 *
 * Every analytics event is logged with a fixed set of properties. The
 * allowlist defines which keys may be emitted per event; the blocklist
 * hard-rejects PII regardless of the allowlist. `sanitizeProperties` is the
 * single gatekeeper between the routes and the logger.
 */

export type AnalyticsEventName = "generate.success" | "generate.rejected" | "credits.reset";

/** Base shape for analytics properties. `userId` is always required. */
export interface AnalyticsProperties {
  userId: string;
  [key: string]: unknown;
}

/**
 * Per-event allowlist of property keys that may be logged.
 * Keys not listed here are stripped by `sanitizeProperties`.
 */
export const EVENT_PROPERTY_ALLOWLIST: Record<AnalyticsEventName, readonly string[]> = {
  "generate.success": ["userId", "contentType", "creditsUsed", "elapsedMs", "captionCount"],
  "generate.rejected": ["userId", "contentType", "reason", "creditsAvailable"],
  "credits.reset": ["userId", "previousPoints", "newPoints"],
};

/** Property keys that must NEVER be logged, regardless of allowlist. */
export const PII_BLOCKLIST: readonly string[] = [
  "prompt",
  "content",
  "imageBase64",
  "email",
  "imageKB",
  "promptPreview",
];

/**
 * Strip properties that are not in the event's allowlist OR are on the PII
 * blocklist. Returns a new object — the input is never mutated.
 */
export function sanitizeProperties(
  eventName: AnalyticsEventName,
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const allowlist = EVENT_PROPERTY_ALLOWLIST[eventName];
  const sanitized: Record<string, unknown> = {};

  for (const key of Object.keys(properties)) {
    if (allowlist.includes(key) && !PII_BLOCKLIST.includes(key)) {
      sanitized[key] = properties[key];
    }
  }

  return sanitized;
}
