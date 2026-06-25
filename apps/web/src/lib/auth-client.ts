import { env } from "@generai/env/web";
import { createAuthClient } from "better-auth/react";

import { getAuthToken, persistAuthToken } from "@/lib/auth-token";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => getAuthToken(),
    },
    credentials: "include",
    onSuccess: (ctx) => {
      // Better Auth's bearer() plugin exposes the session token by setting
      // the `set-auth-token` response header. See:
      //   better-auth/src/plugins/bearer/index.ts (onResponse handler)
      // CORS exposes the header via `exposeHeaders: ["set-auth-token"]`
      // in apps/server/src/middlewares/cors-middleware.ts.
      const token = ctx.response.headers.get("set-auth-token");
      if (token) {
        persistAuthToken(token);
      }
    },
  },
});
