import { beforeEach, describe, expect, it, vi } from "vitest";

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
    NVIDIA_API_KEY: "test-nvidia-key",
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

const mockGetUserPoints = vi.hoisted(() => vi.fn());
const mockUpdateUserPoints = vi.hoisted(() => vi.fn());
const mockSaveGeneratedContent = vi.hoisted(() => vi.fn());
const mockGetGeneratedContentHistory = vi.hoisted(() => vi.fn());
const mockDeleteGeneratedContent = vi.hoisted(() => vi.fn());
const mockGetGeneratedContentById = vi.hoisted(() => vi.fn());
const mockGenerateContent = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());

// --- Module mocks ---

vi.mock("@generai/db/queries/users", () => ({
  getUserPoints: mockGetUserPoints,
  updateUserPoints: mockUpdateUserPoints,
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

// --- Tests ---

describe("generate routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated
    mockGetSession.mockResolvedValue({
      user: MOCK_USER,
      session: MOCK_SESSION,
    });
  });

  // ---- POST /api/generate ----

  describe("POST /api/generate", () => {
    it("generates content successfully when user has enough points", async () => {
      mockGetUserPoints.mockResolvedValue(10);
      mockGenerateContent.mockResolvedValue({
        content: ["tweet 1", "tweet 2"],
        contentType: "thread",
      });
      mockUpdateUserPoints.mockResolvedValue({ id: "user_123", points: 5 });
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

      expect(mockGetUserPoints).toHaveBeenCalledWith("user_123");
      expect(mockGenerateContent).toHaveBeenCalledWith("thread", "write a thread", undefined);
      expect(mockUpdateUserPoints).toHaveBeenCalledWith("user_123", -5);
      expect(mockSaveGeneratedContent).toHaveBeenCalledWith(
        "user_123",
        "tweet 1\n\ntweet 2",
        "write a thread",
        "thread",
      );
    });

    it("returns 400 when user has insufficient points", async () => {
      mockGetUserPoints.mockResolvedValue(3);

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
      mockGetUserPoints.mockResolvedValue(10);
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
    it("returns user points balance", async () => {
      mockGetUserPoints.mockResolvedValue(42);

      const res = await makeRequest("GET", "/api/generate/points");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.points).toBe(42);
      expect(mockGetUserPoints).toHaveBeenCalledWith("user_123");
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await makeRequest("GET", "/api/generate/points");

      expect(res.status).toBe(401);
    });
  });

  // ---- DELETE /api/generate/history/:id ----

  describe("DELETE /api/generate/history/:id", () => {
    it("deletes content when user is the owner", async () => {
      mockGetGeneratedContentById.mockResolvedValue({ id: "gc_123", userId: "user_123" });
      mockDeleteGeneratedContent.mockResolvedValue({ id: "gc_123" });

      const res = await makeRequest("DELETE", "/api/generate/history/gc_123");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(mockDeleteGeneratedContent).toHaveBeenCalledWith("gc_123");
    });

    it("returns 403 when user is not the owner", async () => {
      mockGetGeneratedContentById.mockResolvedValue({ id: "gc_123", userId: "user_other" });

      const res = await makeRequest("DELETE", "/api/generate/history/gc_123");

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Forbidden");
      expect(mockDeleteGeneratedContent).not.toHaveBeenCalled();
    });

    it("returns 404 when content is not found", async () => {
      mockGetGeneratedContentById.mockResolvedValue(null);

      const res = await makeRequest("DELETE", "/api/generate/history/gc_nonexistent");

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Not found");
      expect(mockDeleteGeneratedContent).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await makeRequest("DELETE", "/api/generate/history/gc_123");

      expect(res.status).toBe(401);
    });
  });
});
