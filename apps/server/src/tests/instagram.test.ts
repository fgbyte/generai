import { describe, expect, it, vi, beforeEach } from "vitest";

// Set env var before imports (needed by crypto module lazily in getEncryptionKey)
process.env.META_TOKEN_ENCRYPTION_KEY = "dGVzdC1rZXktdGVzdC1rZXktdGVzdC1rZXktdGVzdC1rZXkxMjM0NTY3OA==";

// ---- Module mocks ----

vi.mock("@generai/env/server", () => ({
  env: { CORS_ORIGIN: "http://localhost:3000", DATABASE_URL: "postgresql://test:test@localhost:5432/test" },
}));

vi.mock("@generai/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: "u1", email: "t@t.com", name: "Test" },
        session: { id: "s1", userId: "u1" },
      }),
    },
  },
}));

vi.mock("@generai/db/queries/instagram-accounts", () => ({
  createInstagramAccount: vi.fn(),
  getInstagramAccountByUserId: vi.fn(),
  getInstagramAccountById: vi.fn(),
  updateInstagramAccount: vi.fn(),
  deleteInstagramAccount: vi.fn(),
}));

// Use vi.hoisted for instagram-publish-log mocks (same pattern as generate.test.ts)
const mockCreatePublishLog = vi.hoisted(() => vi.fn());
const mockGetPublishLogById = vi.hoisted(() => vi.fn());
const mockGetPublishLogsByAccountId = vi.hoisted(() => vi.fn());
const mockGetProcessingPublishLogForAccount = vi.hoisted(() => vi.fn());
const mockUpdatePublishLog = vi.hoisted(() => vi.fn());

vi.mock("@generai/db/queries/instagram-publish-log", () => ({
  createPublishLog: mockCreatePublishLog,
  getPublishLogById: mockGetPublishLogById,
  getPublishLogsByAccountId: mockGetPublishLogsByAccountId,
  getProcessingPublishLogForAccount: mockGetProcessingPublishLogForAccount,
  updatePublishLog: mockUpdatePublishLog,
}));

// Mock crypto to avoid needing valid encrypted tokens — identity passthrough
vi.mock("../lib/crypto", () => ({
  encryptToken: vi.fn((t: string) => Promise.resolve(t)),
  decryptToken: vi.fn((t: string) => Promise.resolve(t)),
}));

// ---- Hoisted fetch mock ----

const mockFetch = vi.hoisted(() => vi.fn());
globalThis.fetch = mockFetch as unknown as typeof fetch;

// ---- Imports (after all mocks) ----

import app from "../index";
import * as accountsQueries from "@generai/db/queries/instagram-accounts";
import * as logQueries from "@generai/db/queries/instagram-publish-log";

// Sanity check: the hoisted mocks are the same as what the module exports
if (logQueries.getPublishLogsByAccountId !== mockGetPublishLogsByAccountId) {
  throw new Error("Mock reference mismatch: getPublishLogsByAccountId");
}

// ---- Test env bindings (passed as third arg to app.request for c.env access) ----

const testEnv = {
  META_APP_ID: "test-app-id",
  META_APP_SECRET: "test-app-secret",
  META_REDIRECT_URI: "http://localhost:3000/api/instagram/callback",
  META_TOKEN_ENCRYPTION_KEY: "dGVzdC1rZXktdGVzdC1rZXktdGVzdC1rZXktdGVzdC1rZXkxMjM0NTY3OA==",
  MEDIA_BUCKET: { put: vi.fn().mockResolvedValue(undefined) },
  R2_PUBLIC_URL: "https://test-bucket.r2.dev",
};

// ---- Helpers ----

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function igRequest(path: string, init?: RequestInit) {
  return app.request(path, init, testEnv as any);
}

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;

  // Reset all vi.hoisted mocks (calls + implementations)
  mockCreatePublishLog.mockReset();
  mockGetPublishLogById.mockReset();
  mockGetPublishLogsByAccountId.mockReset();
  mockGetProcessingPublishLogForAccount.mockReset();
  mockUpdatePublishLog.mockReset();
});

