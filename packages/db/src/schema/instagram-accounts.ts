import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const instagramAccounts = pgTable("instagram_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  igUserId: text("ig_user_id").notNull(),
  igUsername: varchar("ig_username", { length: 255 }),
  fbPageId: text("fb_page_id").notNull(),
  fbPageName: varchar("fb_page_name", { length: 255 }),
  pageAccessToken: text("page_access_token").notNull(), // ENCRYPTED ciphertext
  tokenExpiresAt: timestamp("token_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const instagramAccountsRelations = relations(instagramAccounts, ({ one }) => ({
  user: one(user, {
    fields: [instagramAccounts.userId],
    references: [user.id],
  }),
}));
