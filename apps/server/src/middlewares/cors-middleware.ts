import { cors } from "hono/cors";
import { env } from "@generai/env/server";

export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN, //alchemy envs
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  exposeHeaders: ["Set-Cookie", "Content-Length"],
});
