import { db } from "@generai/db";
import { subscriptions } from "@generai/db/schema/subscriptions";
import { desc, eq } from "drizzle-orm";

/**
 * Get subscription by Stripe subscription ID
 */
export const getSubscriptionByStripeId = async (stripeSubscriptionId: string) => {
  const [result] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);
  return result;
};

/**
 * Create or update a subscription
 */
export const createOrUpdateSubscription = async (
  userId: string,
  stripeSubscriptionId: string,
  plan: string,
  status: string,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
) => {
  // Check if subscription exists
  const existing = await getSubscriptionByStripeId(stripeSubscriptionId);

  if (existing) {
    // Update existing subscription
    const [updated] = await db
      .update(subscriptions)
      .set({
        plan,
        status,
        currentPeriodStart,
        currentPeriodEnd,
      })
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .returning();
    return updated;
  }

  // Create new subscription
  const [created] = await db
    .insert(subscriptions)
    .values({
      id: crypto.randomUUID(),
      userId,
      stripeSubscriptionId,
      plan,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    })
    .returning();
  return created;
};

/**
 * Get the most recent subscription for a user, ordered by currentPeriodEnd DESC.
 * Returns null when the user has no subscription row.
 */
export const getSubscriptionByUserId = async (
  userId: string,
): Promise<typeof subscriptions.$inferSelect | null> => {
  const [result] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.currentPeriodEnd))
    .limit(1);
  return result ?? null;
};
