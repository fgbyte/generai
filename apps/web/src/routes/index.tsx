import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import heroImageUrl from "@/assets/generai-login-hero.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

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

type AuthMode = "sign-in" | "sign-up";

function HomeComponent() {
  const navigate = useNavigate({ from: "/" });
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
              GenerAI empowers you to craft captivating social media posts and
              streamline your workflow in seconds
            </p>
          </header>
        )}

        <div
          className={authMode ? "mb-2 w-full max-w-md" : "mb-6 w-full max-w-md"}
        >
          {authMode ? (
            <AuthPanel mode={authMode} onBack={() => setAuthMode(null)} />
          ) : (
            <div className="flex flex-col gap-4">
              <Button
                className="h-16 rounded-full bg-[#6d5df2] text-lg font-bold text-white shadow-lg shadow-black/30 hover:bg-[#7d70f4]"
                // onClick={() => setAuthMode("sign-in")}
                onClick={() => navigate({ to: "/app" })}
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

function AuthPanel({ mode, onBack }: { mode: AuthMode; onBack: () => void }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-black/35 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <button
          aria-label="Go back"
          className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-lg font-bold">
          {mode === "sign-in" ? "Sign in" : "Sign Up"}
        </h2>
        <span className="size-10" />
      </div>

      {mode === "sign-in" ? (
        <InlineSignInForm />
      ) : (
        <InlineSignUpForm onSignedUp={onBack} />
      )}
    </div>
  );
}

function InlineSignInForm() {
  const navigate = useNavigate({ from: "/" });

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      const userEmail = value.email;

      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            toast.success("Sign in successful");
            navigate({ to: "/app" });
          },
          onError: (error) => {
            const errorMessage =
              error.error.message || error.error.statusText || "";

            if (
              errorMessage.toLowerCase().includes("email") &&
              errorMessage.toLowerCase().includes("verif")
            ) {
              navigate({ to: "/verify-email", search: { email: userEmail } });
              return;
            }

            toast.error(errorMessage);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field name="email">
        {(field) => (
          <div className="space-y-2">
            <Label className="text-white/75" htmlFor={field.name}>
              Email
            </Label>
            <Input
              aria-invalid={!!field.state.meta.errors.length}
              className="h-12 rounded-full border-white/15 bg-white/10 px-5 text-white placeholder:text-white/35"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              type="email"
              value={field.state.value}
            />
            {field.state.meta.errors.map((error) => (
              <p className="text-xs text-red-200" key={error?.message}>
                {error?.message}
              </p>
            ))}
          </div>
        )}
      </form.Field>
      <form.Field name="password">
        {(field) => (
          <div className="space-y-2">
            <Label className="text-white/75" htmlFor={field.name}>
              Password
            </Label>
            <Input
              aria-invalid={!!field.state.meta.errors.length}
              className="h-12 rounded-full border-white/15 bg-white/10 px-5 text-white placeholder:text-white/35"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              type="password"
              value={field.state.value}
            />
            {field.state.meta.errors.map((error) => (
              <p className="text-xs text-red-200" key={error?.message}>
                {error?.message}
              </p>
            ))}
          </div>
        )}
      </form.Field>
      <form.Subscribe>
        {(state) => (
          <Button
            className="mt-2 h-12 w-full rounded-full bg-[#6d5df2] font-bold text-white hover:bg-[#7d70f4]"
            disabled={!state.canSubmit || state.isSubmitting}
            type="submit"
          >
            {state.isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}

function InlineSignUpForm({ onSignedUp }: { onSignedUp: () => void }) {
  const navigate = useNavigate({ from: "/" });

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
        },
        {
          onSuccess: () => {
            toast.success("Account created! Please verify your email.");
            onSignedUp();
            navigate({ to: "/verify-email", search: { email: value.email } });
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => (
          <div className="space-y-2">
            <Label className="text-white/75" htmlFor={field.name}>
              Name
            </Label>
            <Input
              aria-invalid={!!field.state.meta.errors.length}
              className="h-12 rounded-full border-white/15 bg-white/10 px-5 text-white placeholder:text-white/35"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              value={field.state.value}
            />
            {field.state.meta.errors.map((error) => (
              <p className="text-xs text-red-200" key={error?.message}>
                {error?.message}
              </p>
            ))}
          </div>
        )}
      </form.Field>
      <form.Field name="email">
        {(field) => (
          <div className="space-y-2">
            <Label className="text-white/75" htmlFor={field.name}>
              Email
            </Label>
            <Input
              aria-invalid={!!field.state.meta.errors.length}
              className="h-12 rounded-full border-white/15 bg-white/10 px-5 text-white placeholder:text-white/35"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              type="email"
              value={field.state.value}
            />
            {field.state.meta.errors.map((error) => (
              <p className="text-xs text-red-200" key={error?.message}>
                {error?.message}
              </p>
            ))}
          </div>
        )}
      </form.Field>
      <form.Field name="password">
        {(field) => (
          <div className="space-y-2">
            <Label className="text-white/75" htmlFor={field.name}>
              Password
            </Label>
            <Input
              aria-invalid={!!field.state.meta.errors.length}
              className="h-12 rounded-full border-white/15 bg-white/10 px-5 text-white placeholder:text-white/35"
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              type="password"
              value={field.state.value}
            />
            {field.state.meta.errors.map((error) => (
              <p className="text-xs text-red-200" key={error?.message}>
                {error?.message}
              </p>
            ))}
          </div>
        )}
      </form.Field>
      <form.Subscribe>
        {(state) => (
          <Button
            className="mt-2 h-12 w-full rounded-full bg-[#6d5df2] font-bold text-white hover:bg-[#7d70f4]"
            disabled={!state.canSubmit || state.isSubmitting}
            type="submit"
          >
            {state.isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Creating...
              </span>
            ) : (
              "Sign Up"
            )}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
