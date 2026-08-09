import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, type HonoEnv } from "../middlewares/auth-middleware";
import { generateContent } from "../lib/langchain";
import { updateUserPoints, getUserPointsWithResetInfo } from "@generai/db/queries/users";
import { creditsConfig } from "@generai/config";
import { applyLazyResetIfDue } from "../lib/credit-reset";
import {
  saveGeneratedContent,
  getGeneratedContentHistory,
  deleteGeneratedContent,
  getGeneratedContentById,
} from "@generai/db/queries/generated-content";
import { trackEvent } from "../lib/analytics";

const MAX_IMAGE_BASE64_SIZE = 5 * 1024 * 1024; // 5MB

const generateBodySchema = z.object({
  contentType: z.enum(["thread", "instagram", "linkedin"]),
  prompt: z.string().min(1).max(1000),
  imageBase64: z.string().max(MAX_IMAGE_BASE64_SIZE, "Image too large").optional(),
});

export const generateRoutes = new Hono<HonoEnv>()
  .use("*", authMiddleware)

  .post("/api/generate", async (c) => {
    const user = c.get("user");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      console.error("[generate] /api/generate — could not parse JSON body");
      return c.json({ error: "Invalid request body" }, 400);
    }
    const parsed = generateBodySchema.safeParse(body);

    if (!parsed.success) {
      const imageTooLarge = parsed.error.issues.find(
        (issue) => issue.path[0] === "imageBase64" && issue.code === "too_big",
      );
      if (imageTooLarge) {
        console.error("[generate] /api/generate — image too large");
        return c.json({ error: "Image too large" }, 400);
      }
      console.error(
        "[generate] /api/generate — schema validation failed",
        JSON.stringify(parsed.error.flatten()),
      );
      return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
    }

    const { contentType, prompt, imageBase64 } = parsed.data;
    const promptPreview = prompt.length > 100 ? `${prompt.slice(0, 100)}…` : prompt;
    const imageKB = imageBase64 ? +(imageBase64.length / 1024).toFixed(1) : null;
    console.log(
      `[generate] /api/generate received userId=${user.id} contentType=${contentType} ` +
        `prompt=${JSON.stringify(promptPreview)} ` +
        `imageBase64=${imageKB ? `${imageKB}KB` : "none"}`,
    );

    const info = await getUserPointsWithResetInfo(user.id);
    const reset = await applyLazyResetIfDue(user.id);

    if (reset.applied === true) {
      trackEvent(c, "credits.reset", {
        userId: user.id,
        previousPoints: info.points,
        newPoints: reset.points,
      });
    }

    if (reset.points < creditsConfig.costPerGeneration) {
      console.error(
        `[generate] rejected — insufficient points for userId=${user.id} (have ${reset.points})`,
      );
      trackEvent(c, "generate.rejected", {
        userId: user.id,
        contentType,
        reason: "insufficient_points",
        creditsAvailable: reset.points,
      });
      return c.json({ error: "Insufficient points" }, 400);
    }

    try {
      console.log(
        `[generate] calling AI provider chain — contentType=${contentType} hasImage=${Boolean(imageBase64)}`,
      );
      const t0 = Date.now();
      const result = await generateContent(contentType, prompt, imageBase64);
      const elapsedMs = Date.now() - t0;

      console.log(
        `[generate] AI provider chain responded in ${elapsedMs}ms — ${result.content.length} caption(s)`,
      );
      console.log(
        `[generate] raw captions:\n${result.content.map((c, i) => `  #${i + 1}: ${c}`).join("\n")}`,
      );

      const affected = await updateUserPoints(user.id, -creditsConfig.costPerGeneration);
      if (affected === 0) {
        console.error(
          `[generate] rejected — concurrent consumption won the race for userId=${user.id}`,
        );
        trackEvent(c, "generate.rejected", {
          userId: user.id,
          contentType,
          reason: "race_condition",
        });
        return c.json({ error: "Insufficient points" }, 400);
      }

      const saved = await saveGeneratedContent(
        user.id,
        result.content.join("\n\n"),
        prompt,
        contentType,
      );

      console.log(
        `[generate] saved id=${saved?.id ?? "(none)"} userId=${user.id} elapsed=${elapsedMs}ms`,
      );

      trackEvent(c, "generate.success", {
        userId: user.id,
        contentType,
        creditsUsed: creditsConfig.costPerGeneration,
        elapsedMs,
        captionCount: result.content.length,
      });

      return c.json(
        {
          content: result.content,
          contentType: result.contentType,
          id: saved?.id,
        },
        200,
      );
    } catch (error) {
      console.error("[generate] Error generating content:", error);
      const message = error instanceof Error ? error.message : String(error);
      trackEvent(c, "generate.rejected", {
        userId: user.id,
        contentType,
        reason: "provider_error",
      });
      return c.json({ error: "Failed to generate content", detail: message }, 500);
    }
  })

  .get("/api/generate/history", async (c) => {
    const user = c.get("user");

    const items = await getGeneratedContentHistory(user.id);

    return c.json({ items }, 200);
  })

  .get("/api/generate/points", async (c) => {
    const user = c.get("user");

    const info = await getUserPointsWithResetInfo(user.id);

    return c.json(
      {
        points: info.effectivePoints,
        rawPoints: info.points,
        nextResetAt: info.nextResetAt.toISOString(),
        isDue: info.isDue,
        resetAmount: creditsConfig.resetAmount,
        resetInterval: creditsConfig.resetInterval,
        costPerGeneration: creditsConfig.costPerGeneration,
      },
      200,
    );
  })

  .delete("/api/generate/history", async (c) => {
    const user = c.get("user");
    const id = c.req.query("id");
    if (!id) {
      return c.json({ error: "Missing id query parameter" }, 400);
    }

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
