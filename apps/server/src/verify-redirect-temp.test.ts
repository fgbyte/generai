// One-off test to verify the email verification redirect
// Run with: cd apps/server && bunx vitest run src/verify-redirect-redirect.test.ts
import { describe, expect, it, vi } from "vitest";

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
    VITE_SERVER_URL: "http://localhost:3000",
  },
}));

vi.mock("@generai/env/server", () => ({
  env: {
    CORS_ORIGIN: "http://localhost:3000",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  },
}));

// Test 1: Success case (200 from Better Auth)
vi.mock("@generai/auth", () => ({
  auth: {
    handler: vi.fn(() => new Response(JSON.stringify({ ok: true }), { status: 200 })),
  },
}));

import app from "./index";

describe("verify-email redirect (success case)", () => {
  it("redirects to /email-verified on 200 response from Better Auth", async () => {
    const response = await app.request("/api/auth/verify-email?token=any-token");

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("http://localhost:3000/email-verified");
  });

  it("redirects to /email-verification-error on 400 response from Better Auth", async () => {
    // Override the mock for this specific test
    const { auth } = await import("@generai/auth");
    vi.mocked(auth.handler).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "invalid token" }), { status: 400 }),
    );

    const response = await app.request("/api/auth/verify-email?token=invalid");

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost:3000/email-verification-error",
    );
  });

  it("redirects to /email-verification-error when no token provided", async () => {
    const { auth } = await import("@generai/auth");
    vi.mocked(auth.handler).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "missing token" }), { status: 400 }),
    );

    const response = await app.request("/api/auth/verify-email");

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost:3000/email-verification-error",
    );
  });

  it("does not affect other auth routes (e.g., sign-in)", async () => {
    const { auth } = await import("@generai/auth");
    vi.mocked(auth.handler).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "invalid credentials" }), { status: 401 }),
    );

    // The sign-in endpoint should NOT redirect — it should pass through to auth.handler
    const response = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", password: "test1234" }),
    });

    // Should be 401 (not 302) — the wildcard route passes through to auth.handler
    expect(response.status).not.toBe(302);
  });
});
