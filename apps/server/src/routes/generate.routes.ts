import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, type HonoEnv } from "../middlewares/auth-middleware";
import { generateContent } from "../lib/langchain";
import { getUserPoints, updateUserPoints } from "@generai/db/queries/users";
import {
  saveGeneratedContent,
  getGeneratedContentHistory,
  deleteGeneratedContent,
  getGeneratedContentById,
} from "@generai/db/queries/generated-content";

const generateBodySchema = z.object({
  contentType: z.enum(["thread", "instagram", "linkedin"]),
  prompt: z.string().min(1).max(1000),
  imageBase64: z.string().optional(),
});

export const generateRoutes = new Hono<HonoEnv>()
  .use("*", authMiddleware)

  .post("/api/generate", async (c) => {
    const user = c.get("user");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid request body" }, 400);
    }
    const parsed = generateBodySchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        400,
      );
    }

    const { contentType, prompt, imageBase64 } = parsed.data;

    const points = await getUserPoints(user.id);
    if (points < 5) {
      return c.json({ error: "Insufficient points" }, 400);
    }

    try {
      const result = await generateContent(contentType, prompt, imageBase64);

      await updateUserPoints(user.id, -5);

      const saved = await saveGeneratedContent(
        user.id,
        result.content.join("\n\n"),
        prompt,
        contentType,
      );

      return c.json(
        {
          content: result.content,
          contentType: result.contentType,
          id: saved?.id,
        },
        200,
      );
    } catch (error) {
      console.error("[Generate] Error generating content:", error);
      return c.json({ error: "Failed to generate content" }, 500);
    }
  })

  .get("/api/generate/history", async (c) => {
    const user = c.get("user");

    const items = await getGeneratedContentHistory(user.id);

    return c.json({ items }, 200);
  })

  .get("/api/generate/points", async (c) => {
    const user = c.get("user");

    const points = await getUserPoints(user.id);

    return c.json({ points }, 200);
  })

  .delete("/api/generate/history/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");

    const item = await getGeneratedContentById(id);

    if (!item) {
      return c.json({ error: "Not found" }, 404);
    }

    if (item.userId !== user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await deleteGeneratedContent(id);

    return c.json({ success: true }, 200);
  });
