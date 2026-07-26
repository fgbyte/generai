import { db } from "@generai/db";
import * as schema from "@generai/db/schema/auth";
import { env, getTrustedOrigins } from "@generai/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sendEmail } from "@generai/mail";
import { bearer, openAPI } from "better-auth/plugins";
import bcrypt from "bcryptjs";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
  }),
  trustedOrigins: getTrustedOrigins(),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID as string,
      clientSecret: env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account",
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
    },
  },
  emailAndPassword: {
    enabled: true,
    password: {
      //config manual del hash compatible con workers
      hash: async (password) => {
        return bcrypt.hash(password, 10); // Cost 10 en lugar de 12
      },
      verify: async ({ hash, password }) => {
        return bcrypt.compare(password, hash);
      },
    },
    requireEmailVerification: true, // Require email verification before login
  },
  plugins: [openAPI(), bearer()], //Activate OpenAPI DOCS and bearer auth for Tauri clients
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    sendVerificationEmail: async ({ user, url }) => {
      console.info("[auth] sending verification email", {
        email: user.email,
        userId: user.id,
      });

      try {
        await sendEmail({
          to: user.email,
          subject: "Verify your email address",
          text: `Click the link to verify your email: ${url}`,
          tag: "auth-verification",
        });

        console.info("[auth] verification email sent", {
          email: user.email,
          userId: user.id,
        });
      } catch (error) {
        console.error("[auth] verification email failed", {
          email: user.email,
          userId: user.id,
          error,
        });

        throw error;
      }
    },
  },
  session: {
    // cookieCache must be disabled when using the bearer() plugin in a
    // Tauri Android client. With cookieCache enabled Better Auth rotates
    // the short-lived cookie token against the long-lived DB session, so
    // the value returned in the sign-in response body (and serialized into
    // the `set-auth-token` header) does not match the row in the DB. Web
    // and Tauri desktop clients hide this because their persistent
    // session cookies always carry the real DB token; the Android client,
    // which has no usable cookie storage in the WebView, falls back to the
    // rotated token and the server rejects it on `get-session`.
    cookieCache: {
      enabled: false,
    },
  },
  secret: env.BETTER_AUTH_SECRET, //sacadas de alchemy
  baseURL: env.BETTER_AUTH_URL, //sacadas de alchemy
  advanced: {
    crossSubDomainCookies: {
      enabled: !!env.BETTER_AUTH_URL?.startsWith("https://"),
      domain: (() => {
        if (!env.BETTER_AUTH_URL) return undefined;
        const hostname = new URL(env.BETTER_AUTH_URL).hostname;
        const parts = hostname.split(".");
        // workers.dev is a Public Suffix List domain — browsers reject cookies on it.
        // We need the org subdomain: generai-server-staging.fgbyte.workers.dev → fgbyte.workers.dev
        if (parts.slice(-2).join(".") === "workers.dev" && parts.length >= 3) {
          return parts.slice(-3).join(".");
        }
        return parts.slice(-2).join(".");
      })(),
    },
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.BETTER_AUTH_URL?.startsWith("https://") ?? false,
      httpOnly: true,
      path: "/",
    },
  },
});
