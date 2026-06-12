import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { instagramAccounts } from "./instagram-accounts";

export const instagramPublishLog = pgTable("instagram_publish_log", {
  id: text("id").primaryKey(),
  instagramAccountId: text("instagram_account_id")
    .notNull()
    .references(() => instagramAccounts.id, { onDelete: "cascade" }),
  containerId: text("container_id"),
  mediaId: text("media_id"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  errorCode: text("error_code"),
  errorSubcode: text("error_subcode"),
  errorMessage: text("error_message"),
  mediaType: varchar("media_type", { length: 50 }).notNull(),
  imageUrl: text("image_url"),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const instagramPublishLogRelations = relations(instagramPublishLog, ({ one }) => ({
  instagramAccount: one(instagramAccounts, {
    fields: [instagramPublishLog.instagramAccountId],
    references: [instagramAccounts.id],
  }),
}));
