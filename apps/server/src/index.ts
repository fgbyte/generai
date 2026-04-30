import { auth } from "@generai/auth";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { logger } from "hono/logger";
import { corsMiddleware } from "./middlewares/cors-middleware";
import { todosRoute } from "./routes/todos.routes";
import { peopleRoutes } from "./routes/people.routes";
import { testRoute } from "./routes/test.routes";

const app = new OpenAPIHono();

const router = app
  // RAW OpenAPI en /doc
  .doc("/doc", {
    openapi: "3.0.0",
    info: { version: "1.0.0", title: "API" },
  })
  // Scalar UI en /docs
  .get("/docs", Scalar({ url: "/doc" }))
  //root route
  .get("/", (c) => c.text("OK"))
  //middlewares
  .use("/*", corsMiddleware) //enabled cors for all routes
  .use(logger())
  //routes
  .on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .route("/api/todos", todosRoute) //protected & OpenAPI route
  .route("/api/people", peopleRoutes) //public route
  .route("/api/test", testRoute); //public route

// Global error handler
app.onError((err, c) => {
  console.error("[Global Error]", c.req.method, c.req.url, err);
  return c.json({ message: "Internal Server Error", error: String(err) }, 500);
});

export type AppType = typeof router; // passing all the typed routes to the client
export default app;
