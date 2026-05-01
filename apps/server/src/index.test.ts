import { describe, expect, it, vi } from "vitest";

vi.mock("@generai/env/server", () => ({
  env: {
    CORS_ORIGIN: "http://localhost:3000",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  },
}));

vi.mock("@generai/auth", () => ({
  auth: {
    handler: vi.fn((request: Request) =>
      Response.json({ ok: true, path: new URL(request.url).pathname }),
    ),
  },
}));

import app from "./index";

describe("server app", () => {
  it("responds to the root health check", async () => {
    const response = await app.request("/");

    await expect(response.text()).resolves.toBe("OK");
    expect(response.status).toBe(200);
  });

  it("serves the test route", async () => {
    const response = await app.request("/api/test");

    await expect(response.json()).resolves.toEqual({ message: "test" });
    expect(response.status).toBe(200);
  });

  it("serves the people route", async () => {
    const response = await app.request("/api/people");

    await expect(response.json()).resolves.toEqual([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ]);
    expect(response.status).toBe(200);
  });
});
