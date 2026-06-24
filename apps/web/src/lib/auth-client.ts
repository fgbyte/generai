import { env } from "@generai/env/web";
import { createAuthClient } from "better-auth/react";

import { getAuthToken, persistAuthTokenFromHeaders } from "@/lib/auth-token";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => getAuthToken(),
    },
    credentials: "include",
    onSuccess: (ctx) => {
      persistAuthTokenFromHeaders(ctx.response.headers);
    },
  },
});
