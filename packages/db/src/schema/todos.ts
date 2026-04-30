import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type z from "zod";

export const todos = pgTable("todos", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: varchar("content", { length: 1000 }),
  completed: boolean("completed").default(false),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export const TodoSchema = createSelectSchema(todos);
export const CreateTodoSchema = createInsertSchema(todos).omit({
  id: true,
  userId: true,
  completed: true,
  createdAt: true,
  updatedAt: true,
});

export type Todo = z.infer<typeof TodoSchema>;
export type NewTodo = z.infer<typeof CreateTodoSchema>;
