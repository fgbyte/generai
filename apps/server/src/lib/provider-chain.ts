import { ChatOpenAI } from "@langchain/openai";
import type { BaseMessage } from "@langchain/core/messages";
import type { ProviderConfig } from "./providers";
import { assertNoPaidModels } from "./providers";
import { withRetries } from "./retry";

// ---------------------------------------------------------------------------
// Client factory + cache
// ---------------------------------------------------------------------------

const clientCache = new Map<string, ChatOpenAI>();

/**
 * Create (or return cached) ChatOpenAI client for a provider.
 *
 * CRITICAL: `maxRetries: 0` — LangChain's built-in retry must be disabled.
 * We handle retries ourselves via `withRetries` from retry.ts.
 */
export function createProviderClient(
  config: ProviderConfig,
  modelType: "text" | "vision" = "text",
): ChatOpenAI {
  const cacheKey = `${config.id}:${modelType}`;

  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  const model = modelType === "vision" ? config.visionModel : config.textModel;

  const client = new ChatOpenAI({
    modelName: model,
    apiKey: config.apiKey,
    configuration: {
      baseURL: config.baseUrl,
    },
    temperature: 0.7,
    maxTokens: 2048,
    streamUsage: false,
    maxRetries: 0,
    timeout: 15_000,
    // Gemini 2.5 Flash emits thinking blocks by default — disable them so
    // responses contain only the final answer (stripThinkingBlocks only handles
    // the `` format used by Qwen/Groq).
    ...(config.id === "gemini" && {
      extra_body: {
        google: {
          thinking_config: {
            thinking_budget: 0,
          },
        },
      },
    }),
  });

  clientCache.set(cacheKey, client);
  return client;
}

/** Clear the client cache — use in test teardown only. */
export function clearClientCache(): void {
  clientCache.clear();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractHttpStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status: unknown }).status;
    if (typeof s === "number") return s;
  }
  return undefined;
}

/** 400/422 → throw immediately (no failover). */
function isFatalClientError(err: unknown): boolean {
  const status = extractHttpStatus(err);
  return status === 400 || status === 422;
}

// ---------------------------------------------------------------------------
// generateWithChain
// ---------------------------------------------------------------------------

const TOTAL_DEADLINE_MS = 45_000;
const RETRY_MAX_ATTEMPTS = 2;
const RETRY_BASE_MS = 250;
const RETRY_CAP_MS = 2_000;

/**
 * Orchestrate failover across a chain of providers.
 *
 * Flow per provider:
 *   1. withRetries wraps client.invoke — retries transient errors (408/429/5xx/network)
 *   2. 400/422 → throw immediately, no failover
 *   3. 401/403 → failover to next provider (no retry)
 *   4. 408/429/5xx/network → retry, then failover if still failing
 *   5. Empty response → throw without failover
 */
export async function generateWithChain(input: {
  providers: ProviderConfig[];
  messages: BaseMessage[];
  modelType: "text" | "vision";
}): Promise<string> {
  const { providers, messages, modelType } = input;

  // 1. Validate paid models
  assertNoPaidModels(providers);

  // 2. Empty chain → config error
  if (providers.length === 0) {
    throw new Error("No providers configured");
  }

  const deadline = Date.now() + TOTAL_DEADLINE_MS;
  let attempt = 0;

  for (const config of providers) {
    attempt++;

    // Check total deadline
    if (Date.now() >= deadline) {
      throw new Error("All AI providers failed: total deadline exceeded (45s)");
    }

    const client = createProviderClient(config, modelType);

    console.log(`[provider-chain] attempt ${attempt} provider=${config.id} status=trying`);

    try {
      const response = await withRetries(
        async () => client.invoke(messages),
        {
          maxAttempts: RETRY_MAX_ATTEMPTS,
          baseDelayMs: RETRY_BASE_MS,
          maxDelayMs: RETRY_CAP_MS,
        },
      );

      // 6. Empty response → throw without failover
      const text = response.content as string;
      if (!text || text.trim().length === 0) {
        throw new Error("model returned empty content");
      }

      console.log(`[provider-chain] attempt ${attempt} provider=${config.id} status=success`);
      return text;
    } catch (err) {
      // 5. Empty content error → throw without failover
      if (err instanceof Error && err.message === "model returned empty content") {
        console.log(`[provider-chain] attempt ${attempt} provider=${config.id} status=empty`);
        throw err;
      }

      // 400/422 → throw immediately (no failover)
      if (isFatalClientError(err)) {
        console.log(
          `[provider-chain] attempt ${attempt} provider=${config.id} status=fatal status=${extractHttpStatus(err)}`,
        );
        throw err;
      }

      // 401/403/other errors → failover to next provider
      const status = extractHttpStatus(err);
      console.log(
        `[provider-chain] attempt ${attempt} provider=${config.id} status=failover status=${status ?? "network"}`,
      );
      continue;
    }
  }

  // All providers exhausted
  throw new Error("All AI providers failed after exhausting retries");
}
