import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

// Configurar WebSocket para Node.js (necesario para migraciones)
neonConfig.webSocketConstructor = ws;

// Determine environment from CLI args or default to dev
const args = process.argv.slice(2);
const envFlag = args.includes("--staging") ? "staging" : "dev";
const envFile = envFlag === "staging" ? ".env.staging" : ".env.dev";

// Carga el archivo .env correspondiente
const localEnvPath = resolve(envFile);
if (existsSync(localEnvPath)) {
  config({ path: localEnvPath });
  console.log(`[migrate] ✅ Loaded ${envFile}`);
} else {
  console.warn(`[migrate] ⚠️ No ${envFile} found`);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is not defined!");
}

console.log("[migrate] 🔌 Connecting to Neon database...");

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

async function main() {
  try {
    console.log("[migrate] 🚀 Running migrations...");
    await migrate(db, { migrationsFolder: "./src/migrations" });
    console.log("[migrate] ✅ Migrations completed successfully!");
  } catch (error) {
    console.error("[migrate] ❌ Migration failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
