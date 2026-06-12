import { db } from "@generai/db";
import { instagramPublishLog } from "@generai/db/schema/instagram-publish-log";
import { and, desc, eq } from "drizzle-orm";

export type InsertPublishLog = typeof instagramPublishLog.$inferInsert;
export type SelectPublishLog = typeof instagramPublishLog.$inferSelect;

export const createPublishLog = async (data: InsertPublishLog) => {
  const [result] = await db
    .insert(instagramPublishLog)
    .values({
      ...data,
      id: crypto.randomUUID(),
    })
    .returning();
  return result;
};

export const getPublishLogById = async (id: string) => {
  const [result] = await db
    .select()
    .from(instagramPublishLog)
    .where(eq(instagramPublishLog.id, id))
    .limit(1);
  return result ?? null;
};

export const getPublishLogsByAccountId = async (
  accountId: string,
  limit = 50,
) => {
  const result = await db
    .select()
    .from(instagramPublishLog)
    .where(eq(instagramPublishLog.instagramAccountId, accountId))
    .orderBy(desc(instagramPublishLog.createdAt))
    .limit(limit);
  return result;
};

export const getProcessingPublishLogForAccount = async (accountId: string) => {
  const [result] = await db
    .select()
    .from(instagramPublishLog)
    .where(
      and(
        eq(instagramPublishLog.instagramAccountId, accountId),
        eq(instagramPublishLog.status, "processing"),
      ),
    )
    .limit(1);
  return result ?? null;
};

export const updatePublishLog = async (
  id: string,
  data: Partial<InsertPublishLog>,
) => {
  const [result] = await db
    .update(instagramPublishLog)
    .set(data)
    .where(eq(instagramPublishLog.id, id))
    .returning();
  return result;
};
