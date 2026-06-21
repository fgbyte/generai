import heroImageUrl from "@/assets/generai-login-hero.jpg";
import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/email-verification-error")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <main className="relative isolate flex min-h-svh overflow-hidden bg-[#0b0d13] text-white">
      <img
        alt="Social media content workspace"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
        src={heroImageUrl}
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-[#0b0d13]/40 via-[#0b0d13]/80 to-[#0b0d13]" />

      <section className="mx-auto flex min-h-svh w-full max-w-[1280px] flex-col items-center justify-center px-6 py-16 sm:px-8">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/15 bg-black/35 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="mb-6">
              <h2 className="text-lg text-center font-bold">Email Verification</h2>
              <span className="size-10" />
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20">
                <AlertCircle className="h-6 w-6 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold">Verification Link Invalid</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70 max-w-xs">
                The verification link is invalid or has expired. Please try signing in to request a new verification email.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Button
                className="h-12 w-full rounded-full border border-white/30 bg-transparent font-bold text-white hover:bg-white/10"
                onClick={() => navigate({ to: "/" })}
                variant="outline"
              >
                Go to Sign In
              </Button>
            </div>
          </div>

          <footer className="mt-8 text-center">
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.28em] text-white/30">
              v1.5.13
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
