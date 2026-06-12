import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// Tauri 2 uses a config-only Vite integration (no JS plugin).
// https://v2.tauri.app/start/frontend/vite/
// https://thevetatsramblings.com/blogs/rust/tauri/00_new_vite_template
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  // Don't clear the screen on Vite restart so Rust compiler errors stay visible.
  clearScreen: false,
  plugins: [tailwindcss(), tanstackRouter({}), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
    // Tauri relies on a fixed port — fail fast instead of picking a new one.
    strictPort: true,
    // Bind to a public host for mobile dev (e.g. `TAURI_DEV_HOST=192.168.x.x`).
    host: host || false,
    // Mobile webviews reach HMR over WebSocket on Tauri's default port 1421.
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    // Vite should not watch the Rust crate — cargo handles its own rebuilds.
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  // Expose Tauri-injected env vars to client code in addition to VITE_*.
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    // Tauri's webview targets differ by OS — match the broader ones.
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    // Skip minification in debug builds to keep Rust stack traces meaningful.
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    // Emit sourcemaps only in debug builds (smaller release artifacts).
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
