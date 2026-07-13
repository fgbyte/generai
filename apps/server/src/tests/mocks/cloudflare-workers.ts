// Mock for Cloudflare Workers runtime API
// This provides the env object that would normally come from cloudflare:workers

export const env = {
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  CORS_ORIGIN: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  POSTMARK_SERVER_TOKEN: "test-token",
  POSTMARK_FROM_EMAIL: "test@test.com",
  GEMINI_API_KEY: "test-api-key",
  TELEGRAM_BOT_TOKEN: "test-bot-token",
  TELEGRAM_CHAT_ID: "test-chat-id",
  VITE_SERVER_URL: "http://localhost:3000",
};
