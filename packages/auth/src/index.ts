import { db } from "@generai/db";
import * as schema from "@generai/db/schema/auth";
import { env } from "@generai/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sendEmail } from "@generai/mail";
import { openAPI } from "better-auth/plugins";
import bcrypt from "bcryptjs";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",

    schema: schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
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
  plugins: [openAPI()], //Activate OpenAPI DOCS 👈
  emailVerification: {
    sendOnSignUp: true,
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
  // uncomment cookieCache setting when ready to deploy to Cloudflare using *.workers.dev domains
  // session: {
  //   cookieCache: {
  //     enabled: true,
  //     maxAge: 60,
  //   },
  // },
  secret: env.BETTER_AUTH_SECRET, //sacadas de alchemy
  baseURL: env.BETTER_AUTH_URL, //sacadas de alchemy
  advanced: {
    defaultCookieAttributes: {
      sameSite: env.BETTER_AUTH_URL?.startsWith("https://") ? "none" : "lax",
      secure: env.BETTER_AUTH_URL?.startsWith("https://") ?? false,
      httpOnly: true,
      path: "/",
    },
    // uncomment crossSubDomainCookies setting when ready to deploy and replace <your-workers-subdomain> with your actual workers subdomain
    // https://developers.cloudflare.com/workers/wrangler/configuration/#workersdev
    // crossSubDomainCookies: {
    //   enabled: true,
    //   domain: "<your-workers-subdomain>",
    // },
  },
});
