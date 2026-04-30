import { Hono } from "hono";

export const testRoute = new Hono().get("/", (c) => {
  return c.json({ message: "test" });
});
