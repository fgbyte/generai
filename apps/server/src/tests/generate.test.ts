import { beforeEach, describe, expect, it, vi } from "vitest";
import { creditsConfig, creditsConfigSchema } from "@generai/config";

// --- Cloudflare workers mock (before other imports) ---
vi.mock("cloudflare:workers", () => ({
  env: {
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    CORS_ORIGIN: "http://localhost:3000",
    BETTER_AUTH_SECRET: "test-secret",
    BETTER_AUTH_URL: "http://localhost:3000",
    POSTMARK_SERVER_TOKEN: "test-token",
    POSTMARK_FROM_EMAIL: "test@test.com",
    GEMINI_API_KEY: "test-api-key",
    AI_PROVIDER_API_KEY: "test-nvidia-key",
    AI_PROVIDER_BASE_URL: "https://integrate.api.nvidia.com/v1",
    AI_TEXT_MODEL: "google/gemma-3n-e4b-it",
    AI_VISION_MODEL: "google/gemma-3n-e4b-it",
    TELEGRAM_BOT_TOKEN: "test-bot-token",
    TELEGRAM_CHAT_ID: "test-chat-id",
    VITE_SERVER_URL: "http://localhost:3000",
  },
}));

// --- Env mock (before other imports) ---
vi.mock("@generai/env/server", () => ({
  env: {
    CORS_ORIGIN: "http://localhost:3000",
  },
}));

// --- Hoisted mocks ---

const mockGetUserPointsWithResetInfo = vi.hoisted(() => vi.fn());
const mockUpdateUserPoints = vi.hoisted(() => vi.fn());
const mockApplyLazyResetIfDue = vi.hoisted(() => vi.fn());
const mockSaveGeneratedContent = vi.hoisted(() => vi.fn());
const mockGetGeneratedContentHistory = vi.hoisted(() => vi.fn());
const mockDeleteGeneratedContent = vi.hoisted(() => vi.fn());
const mockGetGeneratedContentById = vi.hoisted(() => vi.fn());
const mockGenerateContent = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());

// --- Module mocks ---

vi.mock("@generai/db/queries/users", () => ({
  getUserPointsWithResetInfo: mockGetUserPointsWithResetInfo,
  updateUserPoints: mockUpdateUserPoints,
}));

vi.mock("../lib/credit-reset", () => ({
  applyLazyResetIfDue: mockApplyLazyResetIfDue,
}));

vi.mock("@generai/db/queries/generated-content", () => ({
  saveGeneratedContent: mockSaveGeneratedContent,
  getGeneratedContentHistory: mockGetGeneratedContentHistory,
  deleteGeneratedContent: mockDeleteGeneratedContent,
  getGeneratedContentById: mockGetGeneratedContentById,
}));

vi.mock("../lib/langchain", () => ({
  generateContent: mockGenerateContent,
}));

vi.mock("@generai/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

// --- Import after mocks ---

import { generateRoutes } from "../routes/generate.routes";

// --- Helpers ---

const MOCK_USER = { id: "user_123", name: "Test User", email: "test@test.com" };
const MOCK_SESSION = { id: "sess_123", userId: "user_123" };

function makeRequest(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
) {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return generateRoutes.request(path, init);
}

function defaultResetResult(overrides?: Partial<{ applied: boolean; points: number }>) {
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 86_400_000);
  return {
    applied: overrides?.applied ?? false,
    points: overrides?.points ?? 50,
    lastResetAt: now,
    nextResetAt: nextMonth,
  };
}

function resetInfoFixture(overrides?: Partial<{ points: number; isDue: boolean; effectivePoints: number }>) {
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 86_400_000);
  return {
    points: overrides?.points ?? 42,
    lastResetAt: now,
    nextResetAt: nextMonth,
    isDue: overrides?.isDue ?? false,
    effectivePoints: overrides?.effectivePoints ?? overrides?.points ?? 42,
  };
}

// --- Tests ---

