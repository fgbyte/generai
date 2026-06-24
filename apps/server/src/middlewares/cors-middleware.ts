import { cors } from "hono/cors";
import { env } from "@generai/env/server";

export const corsMiddleware = cors({
  origin: () => env.CORS_ORIGIN, // read lazily per-request so env bindings are guaranteed to be populated
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  exposeHeaders: ["Set-Cookie", "Content-Length"],
});
