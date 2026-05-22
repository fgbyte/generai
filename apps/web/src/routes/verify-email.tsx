import heroImageUrl from "@/assets/generai-login-hero.jpg";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search) => ({
    email: (search.email as string) || "",
  }),
  component: RouteComponent,
});

const COOLDOWN_SECONDS = 60;

function RouteComponent() {
  const navigate = useNavigate();
  const { email } = useSearch({ from: "/verify-email" });
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0 || sending) return;

    setSending(true);
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: "/",
      });
      toast.success("Verification email sent!");
      setCooldown(COOLDOWN_SECONDS);
    } catch {
      toast.error("Failed to send verification email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Si no hay email, no mostramos el resend
  const showResend = !!email;

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
            {/* Header with back button */}
            <div className="mb-6">
              <h2 className="text-lg text-center font-bold">Verify Email</h2>
              <span className="size-10" />
            </div>

            {/* Icon + Text */}
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#6d5df2]/20">
                <Mail className="h-6 w-6 text-[#6d5df2]" />
              </div>
              <h3 className="text-xl font-bold">Check your email</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70 max-w-xs">
                {email ? (
                  <>
                    We've sent a verification link to{" "}
                    <span className="font-semibold text-white">{email}</span>. Please click the link
                    to verify your account before signing in.
                  </>
                ) : (
                  "We've sent a verification link to your email address. Please click the link to verify your account before signing in."
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3">
              {showResend && (
                <Button
                  className="h-12 w-full rounded-full bg-[#6d5df2] font-bold text-white shadow-lg shadow-black/30 hover:bg-[#7d70f4]"
                  disabled={cooldown > 0 || sending}
                  onClick={handleResend}
                >
                  {sending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Sending...
                    </span>
                  ) : cooldown > 0 ? (
                    `Resend in ${cooldown}s`
                  ) : (
                    "Resend verification email"
                  )}
                </Button>
              )}
              <Button
                className="h-12 w-full rounded-full border border-white/30 bg-transparent font-bold text-white hover:bg-white/10"
                onClick={() => navigate({ to: "/" })}
                variant="outline"
              >
                Back to Sign In
              </Button>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 text-center">
            <p className="text-xs leading-relaxed text-white/50">
              Didn't receive the email? Check your spam folder.
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
