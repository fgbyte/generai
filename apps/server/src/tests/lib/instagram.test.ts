import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.hoisted(() => vi.fn());

// Set env var BEFORE importing the lib
process.env.META_TOKEN_ENCRYPTION_KEY = "9J1NIW0/oTJVOUxEEyA9nS8dvVLGVCunAS4ufjlMLXQ=";

import {
  IG_API_VERSION,
  IG_GRAPH_API,
  InstagramApiError,
  getOAuthUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getUserPages,
  createSingleImageContainer,
  createCarouselChildContainer,
  createCarouselParentContainer,
  getContainerStatus,
  pollContainerStatus,
  publishContainer,
  getContentPublishingLimit,
} from "../../lib/instagram";
import { encryptToken, decryptToken } from "../../lib/crypto";
import {
  sanitizeMetaError,
  isRateLimitError,
  isTokenExpiredError,
} from "../../lib/instagram-errors";

const config = {
  appId: "test-app-id",
  appSecret: "test-app-secret",
  redirectUri: "http://localhost:3000/callback",
};

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("constants", () => {
  it("exports IG_API_VERSION v25.0", () => {
    expect(IG_API_VERSION).toBe("v25.0");
  });
  it("exports IG_GRAPH_API with v25.0", () => {
    expect(IG_GRAPH_API).toBe("https://graph.facebook.com/v25.0");
  });
});

describe("getOAuthUrl", () => {
  it("uses correct instagram_business_* scopes", () => {
    const url = getOAuthUrl(config);
    expect(url).toContain("instagram_business_basic");
    expect(url).toContain("instagram_business_content_publish");
    expect(url).toContain("pages_show_list");
    expect(url).toContain("business_management");
    expect(url).toContain("client_id=test-app-id");
    expect(url).toContain("redirect_uri=");
    expect(url.startsWith("https://www.facebook.com/v25.0/dialog/oauth?")).toBe(true);
  });
});

describe("exchangeCodeForToken", () => {
  it("POSTs to oauth/access_token and returns access_token", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ access_token: "abc123", expires_in: 3600 }),
    );
    const result = await exchangeCodeForToken("auth-code", config);
    expect(result.accessToken).toBe("abc123");
    expect(result.expiresIn).toBe(3600);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("exchangeForLongLivedToken", () => {
  it("sends grant_type=fb_exchange_token", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ access_token: "long-abc", expires_in: 5184000 }),
    );
    const result = await exchangeForLongLivedToken("short-token", config);
    expect(result.accessToken).toBe("long-abc");
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain("grant_type=fb_exchange_token");
  });
});

describe("getUserPages", () => {
  it("extracts igUsername from instagram_business_account (the bug fix)", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        data: [
          {
            id: "page-1",
            name: "My Page",
            access_token: "page-tok",
            instagram_business_account: {
              id: "ig-123",
              username: "myiguser",
            },
          },
        ],
      }),
    );
    const pages = await getUserPages("user-tok");
    expect(pages).toHaveLength(1);
    expect(pages[0]?.id).toBe("page-1");
    expect(pages[0]?.igBusinessAccountId).toBe("ig-123");
    expect(pages[0]?.igUsername).toBe("myiguser");
  });

  it("handles page with no IG account", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({
        data: [
          { id: "page-1", name: "No IG", access_token: "tok" },
        ],
      }),
    );
    const pages = await getUserPages("user-tok");
    expect(pages[0]?.igBusinessAccountId).toBeNull();
    expect(pages[0]?.igUsername).toBeNull();
  });
});

describe("createSingleImageContainer", () => {
  it("POSTs to /media and returns creation id", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ id: "container-1" }));
    const id = await createSingleImageContainer("ig-user", "https://x/y.jpg", "tok", "hi");
    expect(id).toBe("container-1");
  });
});

describe("createCarouselChildContainer", () => {
  it("includes is_carousel_item: 'true'", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ id: "child-1" }));
    const id = await createCarouselChildContainer("ig-user", "https://x/y.jpg", "tok");
    expect(id).toBe("child-1");
    const body = JSON.parse(
      (mockFetch.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(body.is_carousel_item).toBe("true");
  });
});

describe("createCarouselParentContainer", () => {
  it("includes media_type: 'CAROUSEL' and comma-joined children", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ id: "parent-1" }));
    const id = await createCarouselParentContainer("ig-user", ["c1", "c2"], "tok", "cap");
    expect(id).toBe("parent-1");
    const body = JSON.parse(
      (mockFetch.mock.calls[0]?.[1] as RequestInit).body as string,
    );
    expect(body.media_type).toBe("CAROUSEL");
    expect(body.children).toBe("c1,c2");
  });
});

describe("getContainerStatus", () => {
  it("parses status_code and status", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ status_code: "FINISHED", status: "ok" }),
    );
    const s = await getContainerStatus("c1", "tok");
    expect(s.statusCode).toBe("FINISHED");
    expect(s.statusMessage).toBe("ok");
  });
});

