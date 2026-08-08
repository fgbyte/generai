import { db } from "@generai/db";
import { analyticsEvents } from "@generai/db/schema/analytics";
import { and, desc, eq } from "drizzle-orm";

/**
 * Insert an analytics event for a user
 */
export const insertAnalyticsEvent = async (event: {
  userId: string;
  event: string;
  properties: Record<string, unknown>;
  env?: string;
}) => {
  const [result] = await db
    .insert(analyticsEvents)
    .values({
      id: crypto.randomUUID(),
      userId: event.userId,
      event: event.event,
      properties: event.properties,
      env: event.env ?? "production",
    })
    .returning();
  return result;
};

/**
 * Get analytics events, optionally filtered by user and/or event name
 */
export const getAnalyticsEvents = async (options: {
  userId?: string;
  event?: string;
  limit?: number;
}) => {
  const { userId, event, limit = 50 } = options;
  const conditions = [];
  if (userId) {
    conditions.push(eq(analyticsEvents.userId, userId));
  }
  if (event) {
    conditions.push(eq(analyticsEvents.event, event));
  }
  const result = await db
    .select()
    .from(analyticsEvents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(limit);
  return result;
};
