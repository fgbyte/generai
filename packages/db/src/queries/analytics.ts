import { db } from "@generai/db";
import { analyticsEvents } from "@generai/db/schema/analytics";

/**
 * Insert an analytics event for a user. Fire-and-forget: the caller does not
 * use the returned row, so nothing is returned.
 */
export const insertAnalyticsEvent = async (event: {
  userId: string;
  event: string;
  properties: Record<string, unknown>;
}) => {
  await db.insert(analyticsEvents).values({
    id: crypto.randomUUID(),
    userId: event.userId,
    event: event.event,
    properties: event.properties,
  });
};