describe("pollContainerStatus", () => {
  it("returns FINISHED when status_code becomes FINISHED", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ status_code: "FINISHED" }),
    );
    const r = await pollContainerStatus("c1", "tok", 3, 1);
    expect(r.status).toBe("FINISHED");
  });

  it("returns ERROR on ERROR status", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ status_code: "ERROR", status: "bad" }),
    );
    const r = await pollContainerStatus("c1", "tok", 3, 1);
    expect(r.status).toBe("ERROR");
  });

  it("respects maxAttempts", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(mockJsonResponse({ status_code: "IN_PROGRESS" })),
    );
    const r = await pollContainerStatus("c1", "tok", 2, 1);
    expect(r.status).toBe("TIMEOUT");
  });
});

describe("publishContainer", () => {
  it("POSTs to /media_publish and returns id", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ id: "media-1" }));
    const id = await publishContainer("ig-user", "creation-1", "tok");
    expect(id).toBe("media-1");
  });
});

describe("getContentPublishingLimit", () => {
  it("returns quotaUsage and publishingLimit", async () => {
    mockFetch.mockResolvedValueOnce(
      mockJsonResponse({ data: [{ quota_usage: 5, publishing_limit: 25 }] }),
    );
    const q = await getContentPublishingLimit("ig-user", "tok");
    expect(q.quotaUsage).toBe(5);
    expect(q.publishingLimit).toBe(25);
  });

  it("returns defaults when no data", async () => {
    mockFetch.mockResolvedValueOnce(mockJsonResponse({ data: [] }));
    const q = await getContentPublishingLimit("ig-user", "tok");
    expect(q.quotaUsage).toBe(0);
    expect(q.publishingLimit).toBe(25);
  });

  it("returns defaults on error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network"));
    const q = await getContentPublishingLimit("ig-user", "tok");
    expect(q.quotaUsage).toBe(0);
    expect(q.publishingLimit).toBe(25);
  });
});

describe("encryption roundtrip", () => {
  it("encrypts and decrypts the same value", async () => {
    const ciphertext = await encryptToken("hello world");
    const plaintext = await decryptToken(ciphertext);
    expect(plaintext).toBe("hello world");
  });

  it("produces different ciphertext each time (IV uniqueness)", async () => {
    const a = await encryptToken("same");
    const b = await encryptToken("same");
    expect(a).not.toBe(b);
  });
});

describe("InstagramApiError", () => {
  it("captures code, subcode, status", () => {
    const e = new InstagramApiError("boom", 190, undefined, undefined, 401);
    expect(e.code).toBe(190);
    expect(e.status).toBe(401);
    expect(e.message).toBe("boom");
    expect(e.name).toBe("InstagramApiError");
  });
});

describe("sanitizeMetaError", () => {
  it("maps code 190 to 401 with TOKEN_EXPIRED", () => {
    const err = new InstagramApiError("expired", 190, undefined, undefined, 401);
    const r = sanitizeMetaError(err);
    expect(r.status).toBe(401);
    expect(r.body.code).toBe("TOKEN_EXPIRED");
  });

  it("maps subcode 2207001 to 429 with retryAfterSeconds", () => {
    const err = new InstagramApiError("rate", 4, "2207001", undefined, 429);
    const r = sanitizeMetaError(err);
    expect(r.status).toBe(429);
    expect(r.body.retryAfterSeconds).toBe(60);
  });

  it("maps subcode 9004 to 503", () => {
    const err = new InstagramApiError("not ready", 4, "9004", undefined, 400);
    const r = sanitizeMetaError(err);
    expect(r.status).toBe(503);
  });

  it("maps other 4xx to 400", () => {
    const err = new InstagramApiError("bad", 100, undefined, undefined, 400);
    const r = sanitizeMetaError(err);
    expect(r.status).toBe(400);
  });

  it("maps 5xx to 502", () => {
    const err = new InstagramApiError("oops", undefined, undefined, undefined, 500);
    const r = sanitizeMetaError(err);
    expect(r.status).toBe(502);
  });

  it("returns 500 for unknown errors", () => {
    const r = sanitizeMetaError(new Error("x"));
    expect(r.status).toBe(500);
  });
});

describe("isRateLimitError and isTokenExpiredError", () => {
  it("isRateLimitError returns true for 429", () => {
    const err = new InstagramApiError("rl", undefined, undefined, undefined, 429);
    expect(isRateLimitError(err)).toBe(true);
  });

  it("isRateLimitError returns true for subcode 2207001", () => {
    const err = new InstagramApiError("rl", 4, "2207001", undefined, 400);
    expect(isRateLimitError(err)).toBe(true);
  });

  it("isTokenExpiredError returns true for code 190", () => {
    const err = new InstagramApiError("exp", 190, undefined, undefined, 401);
    expect(isTokenExpiredError(err)).toBe(true);
  });

  it("isRateLimitError returns false for non-rate-limit errors", () => {
    const err = new InstagramApiError("x", 100, undefined, undefined, 400);
    expect(isRateLimitError(err)).toBe(false);
  });
});
