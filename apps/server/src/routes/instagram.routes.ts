import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware, type HonoEnv } from "../middlewares/auth-middleware";
import {
  getOAuthUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getUserPages,
  createSingleImageContainer,
  createCarouselChildContainer,
  createCarouselParentContainer,
  pollContainerStatus,
  publishContainer,
  getContentPublishingLimit,
} from "../lib/instagram";
import { encryptAccountToken, decryptAccountToken, assertNoConcurrentPublish, ConcurrentPublishError } from "../lib/instagram-token";
import { sanitizeMetaError } from "../lib/instagram-errors";
import {
  createInstagramAccount,
  getInstagramAccountByUserId,
  getInstagramAccountById,
  updateInstagramAccount,
  deleteInstagramAccount,
} from "@generai/db/queries/instagram-accounts";
import {
  createPublishLog,
  updatePublishLog,
  getPublishLogsByAccountId,
} from "@generai/db/queries/instagram-publish-log";

// --- helpers ---

function getMetaConfig(env: HonoEnv["Bindings"]) {
  const appId = env.META_APP_ID;
  const appSecret = env.META_APP_SECRET;
  const redirectUri = env.META_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) {
    throw new Error("META_APP_ID, META_APP_SECRET, META_REDIRECT_URI are required");
  }
  return { appId, appSecret, redirectUri };
}

const MAX_UPLOAD_SIZE = 8 * 1024 * 1024; // 8MB

function validateImageMagicBytes(bytes: Uint8Array): "jpg" | "png" | null {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "png";
  return null;
}

// --- routes ---

