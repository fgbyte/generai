import type { AuthMode } from "@/components/auth/types";
import { InlineSignInForm } from "@/components/auth/inline-sign-in-form";
import { InlineSignUpForm } from "@/components/auth/inline-sign-up-form";

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
