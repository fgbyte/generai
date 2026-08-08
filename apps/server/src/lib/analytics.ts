import { insertAnalyticsEvent } from "@generai/db/queries/analytics";
import type { Context } from "hono";
import type { HonoEnv } from "../middlewares/auth-middleware";
import {
  sanitizeProperties,
  type AnalyticsEventName,
  type AnalyticsProperties,
} from "./analytics-types";

/**
 * Server-side analytics event logger.
 *
 * Fire-and-forget: the DB write is scheduled via `c.executionCtx.waitUntil`
 * and never blocks the caller. Events are only written when analytics is
 * enabled AND the stage is production. This function never throws.
 */

function getEnv(c: Context<HonoEnv>, key: string): unknown {
  return (c.env as Record<string, unknown>)[key];
}

export function trackEvent(
  c: Context<HonoEnv>,
  eventName: AnalyticsEventName,
  properties: AnalyticsProperties,
): void {
  try {
    // Stage gate: disabled via ANALYTICS_ENABLED (boolean or string form).
    const analyticsEnabled = getEnv(c, "ANALYTICS_ENABLED");
    if (analyticsEnabled === false || analyticsEnabled === "false") return;

    // Stage gate: only write in production (default when unset).
    const stage =
      (getEnv(c, "ENV") as string | undefined) ??
      (getEnv(c, "NODE_ENV") as string | undefined) ??
      "production";
    if (stage !== "production") return;

    // PII sanitization ALWAYS runs before any DB write.
    const safe = sanitizeProperties(eventName, properties);

    c.executionCtx.waitUntil(
      insertAnalyticsEvent({
        userId: safe.userId as string,
        event: eventName,
        properties: safe,
        env: stage,
      }).catch((err) => {
        console.error("[analytics] failed to write event:", err);
      }),
    );
  } catch (err) {
    console.error("[analytics] trackEvent failed:", err);
  }
}

/**
 * Convenience wrapper for rejected/error events. Fires `generate.rejected`
 * with a fixed `reason` — the error message text is NEVER included in the
 * event properties (PII/leak guard). Sanitization still applies.
 */
export function trackError(
  c: Context<HonoEnv>,
  error: unknown,
  context: { userId: string; contentType?: string },
): void {
  void error; // intentionally not logged — see PII/leak guard above
  trackEvent(c, "generate.rejected", {
    userId: context.userId,
    contentType: context.contentType,
    reason: "provider_error",
  });
}
