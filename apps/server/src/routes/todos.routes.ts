import { CreateTodoSchema } from "@generai/db/schema/todos";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  getTodosByUserId,
  getTodoById,
  insertTodo,
  updateTodo,
  deleteTodo,
} from "@generai/db/queries/todos";
import { authMiddleware } from "@/middlewares/auth-middleware";
import type { HonoEnv } from "@/middlewares/auth-middleware";

export const todosRoute = new Hono<HonoEnv>()
  .use(authMiddleware)
  // GET /api/todos - List all todos
  .get("/", async (c) => {
    const user = c.get("user");
    try {
      const data = await getTodosByUserId(user.id);
      return c.json(data, 200);
    } catch (error) {
      return c.json({ message: "Failed to get todos", err: error }, 500);
    }
  })
  // GET /api/todos/:id - Get single todo
  .get("/:id", zValidator("param", z.object({ id: z.string() })), async (c) => {
    const { id } = c.req.valid("param");
    try {
      const data = await getTodoById(id);
      if (!data) {
        return c.json({ message: "Todo not found" }, 404);
      }
      return c.json(data, 200);
    } catch (error) {
      return c.json({ message: "Failed to get todo", err: error }, 500);
    }
  })
  // POST /api/todos - Create todo
  .post("/", zValidator("json", CreateTodoSchema), async (c) => {
    const user = c.get("user");
    console.log("POST /api/todos - user:", user?.id);
    
    let todoData;
    try {
      todoData = c.req.valid("json");
      console.log("POST /api/todos - body:", todoData);
    } catch (e) {
      console.error("POST /api/todos - validation error:", e);
      return c.json({ message: "Invalid request body", error: String(e) }, 400);
    }
    
    try {
      const newTodo = await insertTodo({
        ...todoData,
        userId: user.id,
      });
      console.log("POST /api/todos - created:", newTodo?.id);
      return c.json(newTodo, 201);
    } catch (error) {
      console.error("POST /api/todos - insert error:", error);
      return c.json({ message: "Failed to create todo", err: String(error) }, 500);
    }
  })
  // PATCH /api/todos/:id - Update todo
  .patch(
    "/:id",
    zValidator("param", z.object({ id: z.string() })),
    zValidator(
      "json",
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        completed: z.boolean().optional(),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");
      const updateData = c.req.valid("json");

      try {
        // Check if todo exists and belongs to user
        const existingTodo = await getTodoById(id);
        if (!existingTodo) {
          return c.json({ message: "Todo not found" }, 404);
        }
        if (existingTodo.userId !== user.id) {
          return c.json({ message: "Unauthorized" }, 403);
        }

        const updatedTodo = await updateTodo(id, updateData);
        return c.json(updatedTodo, 200);
      } catch (error) {
        return c.json({ message: "Failed to update todo", err: error }, 500);
      }
    }
  )
  // DELETE /api/todos/:id - Delete todo
  .delete(
    "/:id",
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const user = c.get("user");
      const { id } = c.req.valid("param");

      try {
        // Check if todo exists and belongs to user
        const existingTodo = await getTodoById(id);
        if (!existingTodo) {
          return c.json({ message: "Todo not found" }, 404);
        }
        if (existingTodo.userId !== user.id) {
          return c.json({ message: "Unauthorized" }, 403);
        }

        await deleteTodo(id);
        return c.json({ message: "Todo deleted successfully" }, 200);
      } catch (error) {
        return c.json({ message: "Failed to delete todo", err: error }, 500);
      }
    }
  );

export type TodosRouteType = typeof todosRoute;
