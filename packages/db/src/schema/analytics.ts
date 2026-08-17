import { jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const analyticsEvents = pgTable("analytics_events", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  event: varchar("event", { length: 100 }).notNull(),
  properties: jsonb("properties").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
