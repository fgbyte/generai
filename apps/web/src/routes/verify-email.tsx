import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

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
    <Card className="w-full max-w-md mx-auto mt-10">
      <CardHeader className="items-center text-center justify-items-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
          <Mail className="h-6 w-6 text-primary mx-auto my-auto" />
        </div>
        <CardTitle className="text-[21px] font-bold leading-[1.4] tracking-[-0.5px]">
          Check your email
        </CardTitle>
        <CardDescription className="text-sm">
          {email ? (
            <>
              We've sent a verification link to{" "}
              <span className="font-semibold">{email}</span>. Please click the
              link to verify your account before signing in.
            </>
          ) : (
            "We've sent a verification link to your email address. Please click the link to verify your account before signing in."
          )}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex-col gap-3">
        {showResend && (
          <Button
            className="w-full bg-primary text-on-primary rounded-md h-10 text-sm font-bold"
            onClick={handleResend}
            disabled={cooldown > 0 || sending}
          >
            {sending
              ? "Sending..."
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend verification email"}
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full text-link-teal hover:underline"
          onClick={() => navigate({ to: "/login" })}
        >
          Back to Sign In
        </Button>
      </CardFooter>
    </Card>
  );
}
