import { toast } from "sonner";

import type { AuthMode } from "@/components/auth/types";
import { InlineSignInForm } from "@/components/auth/inline-sign-in-form";
import { InlineSignUpForm } from "@/components/auth/inline-sign-up-form";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

interface AuthPanelProps {
  mode: AuthMode;
  onBack: () => void;
}

/**
 * Glassy card that hosts either the inline sign-in or sign-up form.
 * Exposes a top-row back button that returns the user to the landing CTA
 * pair via `onBack`.
 */
export function AuthPanel({ mode, onBack }: AuthPanelProps) {
  return (
    <div className="rounded-3xl border border-white/15 bg-black/35 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <button
          aria-label="Go back"
          className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
          onClick={onBack}
          type="button"
        >
          <BackArrowIcon />
        </button>
        <h2 className="text-lg font-bold">{mode === "sign-in" ? "Sign in" : "Sign Up"}</h2>
        <span className="size-10" />
      </div>

      <Button
        className="h-12 w-full rounded-full border border-white/15 bg-white/10 font-bold text-white hover:bg-white/20"
        onClick={async () => {
          try {
            await authClient.signIn.social({
              provider: "google",
              callbackURL: `${import.meta.env.VITE_APP_URL}/app`,
            });
          } catch {
            toast.error("Error al iniciar sesión con Google");
          }
        }}
        type="button"
        variant="outline"
      >
        <GoogleIcon className="mr-2 size-5" />
        Continuar con Google
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/15" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-2 text-white/50">o</span>
        </div>
      </div>

      {mode === "sign-in" ? <InlineSignInForm /> : <InlineSignUpForm onSignedUp={onBack} />}
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
