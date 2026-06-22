import { useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

interface InlineSignUpFormProps {
  onSignedUp: () => void;
}

/**
 * Name + email + password sign-up form. After successful registration we
 * send the user straight to /verify-email so they can confirm their
 * inbox before being allowed into the app.
 */
export function InlineSignUpForm({ onSignedUp }: InlineSignUpFormProps) {
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