describe("generate routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated
    mockGetSession.mockResolvedValue({
      user: MOCK_USER,
      session: MOCK_SESSION,
    });
    // Default: reset not due, 50 points available
    mockApplyLazyResetIfDue.mockResolvedValue(defaultResetResult());
    // Default: getUserPointsWithResetInfo returns 42 points, not due
    mockGetUserPointsWithResetInfo.mockResolvedValue(resetInfoFixture());
  });

  // ---- POST /api/generate ----

  describe("POST /api/generate", () => {
    it("generates content successfully when user has enough points", async () => {
      mockApplyLazyResetIfDue.mockResolvedValue(defaultResetResult({ points: 10 }));
      mockGenerateContent.mockResolvedValue({
        content: ["tweet 1", "tweet 2"],
        contentType: "thread",
      });
      mockUpdateUserPoints.mockResolvedValue(1); // 1 affected row
      mockSaveGeneratedContent.mockResolvedValue({
        id: "gc_123",
        userId: "user_123",
        content: "tweet 1\n\ntweet 2",
        prompt: "write a thread",
        contentType: "thread",
      });

      const res = await makeRequest("POST", "/api/generate", {
        contentType: "thread",
        prompt: "write a thread",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({
        content: ["tweet 1", "tweet 2"],
        contentType: "thread",
        id: "gc_123",
      });

      expect(mockApplyLazyResetIfDue).toHaveBeenCalledWith("user_123");
      expect(mockGenerateContent).toHaveBeenCalledWith("thread", "write a thread", undefined);
      expect(mockUpdateUserPoints).toHaveBeenCalledWith("user_123", -creditsConfig.costPerGeneration);
      expect(mockSaveGeneratedContent).toHaveBeenCalledWith(
        "user_123",
        "tweet 1\n\ntweet 2",
        "write a thread",
        "thread",
      );
    });

    it("returns 400 when user has insufficient points", async () => {
      mockApplyLazyResetIfDue.mockResolvedValue(defaultResetResult({ points: 3 }));

      const res = await makeRequest("POST", "/api/generate", {
        contentType: "thread",
        prompt: "write a thread",
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Insufficient points");
      expect(mockGenerateContent).not.toHaveBeenCalled();
      expect(mockUpdateUserPoints).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await makeRequest("POST", "/api/generate", {
        contentType: "thread",
        prompt: "write a thread",
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 400 for invalid request body", async () => {
      const res = await makeRequest("POST", "/api/generate", {
        contentType: "invalid_type",
        prompt: "test",
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid request body");
    });

    it("returns 400 'Image too large' when imageBase64 exceeds 5MB", async () => {
      const largeImage = "A".repeat(5 * 1024 * 1024 + 1);

      const res = await makeRequest("POST", "/api/generate", {
        contentType: "instagram",
        prompt: "write a caption",
        imageBase64: largeImage,
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Image too large");
      expect(mockGenerateContent).not.toHaveBeenCalled();
      expect(mockApplyLazyResetIfDue).not.toHaveBeenCalled();
    });

    it("returns 400 for malformed json body", async () => {
      const res = await generateRoutes.request("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: '{"contentType":"thread","prompt":"broken"',
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid request body");
    });

    it("returns 500 when generateContent throws", async () => {
      mockApplyLazyResetIfDue.mockResolvedValue(defaultResetResult({ points: 10 }));
      mockGenerateContent.mockRejectedValue(new Error("Gemini API error"));

      const res = await makeRequest("POST", "/api/generate", {
        contentType: "linkedin",
        prompt: "write a post",
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Failed to generate content");
      expect(mockUpdateUserPoints).not.toHaveBeenCalled();
    });

    it("due user gets reset before generate", async () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 86_400_000);
      const nextMonth = new Date(Date.now() + 30 * 86_400_000);
      mockApplyLazyResetIfDue.mockResolvedValue({
        applied: true,
        points: creditsConfig.resetAmount,
        lastResetAt: fortyDaysAgo,
        nextResetAt: nextMonth,
      });
      mockGenerateContent.mockResolvedValue({
        content: ["caption 1"],
        contentType: "instagram",
      });
      mockUpdateUserPoints.mockResolvedValue(1);
      mockSaveGeneratedContent.mockResolvedValue({
        id: "gc_456",
        userId: "user_123",
        content: "caption 1",
        prompt: "write a caption",
        contentType: "instagram",
      });

      const res = await makeRequest("POST", "/api/generate", {
        contentType: "instagram",
        prompt: "write a caption",
      });

      expect(res.status).toBe(200);
      expect(mockApplyLazyResetIfDue).toHaveBeenCalledWith("user_123");
      expect(mockUpdateUserPoints).toHaveBeenCalledWith("user_123", -creditsConfig.costPerGeneration);
    });

    it("concurrent due-user POSTs do not race", async () => {
      mockApplyLazyResetIfDue.mockResolvedValue(defaultResetResult({ points: creditsConfig.resetAmount }));
      mockGenerateContent.mockResolvedValue({
        content: ["post"],
        contentType: "thread",
      });
      mockUpdateUserPoints.mockResolvedValue(1);
      mockSaveGeneratedContent.mockResolvedValue({
        id: "gc_race",
        userId: "user_123",
        content: "post",
        prompt: "test",
        contentType: "thread",
      });

      const body = { contentType: "thread", prompt: "test" };
      const [res1, res2] = await Promise.all([
        makeRequest("POST", "/api/generate", body),
        makeRequest("POST", "/api/generate", body),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(mockUpdateUserPoints).toHaveBeenCalledTimes(2);
      expect(mockUpdateUserPoints).toHaveBeenCalledWith("user_123", -creditsConfig.costPerGeneration);
    });

    it("failed AI call after reset does not deduct", async () => {
      mockApplyLazyResetIfDue.mockResolvedValue({
        applied: true,
        points: creditsConfig.resetAmount,
        lastResetAt: new Date(Date.now() - 40 * 86_400_000),
        nextResetAt: new Date(Date.now() + 30 * 86_400_000),
      });
      mockGenerateContent.mockRejectedValue(new Error("AI provider down"));

      const res = await makeRequest("POST", "/api/generate", {
        contentType: "thread",
        prompt: "write something",
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Failed to generate content");
      // Reset was applied but AI failed — no deduction
      expect(mockUpdateUserPoints).not.toHaveBeenCalled();
    });

    it("config change proves reset amount is configurable (not hardcoded)", () => {
      const customConfig = creditsConfigSchema.parse({
        resetAmount: 100,
        costPerGeneration: 10,
        resetInterval: "month",
      });

      expect(customConfig.resetAmount).toBe(100);
      expect(customConfig.costPerGeneration).toBe(10);

      // Default config has different values
      expect(creditsConfig.resetAmount).toBe(50);
      expect(creditsConfig.costPerGeneration).toBe(5);

      // Changing the value is a code-only change (parse produces different result)
      const override = creditsConfigSchema.parse({ resetAmount: 200 });
      expect(override.resetAmount).toBe(200);
    });
  });

  // ---- GET /api/generate/history ----

  describe("GET /api/generate/history", () => {
    it("returns user history", async () => {
      const historyItems = [
        {
          id: "gc_1",
          content: "first",
          prompt: "prompt 1",
          contentType: "thread",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "gc_2",
          content: "second",
          prompt: "prompt 2",
          contentType: "linkedin",
          createdAt: "2026-01-02T00:00:00.000Z",
        },
      ];
      mockGetGeneratedContentHistory.mockResolvedValue(historyItems);

      const res = await makeRequest("GET", "/api/generate/history");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.items).toEqual(historyItems);
      expect(mockGetGeneratedContentHistory).toHaveBeenCalledWith("user_123");
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await makeRequest("GET", "/api/generate/history");

      expect(res.status).toBe(401);
    });
  });

  // ---- GET /api/generate/points ----

  describe("GET /api/generate/points", () => {
    it("returns user points with reset info", async () => {
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 86_400_000);
      mockGetUserPointsWithResetInfo.mockResolvedValue({
        points: 42,
        lastResetAt: now,
        nextResetAt: nextMonth,
        isDue: false,
        effectivePoints: 42,
      });

      const res = await makeRequest("GET", "/api/generate/points");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.points).toBe(42);
      expect(json.rawPoints).toBe(42);
      expect(json.isDue).toBe(false);
      expect(typeof json.nextResetAt).toBe("string");
      expect(json.resetAmount).toBe(creditsConfig.resetAmount);
      expect(json.resetInterval).toBe(creditsConfig.resetInterval);
      expect(json.costPerGeneration).toBe(creditsConfig.costPerGeneration);
      expect(mockGetUserPointsWithResetInfo).toHaveBeenCalledWith("user_123");
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await makeRequest("GET", "/api/generate/points");

      expect(res.status).toBe(401);
    });
  });

  // ---- DELETE /api/generate/history/ ----
  describe("DELETE /api/generate/history/", () => {
    it("deletes content when user is the owner", async () => {
      mockGetGeneratedContentById.mockResolvedValue({
        id: "gc_123",
        userId: "user_123",
      });
      mockDeleteGeneratedContent.mockResolvedValue({ id: "gc_123" });

      const res = await makeRequest("DELETE", "/api/generate/history?id=gc_123");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(mockDeleteGeneratedContent).toHaveBeenCalledWith("gc_123");
    });

    it("returns 403 when user is not the owner", async () => {
      mockGetGeneratedContentById.mockResolvedValue({
        id: "gc_123",
        userId: "user_other",
      });

      const res = await makeRequest("DELETE", "/api/generate/history?id=gc_123");
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(mockDeleteGeneratedContent).not.toHaveBeenCalled();
    });

    it("returns 404 when content is not found", async () => {
      mockGetGeneratedContentById.mockResolvedValue(null);

      const res = await makeRequest("DELETE", "/api/generate/history?id=gc_nonexistent");
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(mockDeleteGeneratedContent).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await makeRequest("DELETE", "/api/generate/history?id=gc_123");
      expect(res.status).toBe(401);
    });
  });
});
