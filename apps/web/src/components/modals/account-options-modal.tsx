import { useState } from "react";
import { LogOut, KeyRound, Trash2, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

interface AccountOptionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteAccount: () => void;
}

interface AccountOption {
  id: "change-password" | "delete-account";
  label: string;
  description: string;
  icon: React.ReactNode;
  destructive?: boolean;
  onClick: () => void;
}

export function AccountOptionsModal({
  open,
  onOpenChange,
  onDeleteAccount,
}: AccountOptionsModalProps) {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!open) return null;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate({ to: "/" });
        },
      },
    });
    setIsSigningOut(false);
  };

  const options: AccountOption[] = [
    {
      id: "change-password",
      label: "Change password",
      description: "Update your account password",
      icon: <KeyRound className="size-5" />,
      onClick: () => {
        // TODO: open change password flow
      },
    },
    {
      id: "delete-account",
      label: "Delete account",
      description: "Permanently remove your account and data",
      icon: <Trash2 className="size-5" />,
      destructive: true,
      onClick: () => {
        onDeleteAccount();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 w-full h-full bg-black/70 backdrop-blur-sm animate-in fade-in border-0 p-0 cursor-pointer"
      />
      <div
        className="relative w-full max-w-[576px] bg-surface-thick backdrop-blur-3xl border-t sm:border border-border-glass rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-5 animate-in slide-in-from-bottom"
        style={{
          paddingBottom: `calc(1.5rem + max(var(--safe-area-inset-bottom, 0px), env(safe-area-inset-bottom, 0px)))`,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-mono-label text-text-dim uppercase">Account</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-surface-material transition-colors"
          >
            <X className="size-4 text-white" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {options.map((option) => {
            const keepsOpen = option.id === "delete-account";
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  option.onClick();
                  if (!keepsOpen) onOpenChange(false);
                }}
                className={`w-full rounded-lg border px-lg py-md text-left transition-colors flex items-center gap-md ${
                  option.destructive
                    ? "border-[#ff5a52]/20 bg-[#ff5a52]/5 text-[#ff5a52] hover:bg-[#ff5a52]/10"
                    : "border-white/10 bg-surface-deep text-white hover:bg-white/5"
                }`}
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                    option.destructive ? "bg-[#ff5a52]/10" : "bg-white/5"
                  }`}
                >
                  {option.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span
                    className={`block text-caption-xs mt-1 ${
                      option.destructive ? "text-[#ff5a52]/70" : "text-white/46"
                    }`}
                  >
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full rounded-lg border border-white/10 bg-surface-deep px-lg py-md text-left transition-colors flex items-center gap-md text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
              <LogOut className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {isSigningOut ? "Signing out..." : "Sign out"}
              </span>
              <span className="block text-caption-xs text-white/46 mt-1">
                End your current session
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
