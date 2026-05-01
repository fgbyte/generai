import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const generatedContent = pgTable("generated_content", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  prompt: text("prompt").notNull(),
  contentType: varchar("content_type", {
    length: 50,
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generatedContentRelations = relations(generatedContent, ({ one }) => ({
  user: one(user, {
    fields: [generatedContent.userId],
    references: [user.id],
  }),
}));
