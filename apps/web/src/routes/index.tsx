import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";

import heroImageUrl from "@/assets/generai-login-hero.jpg";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { AuthPanel } from "@/components/auth/auth-panel";
import type { AuthMode } from "@/components/auth/types";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await authClient.getSession().catch(() => null);

    if (session?.data) {
      throw redirect({
        to: "/app",
      });
    }
  },
  component: HomeComponent,
});

function HomeComponent() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);

  return (
    <main className="relative isolate flex min-h-svh overflow-hidden bg-[#0b0d13] text-white">
      <img
        alt="Social media content workspace"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
        src={heroImageUrl}
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-[#0b0d13]/40 via-[#0b0d13]/80 to-[#0b0d13]" />

      <section className="mx-auto flex min-h-svh w-full max-w-[1280px] flex-col items-center justify-between px-6 py-16 sm:px-8">
        {authMode ? null : (
          <header className="mt-6 w-full text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-white/55">
              GenerAI
            </p>
            <h1 className="mx-auto max-w-[680px] text-4xl font-bold leading-tight tracking-normal sm:text-5xl">
              Social Media Made Simple
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/80">
              GenerAI empowers you to craft captivating social media posts and streamline your
              workflow in seconds
            </p>
          </header>
        )}

        <div className={authMode ? "mb-2 w-full max-w-md" : "mb-6 w-full max-w-md"}>
          {authMode ? (
            <AuthPanel mode={authMode} onBack={() => setAuthMode(null)} />
          ) : (
            <div className="flex flex-col gap-4">
              <Button
                className="h-16 rounded-full bg-[#6d5df2] text-lg font-bold text-white shadow-lg shadow-black/30 hover:bg-[#7d70f4]"
                onClick={() => setAuthMode("sign-in")}
                // onClick={() => navigate({ to: "/app" })}
              >
                Get Started
              </Button>
              <Button
                className="h-16 rounded-full border border-white/30 bg-transparent text-lg font-bold text-white hover:bg-white/10"
                onClick={() => setAuthMode("sign-up")}
                variant="outline"
              >
                Create account
              </Button>
            </div>
          )}

          <footer className="mt-8 text-center">
            <p className="text-xs leading-relaxed text-white/50">
              By continuing, you accept our <br />
              <a className="font-bold text-white hover:underline" href="/">
                Terms and Conditions
              </a>
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.28em] text-white/30">
              v1.5.13
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