export const instagramRoutes = new Hono<HonoEnv>()
  .use("*", authMiddleware)

  // ============================================
  // Task 14: Upload endpoint
  // ============================================
  .post("/api/instagram/upload", async (c) => {
    const user = c.get("user");

    // Pre-parse content-length check
    const contentLength = Number(c.req.header("content-length") ?? 0);
    if (contentLength > MAX_UPLOAD_SIZE) {
      return c.json({ error: "File too large (max 8MB)" }, 413);
    }

    const formData = await c.req.formData();
    const entry = formData.get("file");
    if (typeof entry === "string" || entry === null) {
      return c.json({ error: "Missing file field" }, 400);
    }
    const file = entry as unknown as Blob;

    if (file.size > MAX_UPLOAD_SIZE) {
      return c.json({ error: "File too large (max 8MB)" }, 400);
    }

    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      return c.json({ error: "Unsupported image type. Use JPEG or PNG." }, 400);
    }

    // Validate magic bytes
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const ext = validateImageMagicBytes(bytes);
    if (!ext) {
      return c.json({ error: "Invalid image. Magic bytes do not match JPEG or PNG." }, 400);
    }

    // Upload to R2
    const bucket = c.env.MEDIA_BUCKET;
    if (!bucket) {
      return c.json({ error: "Media bucket not configured" }, 500);
    }
    const key = `uploads/${user.id}/${crypto.randomUUID()}.${ext}`;
    await bucket.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    const publicUrl = c.env.R2_PUBLIC_URL
      ? `${c.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`
      : "";

    return c.json({ key, publicUrl }, 200);
  })

  // ============================================
  // Task 15: OAuth routes
  // ============================================
  .get("/api/instagram/auth-url", async (c) => {
    try {
      const config = getMetaConfig(c.env);
      const url = getOAuthUrl(config);
      return c.json({ url }, 200);
    } catch (err) {
      console.error("[IG auth-url]", err);
      return c.json({ error: "META config missing" }, 500);
    }
  })

  .get("/api/instagram/callback", async (c) => {
    const user = c.get("user");
    const code = c.req.query("code");
    if (!code) {
      return c.json({ error: "Missing code query parameter" }, 400);
    }

    try {
      const config = getMetaConfig(c.env);

      // 1. Exchange code for short-lived token
      const { accessToken: shortLived } = await exchangeCodeForToken(code, config);

      // 2. Exchange for long-lived token (60 days)
      const { accessToken: longLived, expiresIn } =
        await exchangeForLongLivedToken(shortLived, config);

      // 3. Find IG business account from user's pages
      const pages = await getUserPages(longLived);
      const page = pages.find((p) => p.igBusinessAccountId !== null);
      if (!page || !page.igBusinessAccountId) {
        return c.json(
          { error: "No Instagram Business account found on any of your pages" },
          400,
        );
      }

      // 4. Encrypt the page access token before storing
      const encryptedToken = await encryptAccountToken(page.accessToken);
      const tokenExpiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000)
        : null;

      // 5. Create or replace the user's IG account record
      const existing = await getInstagramAccountByUserId(user.id);
      if (existing) {
        const updated = await updateInstagramAccount(existing.id, {
          igUserId: page.igBusinessAccountId,
          igUsername: page.igUsername,
          fbPageId: page.id,
          fbPageName: page.name,
          pageAccessToken: encryptedToken,
          tokenExpiresAt,
        });
        return c.json({
          message: "Instagram account reconnected",
          account: {
            id: updated?.id,
            igUserId: updated?.igUserId,
            igUsername: updated?.igUsername,
            fbPageName: updated?.fbPageName,
          },
        }, 200);
      }

      const created = await createInstagramAccount({
        id: crypto.randomUUID(),
        userId: user.id,
        igUserId: page.igBusinessAccountId,
        igUsername: page.igUsername,
        fbPageId: page.id,
        fbPageName: page.name,
        pageAccessToken: encryptedToken,
        tokenExpiresAt,
      });

      return c.json({
        message: "Instagram account connected",
        account: {
          id: created?.id,
          igUserId: created?.igUserId,
          igUsername: created?.igUsername,
          fbPageName: created?.fbPageName,
        },
      }, 200);
    } catch (err) {
      const sanitized = sanitizeMetaError(err);
      return c.json(sanitized.body, sanitized.status as 400 | 401 | 429 | 500 | 502 | 503);
    }
  })

  // ============================================
  // Task 16: Account CRUD
  // ============================================
  .get("/api/instagram/accounts", async (c) => {
    const user = c.get("user");
    const account = await getInstagramAccountByUserId(user.id);
    if (!account) {
      return c.json({ accounts: [] }, 200);
    }
    // Strip the encrypted token from the response
    const { pageAccessToken, ...safe } = account;
    return c.json({ accounts: [safe] }, 200);
  })

  .delete("/api/instagram/accounts/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Missing id parameter" }, 400);
    }
    const account = await getInstagramAccountById(id);
    if (!account) {
      return c.json({ error: "Not found" }, 404);
    }
    if (account.userId !== user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await deleteInstagramAccount(id, user.id);
    return c.json({ success: true }, 200);
  })

  // ============================================
  // Task 17: Publish (single + carousel)
  // ============================================
  .post("/api/instagram/publish", async (c) => {
    const user = c.get("user");
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid request body" }, 400);
    }

    const singleSchema = z.object({
      mediaType: z.literal("single_image"),
      accountId: z.string().min(1),
      imageUrl: z.string().url(),
      caption: z.string().max(2200).optional(),
      altText: z.string().max(100).optional(),
    });
    const carouselSchema = z.object({
      mediaType: z.literal("carousel"),
      accountId: z.string().min(1),
      imageUrls: z.array(z.string().url()).min(2).max(10),
      caption: z.string().max(2200).optional(),
    });
    const schema = z.discriminatedUnion("mediaType", [singleSchema, carouselSchema]);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
    }
    const data = parsed.data;

    try {
      // 1. Verify account ownership
      const account = await getInstagramAccountById(data.accountId);
      if (!account) return c.json({ error: "Account not found" }, 404);
      if (account.userId !== user.id) return c.json({ error: "Forbidden" }, 403);

      // 2. Concurrent publish guard
      try {
        await assertNoConcurrentPublish(account.id);
      } catch (err) {
        if (err instanceof ConcurrentPublishError) {
          return c.json(
            { error: "Another publish is in progress for this account", publishLogId: err.publishLogId },
            409,
          );
        }
        throw err;
      }

      // 3. Pre-check quota
      const decrypted = await decryptAccountToken(account.pageAccessToken);
      const quota = await getContentPublishingLimit(account.igUserId, decrypted);
      if (quota.quotaUsage >= quota.publishingLimit) {
        return c.json(
          { error: "Instagram publishing quota exceeded", quota },
          429,
        );
      }

      // 4. Create publish log entry
      const log = await createPublishLog({
        id: crypto.randomUUID(),
        instagramAccountId: account.id,
        status: "processing",
        mediaType: data.mediaType,
        imageUrl: data.mediaType === "single_image" ? data.imageUrl : data.imageUrls[0],
        caption: data.caption ?? null,
        containerId: null,
        mediaId: null,
        errorCode: null,
        errorSubcode: null,
        errorMessage: null,
      });

      if (!log) {
        return c.json({ error: "Failed to create publish log" }, 500);
      }

      // 5. Publish based on type
      let mediaId: string;
      let containerId: string;

      if (data.mediaType === "single_image") {
        containerId = await createSingleImageContainer(
          account.igUserId,
          data.imageUrl,
          decrypted,
          data.caption,
          data.altText,
        );
        const poll = await pollContainerStatus(containerId, decrypted);
        if (poll.status !== "FINISHED" && poll.status !== "PUBLISHED") {
          await updatePublishLog(log.id, {
            status: "failed",
            errorCode: "CONTAINER_NOT_READY",
            errorMessage: poll.message ?? poll.status,
          });
          return c.json({ error: "Container not ready", status: poll.status }, 503);
        }
        mediaId = await publishContainer(account.igUserId, containerId, decrypted);
      } else {
        // Carousel
        const childIds: string[] = [];
        for (const url of data.imageUrls) {
          childIds.push(await createCarouselChildContainer(account.igUserId, url, decrypted));
        }
        for (const cid of childIds) {
          const poll = await pollContainerStatus(cid, decrypted);
          if (poll.status !== "FINISHED" && poll.status !== "PUBLISHED") {
            await updatePublishLog(log.id, {
              status: "failed",
              errorCode: "CAROUSEL_CHILD_NOT_READY",
              errorMessage: `Child ${cid}: ${poll.message ?? poll.status}`,
            });
            return c.json({ error: "Carousel child not ready" }, 503);
          }
        }
        containerId = await createCarouselParentContainer(
          account.igUserId,
          childIds,
          decrypted,
          data.caption,
        );
        const poll = await pollContainerStatus(containerId, decrypted);
        if (poll.status !== "FINISHED" && poll.status !== "PUBLISHED") {
          await updatePublishLog(log.id, {
            status: "failed",
            errorCode: "CAROUSEL_NOT_READY",
            errorMessage: poll.message ?? poll.status,
          });
          return c.json({ error: "Carousel parent not ready" }, 503);
        }
        mediaId = await publishContainer(account.igUserId, containerId, decrypted);
      }

      // 6. Update log with success
      await updatePublishLog(log.id, {
        status: "published",
        containerId,
        mediaId,
      });

      return c.json({ success: true, mediaId, containerId }, 200);
    } catch (err) {
      // Best-effort log update
      try {
        const account = await getInstagramAccountById(data.accountId);
        if (account) {
          const recent = (await getPublishLogsByAccountId(account.id, 1))[0];
          if (recent) {
            const e = err as { code?: number; subcode?: string; message?: string };
            await updatePublishLog(recent.id, {
              status: "failed",
              errorCode: e.code?.toString() ?? null,
              errorSubcode: e.subcode ?? null,
              errorMessage: e.message ?? "Unknown error",
            });
          }
        }
      } catch {
        // ignore log update failures
      }
      const sanitized = sanitizeMetaError(err);
      if (sanitized.status === 429 && sanitized.body.retryAfterSeconds) {
        c.header("Retry-After", String(sanitized.body.retryAfterSeconds));
      }
      return c.json(sanitized.body, sanitized.status as 400 | 401 | 429 | 500 | 502 | 503);
    }
  })

  // ============================================
  // Task 18: Publish log + Quota routes
  // ============================================
  .get("/api/instagram/publish-log", async (c) => {
    const user = c.get("user");
    const limit = Math.min(Math.max(Number(c.req.query("limit") ?? 20), 1), 100);
    const account = await getInstagramAccountByUserId(user.id);
    if (!account) {
      return c.json({ items: [] }, 200);
    }
    const logs = await getPublishLogsByAccountId(account.id, limit);
    return c.json({ items: logs }, 200);
  })

  .get("/api/instagram/quota", async (c) => {
    const user = c.get("user");
    const account = await getInstagramAccountByUserId(user.id);
    if (!account) {
      return c.json({ error: "No Instagram account connected" }, 404);
    }
    try {
      const decrypted = await decryptAccountToken(account.pageAccessToken);
      const quota = await getContentPublishingLimit(account.igUserId, decrypted);
      return c.json(quota, 200);
    } catch (err) {
      const sanitized = sanitizeMetaError(err);
      return c.json(sanitized.body, sanitized.status as 400 | 401 | 429 | 500 | 502 | 503);
    }
  });
