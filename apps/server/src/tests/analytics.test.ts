import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "hono";
import type { HonoEnv } from "../middlewares/auth-middleware";

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
    ANALYTICS_ENABLED: true,
    NODE_ENV: "production",
  },
}));

// --- Env mock (before other imports) ---
vi.mock("@generai/env/server", () => ({
  env: {
    CORS_ORIGIN: "http://localhost:3000",
  },
}));

// --- Hoisted mocks ---

const mockInsertAnalyticsEvent = vi.hoisted(() => vi.fn());
const mockTrackEvent = vi.hoisted(() => vi.fn());
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

vi.mock("@generai/db/queries/analytics", () => ({
  insertAnalyticsEvent: mockInsertAnalyticsEvent,
}));

vi.mock("../lib/analytics", () => ({
  trackEvent: mockTrackEvent,
  trackError: vi.fn(),
}));

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
import { sanitizeProperties } from "../lib/analytics-types";

// Real trackEvent for the logger unit tests — bypasses the ../lib/analytics
// mock used by the route integration tests below.
const realAnalytics = await vi.importActual<typeof import("../lib/analytics")>("../lib/analytics");

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

function makeMockCtx(env: Record<string, unknown>) {
  const waitUntil = vi.fn();
  const ctx = {
    env,
    executionCtx: { waitUntil },
  } as unknown as Context<HonoEnv>;
  return { ctx, waitUntil };
}

// --- Tests ---

