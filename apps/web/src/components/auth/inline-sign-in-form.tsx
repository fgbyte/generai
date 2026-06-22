import { useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

/**
 * Email + password sign-in form. Uses TanStack Form for validation
 * (email format, password ≥ 8 chars) and Better-Auth for the actual
 * sign-in call. On success the user is sent to /app; on a verification-
 * related error we redirect to /verify-email so they can resend the
 * confirmation email.
 */
export function InlineSignInForm() {
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
            const errorMessage = error.error.message || error.error.statusText || "";

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
