import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, type HonoEnv } from "../middlewares/auth-middleware";
import { getUserPreferences, upsertUserPreferences } from "@generai/db/queries/user-preferences";
import { getSubscriptionByUserId } from "@generai/db/queries/subscriptions";

const preferencesBodySchema = z.object({
  aiTone: z.enum(["Creative", "Professional", "Casual"]),
  defaultPlatform: z.enum(["Instagram", "Twitter (X)", "Dribbble", "Pinterest"]),
});

export const userRoutes = new Hono<HonoEnv>()
  .use("*", authMiddleware)

  .get("/api/user/subscription", async (c) => {
    const user = c.get("user");
    const subscription = await getSubscriptionByUserId(user.id);
    return c.json({ subscription: subscription ?? null }, 200);
  })

  .get("/api/user/preferences", async (c) => {
    const user = c.get("user");
    const preferences = await getUserPreferences(user.id);
    if (!preferences) {
      return c.json({ preferences: null }, 200);
    }
    return c.json(
      {
        preferences: {
          userId: preferences.userId,
          aiTone: preferences.aiTone,
          defaultPlatform: preferences.defaultPlatform,
          updatedAt: preferences.updatedAt.toISOString(),
        },
      },
      200,
    );
  })

  .put("/api/user/preferences", async (c) => {
    const user = c.get("user");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const parsed = preferencesBodySchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
    }

    const updated = await upsertUserPreferences(user.id, parsed.data);
    if (!updated) {
      return c.json({ error: "Failed to update preferences" }, 500);
    }
    return c.json(
      {
        preferences: {
          userId: updated.userId,
          aiTone: updated.aiTone,
          defaultPlatform: updated.defaultPlatform,
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
      200,
    );
  });