describe("analytics logger (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not write when ANALYTICS_ENABLED is false", () => {
    const { ctx, waitUntil } = makeMockCtx({ ANALYTICS_ENABLED: false });

    realAnalytics.trackEvent(ctx, "generate.success", { userId: "user_123" });

    expect(mockInsertAnalyticsEvent).not.toHaveBeenCalled();
    expect(waitUntil).not.toHaveBeenCalled();
  });

  it("does not write when ANALYTICS_ENABLED is the string 'false'", () => {
    const { ctx } = makeMockCtx({ ANALYTICS_ENABLED: "false" });

    realAnalytics.trackEvent(ctx, "generate.success", { userId: "user_123" });

    expect(mockInsertAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("does not write when the stage is not production", () => {
    const { ctx } = makeMockCtx({ ANALYTICS_ENABLED: true, NODE_ENV: "development" });

    realAnalytics.trackEvent(ctx, "generate.success", { userId: "user_123" });

    expect(mockInsertAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("writes fire-and-forget via waitUntil in production", () => {
    mockInsertAnalyticsEvent.mockResolvedValue({ id: "evt_1" });
    const { ctx, waitUntil } = makeMockCtx({
      ANALYTICS_ENABLED: true,
      NODE_ENV: "production",
    });

    realAnalytics.trackEvent(ctx, "generate.success", {
      userId: "user_123",
      contentType: "thread",
      creditsUsed: 5,
      captionCount: 2,
    });

    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(mockInsertAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_123", event: "generate.success" }),
    );
    // Fire-and-forget: waitUntil receives a Promise, the call is not awaited.
    expect(waitUntil.mock.calls[0]?.[0]).toBeInstanceOf(Promise);
  });

  it("never throws when the DB write fails", () => {
    mockInsertAnalyticsEvent.mockRejectedValueOnce(new Error("db down"));
    const { ctx } = makeMockCtx({ ANALYTICS_ENABLED: true, NODE_ENV: "production" });

    expect(() => realAnalytics.trackEvent(ctx, "generate.success", { userId: "u1" })).not.toThrow();
  });

  it("sanitizes PII and non-allowlisted properties", () => {
    const result = sanitizeProperties("generate.success", {
      userId: "u1",
      prompt: "leak",
      content: "leak",
      email: "leak",
      imageBase64: "leak",
      contentType: "thread",
      creditsUsed: 5,
    });

    expect(Object.keys(result)).not.toContain("prompt");
    expect(Object.keys(result)).not.toContain("content");
    expect(Object.keys(result)).not.toContain("email");
    expect(Object.keys(result)).not.toContain("imageBase64");
    expect(Object.keys(result)).toContain("userId");
    expect(Object.keys(result)).toContain("contentType");
    expect(Object.keys(result)).toContain("creditsUsed");
  });
});

describe("generate routes analytics (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated
    mockGetSession.mockResolvedValue({
      user: MOCK_USER,
      session: MOCK_SESSION,
    });
  });

  it("fires generate.rejected when points are insufficient", async () => {
    mockApplyLazyResetIfDue.mockResolvedValue({
      applied: false,
      points: 3,
      lastResetAt: new Date(),
      nextResetAt: new Date(),
    });
    mockGetUserPointsWithResetInfo.mockResolvedValue({
      points: 3,
      lastResetAt: new Date(),
      nextResetAt: new Date(),
      isDue: false,
      effectivePoints: 3,
    });

    const res = await makeRequest("POST", "/api/generate", {
      contentType: "thread",
      prompt: "hello",
    });

    expect(res.status).toBe(400);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.anything(),
      "generate.rejected",
      expect.objectContaining({
        userId: "user_123",
        reason: "insufficient_points",
        creditsAvailable: 3,
      }),
    );
  });

  it("fires generate.success with sanitized properties", async () => {
    mockApplyLazyResetIfDue.mockResolvedValue({
      applied: false,
      points: 50,
      lastResetAt: new Date(),
      nextResetAt: new Date(),
    });
    mockGetUserPointsWithResetInfo.mockResolvedValue({
      points: 50,
      lastResetAt: new Date(),
      nextResetAt: new Date(),
      isDue: false,
      effectivePoints: 50,
    });
    mockGenerateContent.mockResolvedValue({
      content: ["caption one", "caption two"],
      contentType: "thread",
    });
    mockUpdateUserPoints.mockResolvedValue(1);
    mockSaveGeneratedContent.mockResolvedValue({ id: "gen_1" });

    const res = await makeRequest("POST", "/api/generate", {
      contentType: "thread",
      prompt: "hello",
    });

    expect(res.status).toBe(200);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.anything(),
      "generate.success",
      expect.objectContaining({
        userId: "user_123",
        contentType: "thread",
        creditsUsed: 5,
        captionCount: 2,
      }),
    );

    // PII must never reach the event payload.
    const successCall = mockTrackEvent.mock.calls.find(([, name]) => name === "generate.success");
    expect(successCall).toBeDefined();
    const props = successCall?.[2] as Record<string, unknown>;
    expect(props).not.toHaveProperty("prompt");
    expect(props).not.toHaveProperty("content");
    expect(props).not.toHaveProperty("email");
    expect(props).not.toHaveProperty("imageBase64");
  });

  it("fires credits.reset when a lazy reset is applied", async () => {
    mockApplyLazyResetIfDue.mockResolvedValue({
      applied: true,
      points: 50,
      lastResetAt: new Date(),
      nextResetAt: new Date(),
    });
    mockGetUserPointsWithResetInfo.mockResolvedValue({
      points: 3,
      lastResetAt: new Date(),
      nextResetAt: new Date(),
      isDue: false,
      effectivePoints: 3,
    });
    mockGenerateContent.mockResolvedValue({
      content: ["caption one"],
      contentType: "thread",
    });
    mockUpdateUserPoints.mockResolvedValue(1);
    mockSaveGeneratedContent.mockResolvedValue({ id: "gen_1" });

    const res = await makeRequest("POST", "/api/generate", {
      contentType: "thread",
      prompt: "hello",
    });

    expect(res.status).toBe(200);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.anything(),
      "credits.reset",
      expect.objectContaining({
        userId: "user_123",
        previousPoints: 3,
        newPoints: 50,
      }),
    );
  });
});
