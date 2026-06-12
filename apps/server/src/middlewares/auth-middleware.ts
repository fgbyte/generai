import { auth } from "@generai/auth";
import { createMiddleware } from "hono/factory";

export type HonoEnv = {
  Bindings: {
    META_APP_ID: string;
    META_APP_SECRET: string;
    META_REDIRECT_URI: string;
    META_TOKEN_ENCRYPTION_KEY: string;
    MEDIA_BUCKET: R2Bucket;
    R2_PUBLIC_URL: string;
    [key: string]: unknown;
  };
  Variables: {
    user: typeof auth.$Infer.Session.user;
    session: typeof auth.$Infer.Session.session;
  };
};

export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});
