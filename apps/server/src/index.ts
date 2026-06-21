import { auth } from "@generai/auth";
import { env } from "@generai/env/server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { logger } from "hono/logger";
import { corsMiddleware } from "./middlewares/cors-middleware";
import { feedbackRoutes } from "./routes/feedback.routes";
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
    // Better Auth behavior with callbackURL (which is always present on email links):
    //   - Success: 302 redirect to callbackURL (no `error=` param)
    //   - Failure: 302 redirect to callbackURL?error=CODE
    //   - Without callbackURL: 200 (success) or 4xx (failure)
    const location = response.headers.get("location") ?? "";
    const isErrorRedirect = response.status === 302 && location.includes("error=");
    const isSuccess = response.ok || (response.status === 302 && !isErrorRedirect);
    if (isSuccess) {
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
  .route("/", userRoutes) // user routes for subscription + preferences
  .route("/", feedbackRoutes); // auth-protected feedback route

// Global error handler
app.onError((err, c) => {
  console.error("[Global Error]", c.req.method, c.req.url, err);
  return c.json({ message: "Internal Server Error", error: String(err) }, 500);
});

export type AppType = typeof router; // passing all the typed routes to the client
export default app;
