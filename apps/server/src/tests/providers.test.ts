import { describe, expect, it } from "vitest";
import {
  getProviderConfigs,
  assertNoPaidModels,
  type EnvSource,
} from "../lib/providers";

describe("getProviderConfigs", () => {
  it("returns [] when no keys are provided", () => {
    const configs = getProviderConfigs({});
    expect(configs).toEqual([]);
  });

  it("returns only NVIDIA when only NVIDIA key is set", () => {
    const env: EnvSource = {
      AI_PROVIDER_API_KEY: "nv-test-key",
      AI_PROVIDER_BASE_URL: "https://integrate.api.nvidia.com/v1",
      AI_TEXT_MODEL: "meta/llama-3.1-8b-instruct",
      AI_VISION_MODEL: "meta/llama-3.1-8b-instruct",
    };
    const configs = getProviderConfigs(env);
    expect(configs).toHaveLength(1);
    expect(configs[0]!.id).toBe("nvidia");
    expect(configs[0]!.apiKey).toBe("nv-test-key");
    expect(configs[0]!.baseUrl).toBe("https://integrate.api.nvidia.com/v1");
    expect(configs[0]!.textModel).toBe("meta/llama-3.1-8b-instruct");
    expect(configs[0]!.visionModel).toBe("meta/llama-3.1-8b-instruct");
  });

  it("returns all 3 providers in order when all keys are set", () => {
    const env: EnvSource = {
      AI_PROVIDER_API_KEY: "nv-key",
      AI_PROVIDER_BASE_URL: "https://integrate.api.nvidia.com/v1",
      AI_TEXT_MODEL: "nvidia/text-model",
      AI_VISION_MODEL: "nvidia/vision-model",
      GROQ_API_KEY: "groq-key",
      GROQ_BASE_URL: "https://api.groq.com/openai/v1",
      GROQ_TEXT_MODEL: "llama-3.3-70b-versatile",
      GROQ_VISION_MODEL: "qwen/qwen3.6-27b",
      GEMINI_API_KEY: "gemini-key",
      GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      GEMINI_TEXT_MODEL: "gemini-2.5-flash",
      GEMINI_VISION_MODEL: "gemini-2.5-flash",
    };
    const configs = getProviderConfigs(env);
    expect(configs.map((c) => c.id)).toEqual(["groq", "gemini", "nvidia"]);
  });

  it("skips Groq when key is missing, includes Gemini", () => {
    const env: EnvSource = {
      AI_PROVIDER_API_KEY: "nv-key",
      AI_TEXT_MODEL: "nvidia/text-model",
      AI_VISION_MODEL: "nvidia/vision-model",
      GEMINI_API_KEY: "gemini-key",
      GEMINI_TEXT_MODEL: "gemini-2.5-flash",
      GEMINI_VISION_MODEL: "gemini-2.5-flash",
    };
    const configs = getProviderConfigs(env);
    expect(configs.map((c) => c.id)).toEqual(["gemini", "nvidia"]);
  });

  it("applies correct default base URLs per provider", () => {
    const env: EnvSource = {
      AI_PROVIDER_API_KEY: "nv-key",
      AI_TEXT_MODEL: "nvidia/text-model",
      AI_VISION_MODEL: "nvidia/vision-model",
      GROQ_API_KEY: "groq-key",
      GROQ_TEXT_MODEL: "llama-3.3-70b-versatile",
      GROQ_VISION_MODEL: "qwen/qwen3.6-27b",
      GEMINI_API_KEY: "gemini-key",
      GEMINI_TEXT_MODEL: "gemini-2.5-flash",
      GEMINI_VISION_MODEL: "gemini-2.5-flash",
    };
    const configs = getProviderConfigs(env);
    const nvidia = configs.find((c) => c.id === "nvidia")!;
    const groq = configs.find((c) => c.id === "groq")!;
    const gemini = configs.find((c) => c.id === "gemini")!;
    expect(nvidia.baseUrl).toBe("https://integrate.api.nvidia.com/v1");
    expect(groq.baseUrl).toBe("https://api.groq.com/openai/v1");
    expect(gemini.baseUrl).toBe(
      "https://generativelanguage.googleapis.com/v1beta/openai/",
    );
  });

  it("applies correct default text/vision models for Groq", () => {
    const env: EnvSource = {
      GROQ_API_KEY: "groq-key",
    };
    const configs = getProviderConfigs(env);
    expect(configs).toHaveLength(1);
    expect(configs[0]!.textModel).toBe("llama-3.3-70b-versatile");
    expect(configs[0]!.visionModel).toBe("qwen/qwen3.6-27b");
  });

  it("applies correct default text/vision models for Gemini", () => {
    const env: EnvSource = {
      GEMINI_API_KEY: "gemini-key",
    };
    const configs = getProviderConfigs(env);
    expect(configs).toHaveLength(1);
    expect(configs[0]!.textModel).toBe("gemini-2.5-flash");
    expect(configs[0]!.visionModel).toBe("gemini-2.5-flash");
  });

  it("skips NVIDIA when key is missing", () => {
    const env: EnvSource = {
      GROQ_API_KEY: "groq-key",
      GROQ_TEXT_MODEL: "llama-3.3-70b-versatile",
      GROQ_VISION_MODEL: "qwen/qwen3.6-27b",
    };
    const configs = getProviderConfigs(env);
    expect(configs).toHaveLength(1);
    expect(configs[0]!.id).toBe("groq");
  });
});

describe("assertNoPaidModels", () => {
  it("throws when a model name contains 'pro'", () => {
    const configs = [
      {
        id: "gemini" as const,
        apiKey: "key",
        baseUrl: "https://example.com",
        textModel: "gemini-2.5-pro",
        visionModel: "gemini-2.5-flash",
      },
    ];
    expect(() => assertNoPaidModels(configs)).toThrow("pro");
  });

  it("does NOT throw when all models are free-tier", () => {
    const configs = [
      {
        id: "gemini" as const,
        apiKey: "key",
        baseUrl: "https://example.com",
        textModel: "gemini-2.5-flash",
        visionModel: "gemini-2.5-flash",
      },
    ];
    expect(() => assertNoPaidModels(configs)).not.toThrow();
  });

  it("throws when a model name contains 'paid'", () => {
    const configs = [
      {
        id: "nvidia" as const,
        apiKey: "key",
        baseUrl: "https://example.com",
        textModel: "some-paid-model",
        visionModel: "free-model",
      },
    ];
    expect(() => assertNoPaidModels(configs)).toThrow("paid");
  });

  it("does nothing on empty configs array", () => {
    expect(() => assertNoPaidModels([])).not.toThrow();
  });
});
