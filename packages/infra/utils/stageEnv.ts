import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, "../../../");

// Detectar stage desde: ALCHEMY_STAGE > --stage CLI > USERNAME > "dev"
function detectStage(): string {
  // 1. ALCHEMY_STAGE environment variable
  if (process.env.ALCHEMY_STAGE) {
    return process.env.ALCHEMY_STAGE;
  }

  // 2. --stage CLI argument (handles both "--stage=value" and "--stage value" formats)
  const stageIndex = process.argv.findIndex((arg) => arg === "--stage" || arg.startsWith("--stage="));
  if (stageIndex !== -1) {
    const stageArg = process.argv[stageIndex];
    if (stageArg) {
      // Check for "--stage=value" format
      if (stageArg.startsWith("--stage=")) {
        const stageValue = stageArg.split("=")[1];
        if (stageValue) {
          return stageValue;
        }
      }
      // Check for "--stage value" format (next argument is the value)
      const nextArg = process.argv[stageIndex + 1];
      if (nextArg && !nextArg.startsWith("-")) {
        return nextArg;
      }
    }
  }

  // 3. USERNAME env var
  if (process.env.USERNAME) {
    return process.env.USERNAME.toLowerCase();
  }

  // 4. Fallback: "dev"
  return "dev";
}

// Cargar .env.{stage} de cada app
function loadStageEnv(stage: string): void {
  const envDirs = [
    path.join(workspaceRoot, "apps/web"),
    path.join(workspaceRoot, "apps/server"),
    path.join(workspaceRoot, "packages/infra"),
  ];

  for (const dir of envDirs) {
    const envFile = path.join(dir, `.env.${stage}`);
    if (existsSync(envFile)) {
      config({ path: envFile, override: true });
      console.log(`[alchemy] Loaded ${path.relative(workspaceRoot, envFile)}`);
    }
  }
}

// Detectar y cargar stage
export const stage = detectStage();
loadStageEnv(stage);
console.log(`[alchemy] stage: ${stage}`);

// Función requireEnv (compatible con la anterior)
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name} (stage: ${stage})`);
  }
  return value;
}
