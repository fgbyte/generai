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

const mockGetSession = vi.hoisted(() => vi.fn());
const mockSendFeedbackNotification = vi.hoisted(() => vi.fn());

// --- Module mocks ---

vi.mock("@generai/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock("../lib/telegram", () => ({
  sendFeedbackNotification: mockSendFeedbackNotification,
}));

// --- Import after mocks ---

import { feedbackRoutes } from "../routes/feedback.routes";

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
  return feedbackRoutes.request(path, init);
}

// --- Tests ---

describe("feedback routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated
    mockGetSession.mockResolvedValue({
      user: MOCK_USER,
      session: MOCK_SESSION,
    });
  });

  describe("POST /api/feedback", () => {
    it("sends feedback successfully", async () => {
      const res = await makeRequest("POST", "/api/feedback", {
        content: "Great app!",
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ success: true });
      expect(mockSendFeedbackNotification).toHaveBeenCalledWith("user_123", "Great app!");
    });

    it("returns 400 when content is empty", async () => {
      const res = await makeRequest("POST", "/api/feedback", {
        content: "",
      });

      expect(res.status).toBe(400);
      expect(mockSendFeedbackNotification).not.toHaveBeenCalled();
    });

    it("returns 400 when content exceeds 2000 characters", async () => {
      const res = await makeRequest("POST", "/api/feedback", {
        content: "a".repeat(2001),
      });

      expect(res.status).toBe(400);
      expect(mockSendFeedbackNotification).not.toHaveBeenCalled();
    });

    it("returns 400 for malformed JSON body", async () => {
      const res = await feedbackRoutes.request("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: '{"content":"broken"',
      });

      expect(res.status).toBe(400);
      expect(mockSendFeedbackNotification).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
      mockGetSession.mockResolvedValue(null);

      const res = await makeRequest("POST", "/api/feedback", {
        content: "test",
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
      expect(mockSendFeedbackNotification).not.toHaveBeenCalled();
    });

    it("returns 500 when telegram service throws", async () => {
      mockSendFeedbackNotification.mockRejectedValue(new Error("Telegram error"));

      const res = await makeRequest("POST", "/api/feedback", {
        content: "test feedback",
      });

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json).toEqual({ error: "Failed to send feedback" });
      expect(mockSendFeedbackNotification).toHaveBeenCalledWith("user_123", "test feedback");
    });
  });
});
