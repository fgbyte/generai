import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Carga .env local (solo para desarrollo)
const localEnvPath = resolve(".env.dev");
if (existsSync(localEnvPath)) {
  config({ path: localEnvPath });
  console.log("[drizzle🌧️] Loaded local .env.dev");
} else {
  console.warn(
    "[drizzle] No local packages/db/.env.dev found. Make sure to create one with DATABASE_URL for development.",
  );
}

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
    ssl: { rejectUnauthorized: false },
  },
});
