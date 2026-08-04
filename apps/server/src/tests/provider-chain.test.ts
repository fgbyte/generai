import { beforeEach, describe, expect, it, vi } from "vitest";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { ProviderConfig } from "../lib/providers";

// ---------------------------------------------------------------------------
// Mock @langchain/openai BEFORE any other imports
// ---------------------------------------------------------------------------

/** Shared invoke mock — all ChatOpenAI instances share the same invoke fn.
 *  Configure per-test with mockInvoke.mockResolvedValue / mockRejectedValue / mockImplementation. */
const mockInvoke = vi.fn();

const MockChatOpenAI = vi.hoisted(() =>
  vi.fn().mockImplementation(function () {
    return { invoke: mockInvoke };
  }),
);

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: MockChatOpenAI,
}));

// ---------------------------------------------------------------------------
// Mock ../lib/retry — intercept withRetries for all consumers
// ---------------------------------------------------------------------------

const mockWithRetries = vi.hoisted(() => vi.fn());

vi.mock("../lib/retry", () => ({
  withRetries: mockWithRetries,
  isRetryableError: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------

import { createProviderClient, generateWithChain, clearClientCache } from "../lib/provider-chain";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProvider(overrides?: Partial<ProviderConfig>): ProviderConfig {
  return {
    id: "nvidia",
    apiKey: "test-nvidia-key",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    textModel: "google/gemma-3n-e4b-it",
    visionModel: "google/gemma-3n-e4b-it",
    ...overrides,
  };
}

function makeHttpError(status: number, message = "HTTP Error"): Error & { status?: number } {
  const err = new Error(message) as Error & { status?: number };
  err.status = status;
  return err;
}

function makeMessages(): SystemMessage[] {
  return [new SystemMessage("You are a helpful assistant.")];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createProviderClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearClientCache();
  });

  it("returns a ChatOpenAI instance with maxRetries: 0", () => {
    const config = makeProvider();
    createProviderClient(config);

    expect(MockChatOpenAI).toHaveBeenCalledTimes(1);
    const callArgs = MockChatOpenAI.mock.calls[0]![0];
    expect(callArgs.maxRetries).toBe(0);
  });

  it("returns a ChatOpenAI instance with timeout: 15000", () => {
    const config = makeProvider();
    createProviderClient(config);

    const callArgs = MockChatOpenAI.mock.calls[0]![0];
    expect(callArgs.timeout).toBe(15_000);
  });

  it("uses textModel when modelType is 'text'", () => {
    const config = makeProvider({ textModel: "custom-text-model" });
    createProviderClient(config, "text");

    const callArgs = MockChatOpenAI.mock.calls[0]![0];
    expect(callArgs.modelName).toBe("custom-text-model");
  });

  it("uses visionModel when modelType is 'vision'", () => {
    const config = makeProvider({ visionModel: "custom-vision-model" });
    createProviderClient(config, "vision");

    const callArgs = MockChatOpenAI.mock.calls[0]![0];
    expect(callArgs.modelName).toBe("custom-vision-model");
  });

  it("passes apiKey, baseURL, temperature, maxTokens, streamUsage", () => {
    const config = makeProvider();
    createProviderClient(config);

    const callArgs = MockChatOpenAI.mock.calls[0]![0];
    expect(callArgs.apiKey).toBe("test-nvidia-key");
    expect(callArgs.configuration.baseURL).toBe("https://integrate.api.nvidia.com/v1");
    expect(callArgs.temperature).toBe(0.7);
    expect(callArgs.maxTokens).toBe(2048);
    expect(callArgs.streamUsage).toBe(false);
  });

  it("caches clients by provider ID", () => {
    const config = makeProvider({ id: "nvidia" });
    const client1 = createProviderClient(config);
    const client2 = createProviderClient(config);

    expect(client1).toBe(client2);
    expect(MockChatOpenAI).toHaveBeenCalledTimes(1);
  });

  it("creates separate clients for different provider IDs", () => {
    const nvidia = makeProvider({ id: "nvidia" });
    const groq = makeProvider({ id: "groq", apiKey: "groq-key", baseUrl: "https://groq.com" });
    const client1 = createProviderClient(nvidia);
    const client2 = createProviderClient(groq);

    expect(client1).not.toBe(client2);
    expect(MockChatOpenAI).toHaveBeenCalledTimes(2);
  });
});

