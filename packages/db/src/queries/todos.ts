import { db } from "@generai/db";
import { todos } from "@generai/db/schema/todos";
import { desc, eq } from "drizzle-orm";

export const insertTodo = async (todo: typeof todos.$inferInsert) => {
  const [result] = await db.insert(todos).values(todo).returning();
  return result;
};

export const getTodoById = async (id: string) => {
  const [result] = await db.select().from(todos).where(eq(todos.id, id));
  return result;
};

export const getTodosByUserId = async (userId: string) => {
  const result = await db
    .select()
    .from(todos)
    .where(eq(todos.userId, userId))
    .orderBy(desc(todos.createdAt));
  return result;
};

export const updateTodo = async (
  id: string,
  data: Partial<typeof todos.$inferInsert>
) => {
  const [result] = await db
    .update(todos)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(todos.id, id))
    .returning();
  return result;
};

export const deleteTodo = async (id: string) => {
  const [result] = await db
    .delete(todos)
    .where(eq(todos.id, id))
    .returning();
  return result;
};
