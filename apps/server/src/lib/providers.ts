export type ProviderId = "nvidia" | "groq" | "gemini";

export interface ProviderConfig {
  id: ProviderId;
  apiKey: string;
  baseUrl: string;
  textModel: string;
  visionModel: string;
}

export type EnvSource = { [key: string]: string | undefined };

function getEnvVar(env: EnvSource, name: string): string | undefined {
  return env[name];
}

function buildNvidiaConfig(env: EnvSource): ProviderConfig | null {
  const apiKey = getEnvVar(env, "AI_PROVIDER_API_KEY");
  if (!apiKey) return null;
  return {
    id: "nvidia",
    apiKey,
    baseUrl: getEnvVar(env, "AI_PROVIDER_BASE_URL") || "https://integrate.api.nvidia.com/v1",
    textModel: getEnvVar(env, "AI_TEXT_MODEL") || "google/gemma-3n-e4b-it",
    visionModel: getEnvVar(env, "AI_VISION_MODEL") || "google/gemma-3n-e4b-it",
  };
}

function buildGroqConfig(env: EnvSource): ProviderConfig | null {
  const apiKey = getEnvVar(env, "GROQ_API_KEY");
  if (!apiKey) return null;
  return {
    id: "groq",
    apiKey,
    baseUrl: getEnvVar(env, "GROQ_BASE_URL") || "https://api.groq.com/openai/v1",
    textModel: getEnvVar(env, "GROQ_TEXT_MODEL") || "llama-3.3-70b-versatile",
    visionModel: getEnvVar(env, "GROQ_VISION_MODEL") || "qwen/qwen3.6-27b",
  };
}

function buildGeminiConfig(env: EnvSource): ProviderConfig | null {
  const apiKey = getEnvVar(env, "GEMINI_API_KEY");
  if (!apiKey) return null;
  return {
    id: "gemini",
    apiKey,
    baseUrl: getEnvVar(env, "GEMINI_BASE_URL") || "https://generativelanguage.googleapis.com/v1beta/openai/",
    textModel: getEnvVar(env, "GEMINI_TEXT_MODEL") || "gemini-2.5-flash",
    visionModel: getEnvVar(env, "GEMINI_VISION_MODEL") || "gemini-2.5-flash",
  };
}

export function getProviderConfigs(env: EnvSource = process.env): ProviderConfig[] {
  const configs: ProviderConfig[] = [];
  for (const builder of [buildGroqConfig, buildGeminiConfig, buildNvidiaConfig]) {
    const config = builder(env);
    if (config) configs.push(config);
  }
  return configs;
}

export function assertNoPaidModels(configs: ProviderConfig[]): void {
  for (const config of configs) {
    for (const model of [config.textModel, config.visionModel]) {
      if (model.includes("pro") || model.includes("paid")) {
        throw new Error(`Paid model detected: "${model}" in provider "${config.id}". Only free-tier models are allowed.`);
      }
    }
  }
}
