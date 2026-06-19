import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Per-user preferences for AI generation and default publishing platform.
 *
 * One row per user, keyed by `userId` (which doubles as the foreign key to `user`).
 * When the owning user is deleted, the row is removed via `ON DELETE CASCADE`.
 */
export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  aiTone: varchar("ai_tone", { length: 32 }).notNull().default("Creative"),
  defaultPlatform: varchar("default_platform", { length: 32 }).notNull().default("Instagram"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(user, {
    fields: [userPreferences.userId],
    references: [user.id],
  }),
}));
