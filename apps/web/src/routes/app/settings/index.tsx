import { useState } from "react";
import { ChevronRight, Coins, LogOut, Sparkles } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hc } from "hono/client";
import { env } from "@generai/env/web";
import type { AppType } from "@server/index";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";

const client = hc<AppType>(env.VITE_SERVER_URL, {
  init: { credentials: "include" },
});

const AI_TONES = ["Creative", "Professional", "Casual"] as const;
const PLATFORMS = ["Twitter (X)", "Instagram", "LinkedIn"] as const;

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const Route = createFileRoute("/app/settings/")({
  component: RouteComponent,
});

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

const cardClassName =
  "overflow-hidden rounded-[1.5rem] border border-white/10 bg-linear-to-b from-[rgba(24,24,26,0.96)] to-[rgba(16,16,18,0.98)] py-0 ring-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_50px_rgba(0,0,0,0.35)] backdrop-blur-[18px]";

const chevronClassName =
  "size-5 shrink-0 text-white/26 transition-[transform,color] duration-150 group-hover:translate-x-[2px] group-hover:text-white/42 group-active:translate-x-[2px]";

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [openSheet, setOpenSheet] = useState<"aiTone" | "defaultPlatform" | null>(
    null,
  );

  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const { data: subData } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await client.api.user.subscription.$get();
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
  });

  const { data: prefsData } = useQuery({
    queryKey: ["preferences"],
    queryFn: async () => {
      const res = await client.api.user.preferences.$get();
      if (!res.ok) throw new Error("Failed to fetch preferences");
      return res.json();
    },
  });

  const updatePrefsMutation = useMutation({
    mutationFn: async (data: {
      aiTone: "Creative" | "Professional" | "Casual";
      defaultPlatform: "Twitter (X)" | "Instagram" | "LinkedIn";
    }) => {
      const res = await client.api.user.preferences.$put({ json: data });
      if (!res.ok) throw new Error("Failed to update preferences");
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
  });

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

  const userName = session?.user.name ?? "";
  const userEmail = session?.user.email ?? "";
  const userPoints = session?.user.points ?? 0;
  const subscription = subData?.subscription ?? null;
  const preferences = prefsData?.preferences ?? null;
  const currentAiTone = preferences?.aiTone ?? "Creative";
  const currentPlatform = preferences?.defaultPlatform ?? "Twitter (X)";

  return (
    <div className="bg-black font-body-md text-body-md text-white">
      <main className="max-w-container mx-auto px-xl flex flex-col gap-xl relative z-10">
        {/* Account Section */}
        <section className="flex flex-col gap-md">
          <SectionHeader>Account</SectionHeader>
          <Card className={cardClassName}>
            <CardContent className="p-0">
              <SettingRow>
                <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/18 bg-[radial-gradient(circle_at_65%_25%,rgba(72,203,255,0.5),transparent_28%),radial-gradient(circle_at_25%_80%,rgba(105,66,255,0.8),transparent_40%),linear-gradient(145deg,#121212,#081324_70%,#0d3b50)] text-base font-bold tracking-[-0.04em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_24px_rgba(5,12,24,0.45)]">
                  {sessionLoading ? (
                    <Skeleton className="size-full" />
                  ) : (
                    initials(userName)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {sessionLoading ? (
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3.5 w-48" />
                    </div>
                  ) : (
                    <>
                      <div className="text-headline-md font-headline-md tracking-[-0.03em] text-white">
                        {userName}
                      </div>
                      <div className="mt-1 text-caption-xs text-white/42">
                        {userEmail}
                      </div>
                    </>
                  )}
                </div>
              </SettingRow>
            </CardContent>
          </Card>
        </section>

        {/* Studio Preferences Section */}
        <section className="flex flex-col gap-md">
          <SectionHeader>Studio Preferences</SectionHeader>
          <Card className={cardClassName}>
            <CardContent className="p-0">
              <SettingRow
                onClick={() => setOpenSheet("aiTone")}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-body-md font-body-md tracking-[-0.03em] text-white">
                    Default AI Tone
                  </div>
                  <div className="mt-1 text-[0.875rem] leading-tight font-body-md text-[#8d70ff]">
                    {currentAiTone}
                  </div>
                </div>
                <ChevronRight className={chevronClassName} />
              </SettingRow>
              <Separator className="bg-white/9" />
              <SettingRow
                onClick={() => setOpenSheet("defaultPlatform")}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-body-md font-body-md tracking-[-0.03em] text-white">
                    Default Platform
                  </div>
                  <div className="mt-1 text-[0.875rem] leading-tight font-body-md text-white/46">
                    {currentPlatform}
                  </div>
                </div>
                <ChevronRight className={chevronClassName} />
              </SettingRow>
            </CardContent>
          </Card>
        </section>

        {/* Subscription Section */}
        <section className="flex flex-col gap-md">
          <SectionHeader>Subscription</SectionHeader>
          <div className="overflow-hidden rounded-[1.5rem] border border-[rgba(143,113,255,0.18)] bg-[radial-gradient(circle_at_top_right,rgba(128,91,255,0.18),transparent_30%),linear-gradient(180deg,rgba(30,24,42,0.96),rgba(20,17,28,0.98))] px-xl pt-[1.35rem] pb-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_50px_rgba(0,0,0,0.32)] backdrop-blur-[18px]">
            <div className="flex items-start justify-between gap-lg">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-headline-md font-headline-md tracking-[-0.03em]">
                    {subscription?.plan ?? "Free Plan"}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[rgba(147,109,255,0.28)] bg-[rgba(120,86,239,0.22)] px-2 py-[0.18rem] text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[#b399ff]">
                    {subscription?.status ?? "Inactive"}
                  </span>
                </div>
                <p className="max-w-[16rem] text-caption-xs leading-[1.45] text-white/58">
                  {subscription
                    ? "Access to GPT-4o, unlimited image generation, and priority rendering."
                    : "Upgrade to unlock premium AI models, unlimited generation, and more."}
                </p>
              </div>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[rgba(158,126,255,0.16)] bg-[radial-gradient(circle_at_35%_35%,rgba(125,92,255,0.28),rgba(125,92,255,0.08)_55%,transparent_70%),rgba(255,255,255,0.02)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Sparkles className="size-5 text-withe" />
              </div>
            </div>
            <Button
              onClick={() => toast("Próximamente")}
              className="btn-primary mt-[1.2rem]  w-full rounded-[1rem] border-none bg-linear-to-r from-[#7c5ce6] to-[#8f67ff] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_14px_28px_rgba(102,63,219,0.35)] transition-colors duration-150 hover:from-[#7656df] hover:to-[#8a63fa] text-sm sm:test-md"
            >
              Manage Subscription
            </Button>
          </div>
        </section>

        {/* Rewards Section */}
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
                {userPoints.toLocaleString()}
              </div>
              <div className="mt-1 text-caption-xs text-white/46">Remaining</div>
            </div>
          </div>
        </section>

        {/* Sign Out */}
        <section className="flex flex-col gap-md mt-10">
          <Card className={cardClassName}>
            <CardContent className="p-0">
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

        {/* Footer */}
        <div className="mt-md text-center opacity-90">
          <p className="font-mono-label text-[10px] uppercase tracking-[0.28em] text-white/60">
            Generai Luxe v2.4.0
          </p>
          <p className="mt-[0.45rem] text-[10px] font-body-md text-white/42">
            Made for the creators of tomorrow.
          </p>
        </div>
      </main>

      {/* Preference Edit Sheet */}
      <Sheet open={openSheet !== null} onOpenChange={(open) => { if (!open) setOpenSheet(null); }}>
        <SheetContent side="bottom" className="bg-popover border-white/10">
          <SheetHeader>
            <SheetTitle>
              {openSheet === "aiTone" ? "Default AI Tone" : "Default Platform"}
            </SheetTitle>
            <SheetDescription>
              {openSheet === "aiTone"
                ? "Select the default tone for AI-generated content."
                : "Select your default social media platform."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-3">
            {openSheet === "aiTone" &&
              AI_TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  disabled={updatePrefsMutation.isPending}
                  onClick={() => {
                    updatePrefsMutation.mutate(
                      {
                        aiTone: tone,
                        defaultPlatform: currentPlatform as
                          | "Twitter (X)"
                          | "Instagram"
                          | "LinkedIn",
                      },
                      {
                        onSuccess: () => {
                          toast.success("AI tone updated");
                          setOpenSheet(null);
                        },
                      },
                    );
                  }}
                  className={`w-full rounded-lg border px-lg py-md text-left text-sm font-medium transition-colors ${
                    currentAiTone === tone
                      ? "border-[#7c5ce6] bg-[#7c5ce6]/15 text-white"
                      : "border-white/10 bg-transparent text-white/70 hover:bg-white/5"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {tone}
                </button>
              ))}
            {openSheet === "defaultPlatform" &&
              PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  disabled={updatePrefsMutation.isPending}
                  onClick={() => {
                    updatePrefsMutation.mutate(
                      {
                        aiTone: currentAiTone as
                          | "Creative"
                          | "Professional"
                          | "Casual",
                        defaultPlatform: platform,
                      },
                      {
                        onSuccess: () => {
                          toast.success("Platform updated");
                          setOpenSheet(null);
                        },
                      },
                    );
                  }}
                  className={`w-full rounded-lg border px-lg py-md text-left text-sm font-medium transition-colors ${
                    currentPlatform === platform
                      ? "border-[#7c5ce6] bg-[#7c5ce6]/15 text-white"
                      : "border-white/10 bg-transparent text-white/70 hover:bg-white/5"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {platform}
                </button>
              ))}
            <SheetClose
              type="button"
              className="mt-2 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent px-lg py-md text-sm text-white/50 hover:bg-white/5 transition-colors"
            >
              Cancel
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
