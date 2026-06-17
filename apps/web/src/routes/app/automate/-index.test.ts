import { describe, expect, it } from "vitest";

import { contentTypeToPlatformId } from "./index";

describe("contentTypeToPlatformId", () => {
  it("maps 'instagram' to the dedicated 'instagram' platform tab", () => {
    expect(contentTypeToPlatformId("instagram")).toBe("instagram");
  });

  it("maps 'thread' to the Twitter placeholder (text-based mock)", () => {
    expect(contentTypeToPlatformId("thread")).toBe("twitter");
  });

  it("maps 'linkedin' to the Twitter placeholder (no LinkedIn mock yet)", () => {
    expect(contentTypeToPlatformId("linkedin")).toBe("twitter");
  });

  it("covers every ContentTypeUnion value (exhaustive switch)", () => {
    // If a new ContentTypeUnion is added, the switch in the function will
    // fail to compile (no fallthrough, no default). This test documents
    // the contract: every member of the union has a platform mapping.
    const cases: Array<
      ["instagram" | "thread" | "linkedin", "instagram" | "twitter" | "dribbble" | "pinterest"]
    > = [
      ["instagram", "instagram"],
      ["thread", "twitter"],
      ["linkedin", "twitter"],
    ];
    for (const [contentType, expected] of cases) {
      expect(contentTypeToPlatformId(contentType)).toBe(expected);
    }
  });
});
