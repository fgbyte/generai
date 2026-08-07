import {
  creditsConfig,
  computeEffectivePoints,
  computeNextResetAt,
  isResetDue,
} from "@generai/config/credits";
import { db } from "@generai/db";
import { user } from "@generai/db/schema/auth";
import { and, eq, gte, sql } from "drizzle-orm";

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
 * Update user points (add or subtract).
 * Negative deltas are guarded: the update only succeeds when the user's
 * current balance is >= the absolute delta, preventing negative balances.
 * @param userId - The Better-Auth user ID
 * @param delta - Positive to add, negative to subtract
 * @returns Number of affected rows (0 when guard fails or user not found)
 */
export const updateUserPoints = async (userId: string, delta: number) => {
  const where =
    delta < 0 ? and(eq(user.id, userId), gte(user.points, sql`${-delta}`)) : eq(user.id, userId);

  const result = await db
    .update(user)
    .set({ points: sql`${user.points} + ${delta}` })
    .where(where)
    .returning({ points: user.points });

  return result.length;
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

/**
 * Set user points to an absolute value and advance the reset boundary.
 * Used when applying a credit reset: the boundary is advanced via
 * `computeNextResetAt(oldBoundary, interval)` — NEVER `now()`.
 * @param userId - The Better-Auth user ID
 * @param newPoints - Absolute points value to set
 * @param newBoundary - The new reset boundary date
 * @returns The updated user row, or undefined if not found
 */
export const setUserPointsAbsolute = async (
  userId: string,
  newPoints: number,
  newBoundary: Date,
) => {
  const [result] = await db
    .update(user)
    .set({ points: newPoints, pointsResetAt: newBoundary })
    .where(eq(user.id, userId))
    .returning();
  return result;
};

/**
 * Return the user's points along with computed reset info.
 * Computes `lastResetAt`, `nextResetAt`, `isDue`, and `effectivePoints`
 * from the raw row values and `creditsConfig`.
 * @param userId - The Better-Auth user ID
 */
export const getUserPointsWithResetInfo = async (userId: string) => {
  const [row] = await db
    .select({
      points: user.points,
      pointsResetAt: user.pointsResetAt,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) {
    return {
      points: 0,
      lastResetAt: new Date(),
      nextResetAt: new Date(),
      isDue: false,
      effectivePoints: 0,
    };
  }

  const { resetInterval, resetAmount } = creditsConfig;
  const lastResetAt = row.pointsResetAt;
  const isDueFlag = isResetDue(lastResetAt, resetInterval);
  const nextResetAt = isDueFlag ? new Date() : computeNextResetAt(lastResetAt, resetInterval);
  const effectivePoints = computeEffectivePoints(
    row.points,
    lastResetAt,
    resetInterval,
    resetAmount,
  );

  return {
    points: row.points,
    lastResetAt,
    nextResetAt,
    isDue: isDueFlag,
    effectivePoints,
  };
};

/**
 * Delete a user account. Related rows (sessions, accounts, generated content,
 * subscriptions, preferences) are removed automatically via the schema's
 * `onDelete: "cascade"` foreign keys.
 * @param userId - The Better-Auth user ID
 * @returns The deleted user row, or undefined if no user matched
 */
export const deleteUser = async (userId: string) => {
  const [result] = await db.delete(user).where(eq(user.id, userId)).returning();
  return result;
};
