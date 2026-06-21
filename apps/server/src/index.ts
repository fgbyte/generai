import { auth } from "@generai/auth";
import { env } from "@generai/env/server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { logger } from "hono/logger";
import { corsMiddleware } from "./middlewares/cors-middleware";
import { generateRoutes } from "./routes/generate.routes";
import { userRoutes } from "./routes/user.routes";

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
  // email verification redirect — must be before wildcard auth handler
  .get("/api/auth/verify-email", async (c) => {
    const response = await auth.handler(c.req.raw);
    if (response.ok) {
      return c.redirect(`${env.CORS_ORIGIN}/email-verified`, 302);
    }
    return c.redirect(`${env.CORS_ORIGIN}/email-verification-error`, 302);
  })
  .on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw))
  .get("/api/people", (c) =>
    c.json([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ]),
  )
  .get("/api/test", (c) => c.json({ message: "test" }))
  .route("/", generateRoutes) //auth-protected generate routes
  .route("/", userRoutes); // user routes for subscription + preferences

// Global error handler
app.onError((err, c) => {
  console.error("[Global Error]", c.req.method, c.req.url, err);
  return c.json({ message: "Internal Server Error", error: String(err) }, 500);
});

export type AppType = typeof router; // passing all the typed routes to the client
export default app;
