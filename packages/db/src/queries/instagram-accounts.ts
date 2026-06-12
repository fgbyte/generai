import { db } from "@generai/db";
import { instagramAccounts } from "@generai/db/schema/instagram-accounts";
import { desc, eq, and } from "drizzle-orm";

export type InsertInstagramAccount = typeof instagramAccounts.$inferInsert;
export type SelectInstagramAccount = typeof instagramAccounts.$inferSelect;

export const createInstagramAccount = async (data: InsertInstagramAccount) => {
  const [result] = await db
    .insert(instagramAccounts)
    .values({
      ...data,
      id: crypto.randomUUID(),
    })
    .returning();
  return result;
};

export const getInstagramAccountByUserId = async (userId: string) => {
  const [result] = await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.userId, userId))
    .limit(1);
  return result ?? null;
};

export const getInstagramAccountById = async (id: string) => {
  const [result] = await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.id, id))
    .limit(1);
  return result ?? null;
};

export const getInstagramAccountByIgUserId = async (igUserId: string) => {
  const [result] = await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.igUserId, igUserId))
    .limit(1);
  return result ?? null;
};

export const updateInstagramAccount = async (
  id: string,
  data: Partial<InsertInstagramAccount>,
) => {
  const [result] = await db
    .update(instagramAccounts)
    .set(data)
    .where(eq(instagramAccounts.id, id))
    .returning();
  return result;
};

export const deleteInstagramAccount = async (id: string, userId: string) => {
  const [result] = await db
    .delete(instagramAccounts)
    .where(
      and(
        eq(instagramAccounts.id, id),
        eq(instagramAccounts.userId, userId),
      ),
    )
    .returning();
  return result ?? null;
};

export const listInstagramAccounts = async () => {
  const result = await db
    .select()
    .from(instagramAccounts)
    .orderBy(desc(instagramAccounts.createdAt));
  return result;
};
