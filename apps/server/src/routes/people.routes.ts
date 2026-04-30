import { Hono } from "hono";

export const peopleRoutes = new Hono().get("/", (c) => {
  return c.json([
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
    { id: 3, name: "Charlie" },
  ]);
});
