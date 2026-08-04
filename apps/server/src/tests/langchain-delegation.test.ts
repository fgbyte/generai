import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Hoisted mocks ---

const mockGenerateWithChain = vi.hoisted(() => vi.fn());

// --- Module mocks ---

vi.mock("../lib/provider-chain", () => ({
  generateWithChain: mockGenerateWithChain,
}));

vi.mock("../lib/providers", () => ({
  getProviderConfigs: () => [],
}));

// --- Import after mocks ---

import { generateContent } from "../lib/langchain";

// --- Tests ---

describe("langchain delegation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateWithChain.mockResolvedValue("caption text");
  });

  it("delegates to generateWithChain with modelType 'vision' for instagram with image", async () => {
    const imageBase64 = "aGVsbG8="; // "hello"

    await generateContent("instagram", "describe this image", imageBase64);

    expect(mockGenerateWithChain).toHaveBeenCalledTimes(1);
    const [input] = mockGenerateWithChain.mock.calls[0];
    expect(input.modelType).toBe("vision");
  });

  it("delegates to generateWithChain with modelType 'text' for thread", async () => {
    await generateContent("thread", "write a thread");

    expect(mockGenerateWithChain).toHaveBeenCalledTimes(1);
    const [input] = mockGenerateWithChain.mock.calls[0];
    expect(input.modelType).toBe("text");
  });
});
