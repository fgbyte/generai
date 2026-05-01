import { db } from "@generai/db";
import { user } from "@generai/db/schema/auth";
import { eq, sql } from "drizzle-orm";

/**
 * Find a user by their Stripe customer ID
 */
export const getUserByStripeCustomerId = async (stripeCustomerId: string) => {
  const [result] = await db
    .select()
    .from(user)
    .where(eq(user.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return result;
};

/**
 * Update user points (add or subtract)
 * @param userId - The Better-Auth user ID
 * @param pointsToAdd - Positive to add, negative to subtract
 */
export const updateUserPoints = async (userId: string, pointsToAdd: number) => {
  const [result] = await db
    .update(user)
    .set({
      points: sql`${user.points} + ${pointsToAdd}`
    })
    .where(eq(user.id, userId))
    .returning();
  return result;
};

/**
 * Get current user points
 * @param userId - The Better-Auth user ID
 * @returns Points balance or 0 if user not found
 */
export const getUserPoints = async (userId: string) => {
  try {
    const [result] = await db
      .select({ points: user.points })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    return result?.points ?? 0;
  } catch (error) {
    console.error("Error fetching user points:", error);
    return 0;
  }
};