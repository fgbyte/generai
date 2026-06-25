import { env } from "@generai/env/web";
import { createAuthClient } from "better-auth/react";

import { getAuthToken, persistAuthToken } from "@/lib/auth-token";

/**
 * Read the bearer token from a Better Auth response.
 *
 * `signIn.email` and `signUp.email` always include the session token on the
 * JSON response body under `token` (see Better Auth's openapi schema for the
 * `/sign-in/email` endpoint: `{ redirect, token, user }`). The Android
 * System WebView used by Tauri Android is unreliable about which response
 * details survive the cross-origin fetch, so we keep this resilient:
 *   1) parse the response body we shadow-clone
 *   2) fall back to the `set-auth-token` header
 */
async function readTokenFromResponse(response: Response): Promise<string | null> {
  // 1) Read the body. We do this FIRST because on Android the WebView can
  //    surface a `null` `ctx.data` even when the actual JSON body is fine,
  //    but the underlying `Response` is still readable.
  try {
    const cloned = response.clone();
    const ct = cloned.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const body = (await cloned.json()) as unknown;
      if (
        body &&
        typeof body === "object" &&
        "token" in body &&
        typeof (body as { token: unknown }).token === "string" &&
        (body as { token: string }).token.length > 0
      ) {
        return (body as { token: string }).token;
      }
    }
  } catch {
    // body was not JSON or already consumed; fall through to header check.
  }

  // 2) Header fallback. Note: this header is sometimes stripped on Android
  //    System WebView (where CORS handling differs from desktop Chromium),
  //    but on web and Tauri desktop it's reliable.
  const headerToken = response.headers.get("set-auth-token");
  if (headerToken) return headerToken;

  return null;
}

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  fetchOptions: {
    // Global bearer auth: every request dispatched through `authClient.*`
    // will get `Authorization: Bearer <token>` automatically.
    auth: {
      type: "Bearer",
      token: () => getAuthToken(),
    },
    credentials: "include",
    onSuccess: async (ctx) => {
      const token = await readTokenFromResponse(ctx.response);
      if (token) {
        persistAuthToken(token);
      }
    },
  },
});