// ============================================================================
// Tests
// ============================================================================

describe("Instagram API", () => {
  // ============================================
  // Auth URL
  // ============================================
  describe("GET /api/instagram/auth-url", () => {
    it("returns OAuth URL with correct scopes", async () => {
      const res = await igRequest("/api/instagram/auth-url");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.url).toContain("instagram_business_basic");
      expect(body.url).toContain("instagram_business_content_publish");
      expect(body.url).toContain("pages_show_list");
      expect(body.url).toContain("business_management");
    });
  });

  // ============================================
  // Callback
  // ============================================
  describe("GET /api/instagram/callback", () => {
    it("exchanges code, fetches pages, creates account", async () => {
      // 1. short-lived token
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ access_token: "short", expires_in: 3600 }));
      // 2. long-lived token
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ access_token: "long", expires_in: 5184000 }));
      // 3. pages
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({
          data: [
            {
              id: "page-1",
              name: "My Page",
              access_token: "page-tok",
              instagram_business_account: { id: "ig-1", username: "myig" },
            },
          ],
        }),
      );

      vi.mocked(accountsQueries.getInstagramAccountByUserId).mockResolvedValueOnce(null);
      vi.mocked(accountsQueries.createInstagramAccount).mockResolvedValueOnce({
        id: "acc-1",
        userId: "u1",
        igUserId: "ig-1",
        igUsername: "myig",
        fbPageId: "page-1",
        fbPageName: "My Page",
        pageAccessToken: "encrypted",
        tokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await igRequest("/api/instagram/callback?code=auth-code");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toContain("connected");
      expect(body.account.id).toBe("acc-1");
      expect(body.account.igUsername).toBe("myig");
    });

    it("returns 400 when code missing", async () => {
      const res = await igRequest("/api/instagram/callback");
      expect(res.status).toBe(400);
    });

    it("returns 400 when no IG business account on any page", async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ access_token: "short", expires_in: 3600 }));
      mockFetch.mockResolvedValueOnce(mockJsonResponse({ access_token: "long" }));
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: [{ id: "p1", name: "NoIG", access_token: "t" }] }),
      );

      const res = await igRequest("/api/instagram/callback?code=abc");
      expect(res.status).toBe(400);
    });
  });

  // ============================================
  // Accounts CRUD
  // ============================================
  describe("GET /api/instagram/accounts", () => {
    it("returns empty array when no account", async () => {
      vi.mocked(accountsQueries.getInstagramAccountByUserId).mockResolvedValueOnce(null);
      const res = await igRequest("/api/instagram/accounts");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.accounts).toEqual([]);
    });

    it("returns account WITHOUT pageAccessToken in response", async () => {
      vi.mocked(accountsQueries.getInstagramAccountByUserId).mockResolvedValueOnce({
        id: "acc-1",
        userId: "u1",
        igUserId: "ig-1",
        igUsername: "myig",
        fbPageId: "p1",
        fbPageName: "My Page",
        pageAccessToken: "ENCRYPTED_BLOB",
        tokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await igRequest("/api/instagram/accounts");
      const text = await res.text();
      expect(res.status).toBe(200);
      expect(text).not.toContain("pageAccessToken");
      expect(text).not.toContain("ENCRYPTED_BLOB");
    });
  });

  describe("DELETE /api/instagram/accounts/:id", () => {
    it("returns 404 when account not found", async () => {
      vi.mocked(accountsQueries.getInstagramAccountById).mockResolvedValueOnce(null);
      const res = await igRequest("/api/instagram/accounts/acc-999", { method: "DELETE" });
      expect(res.status).toBe(404);
    });

    it("returns 403 when not owned by user", async () => {
      vi.mocked(accountsQueries.getInstagramAccountById).mockResolvedValueOnce({
        id: "acc-1",
        userId: "different-user",
        igUserId: "ig-1",
        igUsername: null,
        fbPageId: "p1",
        fbPageName: null,
        pageAccessToken: "tok",
        tokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      const res = await igRequest("/api/instagram/accounts/acc-1", { method: "DELETE" });
      expect(res.status).toBe(403);
    });

    it("returns 200 on success", async () => {
      vi.mocked(accountsQueries.getInstagramAccountById).mockResolvedValueOnce({
        id: "acc-1",
        userId: "u1",
        igUserId: "ig-1",
        igUsername: null,
        fbPageId: "p1",
        fbPageName: null,
        pageAccessToken: "tok",
        tokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(accountsQueries.deleteInstagramAccount).mockResolvedValueOnce({} as any);
      const res = await igRequest("/api/instagram/accounts/acc-1", { method: "DELETE" });
      expect(res.status).toBe(200);
    });
  });

  // ============================================
  // Publish
  // ============================================
  describe("POST /api/instagram/publish", () => {
    it("returns 400 on invalid body (1 image for carousel)", async () => {
      const res = await igRequest("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "carousel",
          accountId: "acc-1",
          imageUrls: ["https://x/y.jpg"], // only 1, invalid
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 on caption too long", async () => {
      const res = await igRequest("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "single_image",
          accountId: "acc-1",
          imageUrl: "https://x/y.jpg",
          caption: "x".repeat(2201),
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 404 when account not found", async () => {
      vi.mocked(accountsQueries.getInstagramAccountById).mockResolvedValueOnce(null);
      const res = await igRequest("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "single_image",
          accountId: "acc-1",
          imageUrl: "https://x/y.jpg",
        }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 409 when concurrent publish in progress", async () => {
      vi.mocked(accountsQueries.getInstagramAccountById).mockResolvedValueOnce({
        id: "acc-1",
        userId: "u1",
        igUserId: "ig-1",
        igUsername: null,
        fbPageId: "p1",
        fbPageName: null,
        pageAccessToken: "token",
        tokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(logQueries.getProcessingPublishLogForAccount).mockResolvedValueOnce({
        id: "log-1",
        instagramAccountId: "acc-1",
        containerId: null,
        mediaId: null,
        status: "processing",
        errorCode: null,
        errorSubcode: null,
        errorMessage: null,
        mediaType: "single_image",
        imageUrl: null,
        caption: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await igRequest("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "single_image",
          accountId: "acc-1",
          imageUrl: "https://x/y.jpg",
        }),
      });
      expect(res.status).toBe(409);
    });

    it("returns 429 when quota exceeded", async () => {
      vi.mocked(accountsQueries.getInstagramAccountById).mockResolvedValueOnce({
        id: "acc-1",
        userId: "u1",
        igUserId: "ig-1",
        igUsername: null,
        fbPageId: "p1",
        fbPageName: null,
        pageAccessToken: "token",
        tokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(logQueries.getProcessingPublishLogForAccount).mockResolvedValueOnce(null);
      // quota fetch
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: [{ quota_usage: 25, publishing_limit: 25 }] }),
      );

      const res = await igRequest("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "single_image",
          accountId: "acc-1",
          imageUrl: "https://x/y.jpg",
        }),
      });
      expect(res.status).toBe(429);
    });

    it("returns 401 with TOKEN_EXPIRED when Meta returns code 190", async () => {
      vi.mocked(accountsQueries.getInstagramAccountById).mockResolvedValueOnce({
        id: "acc-1",
        userId: "u1",
        igUserId: "ig-1",
        igUsername: null,
        fbPageId: "p1",
        fbPageName: null,
        pageAccessToken: "token",
        tokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(logQueries.getProcessingPublishLogForAccount).mockResolvedValueOnce(null);
      // quota fetch succeeds
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: [{ quota_usage: 0, publishing_limit: 25 }] }),
      );
      // container create returns 190 error
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: 190, message: "Token expired", type: "OAuthException" } }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      );
      vi.mocked(logQueries.createPublishLog).mockResolvedValueOnce({} as any);
      vi.mocked(logQueries.getPublishLogsByAccountId).mockResolvedValueOnce([]);
      vi.mocked(logQueries.updatePublishLog).mockResolvedValueOnce({} as any);

      const res = await igRequest("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "single_image",
          accountId: "acc-1",
          imageUrl: "https://x/y.jpg",
        }),
      });
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe("TOKEN_EXPIRED");
    });

    it("returns 429 with Retry-After header when Meta returns 429", async () => {
      vi.mocked(accountsQueries.getInstagramAccountById).mockResolvedValueOnce({
        id: "acc-1",
        userId: "u1",
        igUserId: "ig-1",
        igUsername: null,
        fbPageId: "p1",
        fbPageName: null,
        pageAccessToken: "token",
        tokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(logQueries.getProcessingPublishLogForAccount).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: [{ quota_usage: 0, publishing_limit: 25 }] }),
      );
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: 4, error_subcode: "2207001", message: "rate limit" } }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        ),
      );
      vi.mocked(logQueries.createPublishLog).mockResolvedValueOnce({} as any);
      vi.mocked(logQueries.getPublishLogsByAccountId).mockResolvedValueOnce([]);
      vi.mocked(logQueries.updatePublishLog).mockResolvedValueOnce({} as any);

      const res = await igRequest("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: "single_image",
          accountId: "acc-1",
          imageUrl: "https://x/y.jpg",
        }),
      });
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("60");
    });
  });

  // ============================================
  // Publish log + Quota
  // ============================================
  describe("GET /api/instagram/publish-log", () => {
    it("returns items when account exists", async () => {
      vi.mocked(accountsQueries.getInstagramAccountByUserId).mockResolvedValueOnce({
        id: "acc-1",
        userId: "u1",
        igUserId: "ig-1",
        igUsername: null,
        fbPageId: "p1",
        fbPageName: null,
        pageAccessToken: "tok",
        tokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockGetPublishLogsByAccountId.mockResolvedValueOnce([
        {
          id: "log-1",
          instagramAccountId: "acc-1",
          status: "published",
          mediaType: "single_image",
        } as any,
      ]);
      const res = await igRequest("/api/instagram/publish-log");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items).toHaveLength(1);
    });

    it("returns empty items when no account", async () => {
      vi.mocked(accountsQueries.getInstagramAccountByUserId).mockResolvedValueOnce(null);
      const res = await igRequest("/api/instagram/publish-log");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items).toEqual([]);
    });
  });

  describe("GET /api/instagram/quota", () => {
    it("returns 404 when no account", async () => {
      vi.mocked(accountsQueries.getInstagramAccountByUserId).mockResolvedValueOnce(null);
      const res = await igRequest("/api/instagram/quota");
      expect(res.status).toBe(404);
    });

    it("returns quota info on success", async () => {
      vi.mocked(accountsQueries.getInstagramAccountByUserId).mockResolvedValueOnce({
        id: "acc-1",
        userId: "u1",
        igUserId: "ig-1",
        igUsername: null,
        fbPageId: "p1",
        fbPageName: null,
        pageAccessToken: "token",
        tokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ data: [{ quota_usage: 3, publishing_limit: 25 }] }),
      );
      const res = await igRequest("/api/instagram/quota");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.quotaUsage).toBe(3);
      expect(body.publishingLimit).toBe(25);
    });
  });

  // ============================================
  // Upload
  // ============================================
  describe("POST /api/instagram/upload", () => {
    it("returns 400 when no file field", async () => {
      const formData = new FormData();
      const res = await igRequest("/api/instagram/upload", {
        method: "POST",
        body: formData,
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for non-image content-type", async () => {
      const file = new File(["hello"], "test.txt", { type: "text/plain" });
      const formData = new FormData();
      formData.append("file", file);
      const res = await igRequest("/api/instagram/upload", {
        method: "POST",
        body: formData,
      });
      expect(res.status).toBe(400);
    });

    it("uploads valid JPEG to R2", async () => {
      // JPEG magic bytes: FF D8 FF E0 00 10
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const file = new File([jpegBytes], "test.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("file", file);
      const res = await igRequest("/api/instagram/upload", {
        method: "POST",
        body: formData,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.key).toContain("uploads/u1/");
      expect(body.publicUrl).toContain("test-bucket.r2.dev");
    });
  });
});
