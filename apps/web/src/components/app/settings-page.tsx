import { useState } from "react";
import {
  // Bell,
  ChevronRight,
  Coins,
  // Globe,
  LogOut,
  // Moon,
  // Sparkles,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

// import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
// import { cn } from "@/lib/utils";

function SettingRow({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="group cursor-pointer flex w-full items-center gap-lg justify-between border-none bg-transparent px-xl py-lg text-left text-white transition-[background-color,transform] duration-150 active:scale-[0.992] active:bg-white/2.5"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SectionHeader({ children }: { children: string }) {
  return (
    <h2 className="px-[0.625rem] text-text-dim font-mono-label text-mono-label uppercase tracking-[0.26em]">
      {children}
    </h2>
  );
}

// function IosToggle({
//   checked,
//   onChange,
// }: {
//   checked: boolean;
//   onChange: (checked: boolean) => void;
// }) {
//   return (
//     <button
//       type="button"
//       role="switch"
//       aria-checked={checked}
//       onClick={() => onChange(!checked)}
//       className={cn(
//         "relative inline-flex h-8 w-[3.25rem] shrink-0 rounded-full border border-transparent p-0 transition-[background-color,box-shadow] duration-200",
//         checked
//           ? "bg-linear-to-b from-primary to-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_0_0_1px_rgba(59,130,246,0.28)]"
//           : "bg-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
//       )}
//     >
//       <span
//         className={cn(
//           "pointer-events-none absolute top-[2px] block h-[1.625rem] w-[1.625rem] rounded-full bg-linear-to-b from-white to-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.78)] transition-transform duration-200 ease-out",
//           checked ? "translate-x-[26px]" : "translate-x-[3px]",
//         )}
//       />
//     </button>
//   );
// }

const cardClassName =
  "overflow-hidden rounded-[1.5rem] border border-white/10 bg-linear-to-b from-[rgba(24,24,26,0.96)] to-[rgba(16,16,18,0.98)] py-0 ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_50px_rgba(0,0,0,0.35)] backdrop-blur-[18px]";

const chevronClassName =
  "size-5 shrink-0 text-white/26 transition-[transform,color] duration-150 group-hover:translate-x-[2px] group-hover:text-white/42 group-active:translate-x-[2px]";

// const appIconClassName =
//   "flex size-10 shrink-0 items-center justify-center rounded-[0.95rem] border border-[rgba(124,58,237,0.18)] bg-[radial-gradient(circle_at_25%_25%,rgba(139,92,246,0.22),transparent_70%),rgba(88,49,183,0.12)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";

export function SettingsPage() {
  // const [notifications, setNotifications] = useState(true);
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  return (
    <div className="min-h-screen bg-black font-body-md text-body-md text-white">
      <main className="max-w-container mx-auto px-xl pt-20 flex flex-col gap-xl relative z-10 pb-25">
        <section className="flex flex-col gap-md">
          <SectionHeader>Account</SectionHeader>
          <Card className={cardClassName}>
            <CardContent className="p-0">
              <SettingRow>
                <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/18 bg-[radial-gradient(circle_at_65%_25%,rgba(72,203,255,0.5),transparent_28%),radial-gradient(circle_at_25%_80%,rgba(105,66,255,0.8),transparent_40%),linear-gradient(145deg,#121212,#081324_70%,#0d3b50)] text-base font-bold tracking-[-0.04em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(5,12,24,0.45)]">
                  JS
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-headline-md font-headline-md tracking-[-0.03em] text-white">
                    Julian Sterling
                  </div>
                  <div className="mt-1 text-caption-xs text-white/42">
                    j.sterling@generai.luxe
                  </div>
                </div>
                <ChevronRight className={chevronClassName} />
              </SettingRow>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-md">
          <SectionHeader>Studio Preferences</SectionHeader>
          <Card className={cardClassName}>
            <CardContent className="p-0">
              <SettingRow>
                <div className="min-w-0 flex-1">
                  <div className="text-body-md font-body-md tracking-[-0.03em] text-white">
                    Default AI Tone
                  </div>
                  <div className="mt-1 text-[0.875rem] leading-tight font-body-md text-[#8d70ff]">
                    Creative
                  </div>
                </div>
                <ChevronRight className={chevronClassName} />
              </SettingRow>
              <Separator className="bg-white/9" />
              <SettingRow>
                <div className="min-w-0 flex-1">
                  <div className="text-body-md font-body-md tracking-[-0.03em] text-white">
                    Default Platform
                  </div>
                  <div className="mt-1 text-[0.875rem] leading-tight font-body-md text-white/46">
                    Twitter (X)
                  </div>
                </div>
                <ChevronRight className={chevronClassName} />
              </SettingRow>
            </CardContent>
          </Card>
        </section>

        {/*Subscription Section*/}
        {/*<section className="flex flex-col gap-md">
          <SectionHeader>Subscription</SectionHeader>
          <div className="overflow-hidden rounded-[1.5rem] border border-[rgba(143,113,255,0.18)] bg-[radial-gradient(circle_at_top_right,rgba(128,91,255,0.18),transparent_30%),linear-gradient(180deg,rgba(30,24,42,0.96),rgba(20,17,28,0.98))] px-xl pt-[1.35rem] pb-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_50px_rgba(0,0,0,0.32)] backdrop-blur-[18px]">
            <div className="flex items-start justify-between gap-lg">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-headline-md font-headline-md tracking-[-0.03em]">
                    Pro Plan
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[rgba(147,109,255,0.28)] bg-[rgba(120,86,239,0.22)] px-2 py-[0.18rem] text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[#b399ff]">
                    Active
                  </span>
                </div>
                <p className="max-w-[16rem] text-caption-xs leading-[1.45] text-white/58">
                  Access to GPT-4o, unlimited image generation, and priority
                  rendering.
                </p>
              </div>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[rgba(158,126,255,0.16)] bg-[radial-gradient(circle_at_35%_35%,rgba(125,92,255,0.28),rgba(125,92,255,0.08)_55%,transparent_70%),rgba(255,255,255,0.02)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Sparkles className="size-5 text-withe" />
              </div>
            </div>
            <Button className="btn-primary mt-[1.2rem]  w-full rounded-[1rem] border-none bg-linear-to-r from-[#7c5ce6] to-[#8f67ff] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_14px_28px_rgba(102,63,219,0.35)] transition-colors duration-150 hover:from-[#7656df] hover:to-[#8a63fa] text-sm sm:test-md">
              Manage Subscription
            </Button>
          </div>
        </section>*/}

        <section className="flex flex-col gap-md">
          <SectionHeader>Rewards</SectionHeader>
          <div className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-linear-to-b from-[rgba(24,24,26,0.96)] to-[rgba(16,16,18,0.98)] px-xl py-[1.1rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[18px]">
            <div className="flex items-center gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[rgba(245,158,11,0.18)] bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.16),transparent_60%),rgba(255,204,0,0.03)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <Coins className="size-7 text-secondary" />
              </div>
              <div>
                <div className="text-body-md font-body-md tracking-[-0.03em] text-white">
                  Generai Points
                </div>
                <div className="mt-1 text-[0.875rem] leading-tight font-body-md italic text-white/46">
                  Next drop in 4 days
                </div>
              </div>
            </div>
            <div className="text-right leading-none">
              <div className="text-headline-md font-headline-md tracking-[-0.04em] text-secondary">
                5,000
              </div>
              <div className="mt-1 text-caption-xs text-white/46">
                Remaining
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-md mt-10">
          {/*<SectionHeader>App Settings</SectionHeader>*/}
          <Card className={cardClassName}>
            <CardContent className="p-0">
              {/*Notifications / Appearance / Language*/}
              {/*<div className="flex w-full items-center justify-between gap-4 px-xl py-lg hover:bg-white/[0.025]">
                <div className="flex items-center gap-4">
                  <div className={appIconClassName}>
                    <Bell className="size-[17px] text-custom-violet" />
                  </div>
                  <span className="text-body-md font-body-md tracking-[-0.03em] text-white">
                    Notifications
                  </span>
                </div>
                <IosToggle
                  checked={notifications}
                  onChange={setNotifications}
                />
              </div>

              <Separator className="bg-white/9" />

              <SettingRow>
                <div className="flex items-center gap-4">
                  <div className={appIconClassName}>
                    <Moon className="size-[17px] text-custom-violet" />
                  </div>
                  <span className="text-body-md font-body-md tracking-[-0.03em] text-white">
                    Appearance
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.875rem] leading-tight font-body-md text-white/46">
                    Dark
                  </span>
                  <ChevronRight className={chevronClassName} />
                </div>
              </SettingRow>

              <Separator className="bg-white/9" />

              <SettingRow>
                <div className="flex items-center gap-4">
                  <div className={appIconClassName}>
                    <Globe className="size-[17px] text-custom-violet" />
                  </div>
                  <span className="text-body-md font-body-md tracking-[-0.03em] text-white">
                    Language
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.875rem] leading-tight font-body-md text-white/46">
                    English
                  </span>
                  <ChevronRight className={chevronClassName} />
                </div>
              </SettingRow>*/}

              <Separator className="bg-white/9" />

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full cursor-pointer items-center justify-center gap-[0.65rem] px-xl py-[1.2rem] border-none bg-transparent transition-[background-color,transform] duration-150 hover:bg-[#ff5a52]/5 active:scale-[0.992] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="size-5 text-[#ff5a52]" />
                <span className="font-body-md text-body-md text-[#ff5a52]">
                  {isSigningOut ? "Signing out..." : "Sign Out"}
                </span>
              </button>
            </CardContent>
          </Card>
        </section>

        <div className="mt-md text-center opacity-90">
          <p className="font-mono-label text-[10px] uppercase tracking-[0.28em] text-white/60">
            Generai Luxe v2.4.0
          </p>
          <p className="mt-[0.45rem] text-[10px] font-body-md text-white/42">
            Made for the creators of tomorrow.
          </p>
        </div>
      </main>
    </div>
  );
}
