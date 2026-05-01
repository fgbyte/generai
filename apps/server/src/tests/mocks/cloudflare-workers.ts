// Mock for Cloudflare Workers runtime API
// This provides the env object that would normally come from cloudflare:workers

export const env = {
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  CORS_ORIGIN: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  POSTMARK_SERVER_TOKEN: "test-token",
  POSTMARK_FROM_EMAIL: "test@test.com",
  GEMINI_API_KEY: "test-api-key",
  VITE_SERVER_URL: "http://localhost:3000",
};
