import alchemy from "alchemy";
import { Vite, Worker, R2Bucket } from "alchemy/cloudflare";
import { requireEnv, stage } from "./utils/stageEnv";

const app = await alchemy("generai");
console.log(`(detected: ${stage})`);

const mediaBucket = await R2Bucket("media", {
  name: `${app.name}-${app.stage}-media`,
  adopt: true,
  devDomain: true,
  cors: [
    {
      allowed: {
        origins: ["*"],
        methods: ["GET", "HEAD", "PUT"],
        headers: ["*"],
      },
    },
  ],
});

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
    POSTMARK_SERVER_TOKEN: requireEnv("POSTMARK_SERVER_TOKEN"),
    POSTMARK_FROM_EMAIL: requireEnv("POSTMARK_FROM_EMAIL"),
    GEMINI_API_KEY: requireEnv("GEMINI_API_KEY"),
    AI_PROVIDER_API_KEY: requireEnv("AI_PROVIDER_API_KEY"),
    AI_PROVIDER_BASE_URL: requireEnv("AI_PROVIDER_BASE_URL"),
    AI_TEXT_MODEL: requireEnv("AI_TEXT_MODEL"),
    AI_VISION_MODEL: requireEnv("AI_VISION_MODEL"),
    META_APP_ID: requireEnv("META_APP_ID"),
    META_APP_SECRET: requireEnv("META_APP_SECRET"),
    META_REDIRECT_URI: requireEnv("META_REDIRECT_URI"),
    MEDIA_BUCKET: mediaBucket,
    R2_PUBLIC_URL: mediaBucket.devDomain
      ? `https://${mediaBucket.devDomain}`
      : "",
  },
  dev: {
    port: 3000,
  },
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);
console.log(`Auth Docs -> ${server.url}api/auth/reference`);
console.log(`Media -> ${mediaBucket.devDomain ?? "no dev domain"}`);

await app.finalize();
