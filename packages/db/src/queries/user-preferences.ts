import { db } from "@generai/db";
import { userPreferences } from "@generai/db/schema/user-preferences";
import { eq } from "drizzle-orm";

/**
 * Get preferences for a user, or null if none exist
 */
export const getUserPreferences = async (
  userId: string,
): Promise<typeof userPreferences.$inferSelect | null> => {
  const [result] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return result ?? null;
};

/**
 * Create or update preferences for a user (keyed by userId)
 */
export const upsertUserPreferences = async (
  userId: string,
  data: { aiTone?: string; defaultPlatform?: string },
) => {
  const [result] = await db
    .insert(userPreferences)
    .values({
      userId,
      ...(data.aiTone !== undefined && { aiTone: data.aiTone }),
      ...(data.defaultPlatform !== undefined && {
        defaultPlatform: data.defaultPlatform,
      }),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        ...(data.aiTone !== undefined && { aiTone: data.aiTone }),
        ...(data.defaultPlatform !== undefined && {
          defaultPlatform: data.defaultPlatform,
        }),
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
};
