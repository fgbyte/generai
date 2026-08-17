import alchemy from "alchemy";
import { Vite } from "alchemy/cloudflare";
import { Worker } from "alchemy/cloudflare";
import { requireEnv, stage } from "./utils/stageEnv";

// Bind optional provider vars only when configured, so deploys don't fail
// for users who haven't set up Groq/Gemini fallbacks.
function optionalEnv(name: string): Record<string, string> {
  const value = process.env[name];
  return value ? { [name]: value } : {};
}

const app = await alchemy("generai");
console.log(`(detected: ${stage})`);

export const web = await Vite("web", {
  cwd: "../../apps/web",
  assets: "dist",
  adopt: true,
  bindings: {
    VITE_SERVER_URL: requireEnv("VITE_SERVER_URL"),
  },
  dev: {
    command: "bun run dev",
    domain: "localhost:3001",
  },
});

export const server = await Worker("server", {
  cwd: "../../apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  adopt: true,
  bindings: {
    DATABASE_URL: requireEnv("DATABASE_URL"),
    CORS_ORIGIN: requireEnv("CORS_ORIGIN"),
    BETTER_AUTH_SECRET: requireEnv("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: requireEnv("BETTER_AUTH_URL"),
    GOOGLE_CLIENT_ID: requireEnv("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: requireEnv("GOOGLE_CLIENT_SECRET"),
    POSTMARK_SERVER_TOKEN: requireEnv("POSTMARK_SERVER_TOKEN"),
    POSTMARK_FROM_EMAIL: requireEnv("POSTMARK_FROM_EMAIL"),
    AI_PROVIDER_API_KEY: requireEnv("AI_PROVIDER_API_KEY"),
    AI_PROVIDER_BASE_URL: requireEnv("AI_PROVIDER_BASE_URL"),
    AI_TEXT_MODEL: requireEnv("AI_TEXT_MODEL"),
    AI_VISION_MODEL: requireEnv("AI_VISION_MODEL"),
    TELEGRAM_BOT_TOKEN: requireEnv("TELEGRAM_BOT_TOKEN"),
    TELEGRAM_CHAT_ID: requireEnv("TELEGRAM_CHAT_ID"),
    ...optionalEnv("GROQ_API_KEY"),
    ...optionalEnv("GROQ_BASE_URL"),
    ...optionalEnv("GROQ_TEXT_MODEL"),
    ...optionalEnv("GROQ_VISION_MODEL"),
    ...optionalEnv("GEMINI_API_KEY"),
    ...optionalEnv("GEMINI_BASE_URL"),
    ...optionalEnv("GEMINI_TEXT_MODEL"),
    ...optionalEnv("GEMINI_VISION_MODEL"),
    // Analytics is enabled by default in prod (logger treats missing as enabled);
    // set to "false" to disable.
    ...optionalEnv("ANALYTICS_ENABLED"),
  },
  dev: {
    port: 3000,
  },
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);
console.log(`Auth Docs -> ${server.url}api/auth/reference`);

await app.finalize();
