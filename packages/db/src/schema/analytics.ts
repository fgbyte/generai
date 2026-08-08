import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const analyticsEvents = pgTable("analytics_events", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  event: varchar("event", { length: 100 }).notNull(),
  properties: jsonb("properties").$type<Record<string, unknown>>().notNull().default({}),
  env: varchar("env", { length: 20 }).notNull().default("production"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(user, {
    fields: [analyticsEvents.userId],
    references: [user.id],
  }),
}));