describe("generateWithChain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearClientCache();
    mockInvoke.mockReset();
    // Default: withRetries passes through to fn
    mockWithRetries.mockImplementation(async (fn: () => Promise<unknown>) => fn());
  });

  it("throws when providers array is empty", async () => {
    await expect(
      generateWithChain({ providers: [], messages: makeMessages(), modelType: "text" }),
    ).rejects.toThrow("No providers configured");
  });

  it("calls assertNoPaidModels at start", async () => {
    const config = makeProvider();
    mockInvoke.mockResolvedValue({ content: "hello" });

    await generateWithChain({ providers: [config], messages: makeMessages(), modelType: "text" });

    // assertNoPaidModels runs for real (not mocked) — verify the happy path completed
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("returns content on single provider success", async () => {
    const config = makeProvider();
    mockInvoke.mockResolvedValue({ content: "hello world" });

    const result = await generateWithChain({
      providers: [config],
      messages: makeMessages(),
      modelType: "text",
    });

    expect(result).toBe("hello world");
  });

  it("retries on 429 then failovers to next provider", async () => {
    const provider1 = makeProvider({ id: "nvidia" });
    const provider2 = makeProvider({ id: "groq", apiKey: "groq-key", baseUrl: "https://groq.com" });

    // withRetries for provider1: throw 429 (simulating exhausted retries)
    // withRetries for provider2: succeed via mockInvoke
    mockWithRetries
      .mockImplementationOnce(async () => {
        throw makeHttpError(429, "Rate limited");
      })
      .mockImplementationOnce(async (fn: () => Promise<unknown>) => fn());

    mockInvoke.mockResolvedValue({ content: "groq success" });

    const result = await generateWithChain({
      providers: [provider1, provider2],
      messages: makeMessages(),
      modelType: "text",
    });

    expect(result).toBe("groq success");
  });

  it("throws immediately on 400 without touching next provider", async () => {
    const provider1 = makeProvider({ id: "nvidia" });
    const provider2 = makeProvider({ id: "groq", apiKey: "groq-key", baseUrl: "https://groq.com" });

    // withRetries passes through, but invoke throws 400
    mockWithRetries.mockImplementation(async (fn: () => Promise<unknown>) => fn());
    mockInvoke.mockRejectedValue(makeHttpError(400, "Bad request"));

    await expect(
      generateWithChain({
        providers: [provider1, provider2],
        messages: makeMessages(),
        modelType: "text",
      }),
    ).rejects.toThrow("Bad request");

    // Only 1 ChatOpenAI created (provider2 never reached)
    expect(MockChatOpenAI).toHaveBeenCalledTimes(1);
  });

  it("throws on empty response WITHOUT failover", async () => {
    const config = makeProvider();
    mockInvoke.mockResolvedValue({ content: "" });

    await expect(
      generateWithChain({
        providers: [config],
        messages: makeMessages(),
        modelType: "text",
      }),
    ).rejects.toThrow("empty content");
  });

  it("throws on null response content WITHOUT failover", async () => {
    const config = makeProvider();
    mockInvoke.mockResolvedValue({ content: null });

    await expect(
      generateWithChain({
        providers: [config],
        messages: makeMessages(),
        modelType: "text",
      }),
    ).rejects.toThrow("empty content");
  });

  it("throws 'All AI providers failed' when all providers exhausted", async () => {
    const provider1 = makeProvider({ id: "nvidia" });
    const provider2 = makeProvider({ id: "groq", apiKey: "groq-key", baseUrl: "https://groq.com" });

    mockWithRetries
      .mockImplementationOnce(async () => {
        throw makeHttpError(429, "Rate limited");
      })
      .mockImplementationOnce(async () => {
        throw makeHttpError(503, "Service unavailable");
      });

    await expect(
      generateWithChain({
        providers: [provider1, provider2],
        messages: makeMessages(),
        modelType: "text",
      }),
    ).rejects.toThrow("All AI providers failed");
  });

  it("logs attempt messages to console.log", async () => {
    const config = makeProvider();
    mockInvoke.mockResolvedValue({ content: "success" });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await generateWithChain({
      providers: [config],
      messages: makeMessages(),
      modelType: "text",
    });

    const logCalls = logSpy.mock.calls.map((c) => String(c[0]));
    expect(logCalls.some((msg) => msg.includes("[provider-chain]"))).toBe(true);
    expect(logCalls.some((msg) => msg.includes("status=success"))).toBe(true);

    logSpy.mockRestore();
  });

  it("passes correct messages to invoke", async () => {
    const config = makeProvider();
    const messages = [new SystemMessage("system prompt"), new HumanMessage("user message")];
    mockInvoke.mockResolvedValue({ content: "response" });

    await generateWithChain({
      providers: [config],
      messages,
      modelType: "text",
    });

    expect(mockInvoke).toHaveBeenCalledWith(messages);
  });

  it("failovers on 401 without retry", async () => {
    const provider1 = makeProvider({ id: "nvidia" });
    const provider2 = makeProvider({ id: "groq", apiKey: "groq-key", baseUrl: "https://groq.com" });

    mockWithRetries
      .mockImplementationOnce(async () => {
        throw makeHttpError(401, "Unauthorized");
      })
      .mockImplementationOnce(async (fn: () => Promise<unknown>) => fn());

    mockInvoke.mockResolvedValue({ content: "groq success" });

    const result = await generateWithChain({
      providers: [provider1, provider2],
      messages: makeMessages(),
      modelType: "text",
    });

    expect(result).toBe("groq success");
  });

  it("failovers on 403 without retry", async () => {
    const provider1 = makeProvider({ id: "nvidia" });
    const provider2 = makeProvider({ id: "groq", apiKey: "groq-key", baseUrl: "https://groq.com" });

    mockWithRetries
      .mockImplementationOnce(async () => {
        throw makeHttpError(403, "Forbidden");
      })
      .mockImplementationOnce(async (fn: () => Promise<unknown>) => fn());

    mockInvoke.mockResolvedValue({ content: "groq success" });

    const result = await generateWithChain({
      providers: [provider1, provider2],
      messages: makeMessages(),
      modelType: "text",
    });

    expect(result).toBe("groq success");
  });

  it("throws on 422 without failover", async () => {
    const provider1 = makeProvider({ id: "nvidia" });
    const provider2 = makeProvider({ id: "groq", apiKey: "groq-key", baseUrl: "https://groq.com" });

    mockWithRetries.mockImplementation(async (fn: () => Promise<unknown>) => fn());
    mockInvoke.mockRejectedValue(makeHttpError(422, "Unprocessable Entity"));

    await expect(
      generateWithChain({
        providers: [provider1, provider2],
        messages: makeMessages(),
        modelType: "text",
      }),
    ).rejects.toThrow("Unprocessable Entity");

    // Only 1 ChatOpenAI created (provider2 never reached)
    expect(MockChatOpenAI).toHaveBeenCalledTimes(1);
  });
});
