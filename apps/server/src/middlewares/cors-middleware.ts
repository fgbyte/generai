import { cors } from "hono/cors";
import { env, getTrustedOrigins } from "@generai/env/server";

const trustedOrigins = getTrustedOrigins();

export const corsMiddleware = cors({
  origin: (origin) => {
    // Allow trusted origins (web app + Tauri clients)
    if (trustedOrigins.includes(origin)) return origin;

    // Fallback to web app origin for non-browser clients (no origin header)
    if (!origin) return env.CORS_ORIGIN;

    // Reject unknown origins
    return null;
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  exposeHeaders: ["Set-Cookie", "set-auth-token", "Content-Length"],
});
