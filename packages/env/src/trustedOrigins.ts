import { env } from "cloudflare:workers";

// Tauri app origins by platform
const TAURI_ORIGINS = [
  "tauri://localhost", // Linux/macOS
  "https://tauri.localhost", // Windows
  "http://tauri.localhost", // Windows (HTTP fallback)
];

/**
 * Trusted origins for CORS and Better-Auth.
 * Includes web app, Tauri clients, and fallback for non-browser clients.
 */
export function getTrustedOrigins(): string[] {
  return [env.CORS_ORIGIN, ...TAURI_ORIGINS];
}
