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

  it("strips a single thinking block from the model output", async () => {
    mockGenerateWithChain.mockResolvedValue(
      "<think>internal reasoning</think>caption text",
    );

    const result = await generateContent("instagram", "describe this image");

    expect(result.content).toEqual(["caption text"]);
  });

  it("strips multiple thinking blocks from the model output", async () => {
    mockGenerateWithChain.mockResolvedValue(
      "<think>one</think>caption<think>two</think>",
    );

    const result = await generateContent("instagram", "describe this image");

    expect(result.content).toEqual(["caption"]);
  });

  it("strips case-insensitive and attribute-carrying thinking blocks", async () => {
    mockGenerateWithChain.mockResolvedValue(
      '<THINK mode="internal">draft</THINK>caption text',
    );

    const result = await generateContent("instagram", "describe this image");

    expect(result.content).toEqual(["caption text"]);
  });

  it("throws when only thinking blocks are returned", async () => {
    mockGenerateWithChain.mockResolvedValue(
      "<think>only reasoning, no answer</think>",
    );

    await expect(generateContent("instagram", "describe this image")).rejects.toThrow(
      "No content generated from AI provider",
    );
  });
});
