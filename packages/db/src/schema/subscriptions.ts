import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(), // Use text like Better-Auth uses
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  stripeSubscriptionId: varchar("stripe_subscription_id", {
    length: 255,
  }).notNull(),
  plan: varchar("plan", {
    length: 50,
  }).notNull(),
  status: varchar("status", {
    length: 50,
  }).notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
});

export const subscriptionRelations = relations(subscriptions, ({ one }) => ({
  user: one(user, {
    fields: [subscriptions.userId],
    references: [user.id],
  }),
}));
