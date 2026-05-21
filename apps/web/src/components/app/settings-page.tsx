import { useState } from "react";
import {
  Bell,
  ChevronRight,
  Globe,
  LogOut,
  Moon,
  Sparkles,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
      className="flex items-center p-lg active:bg-white/5 transition-colors cursor-pointer group w-full text-left border-none bg-transparent"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SectionHeader({ children }: { children: string }) {
  return (
    <h2 className="px-sm mb-sm text-text-dim font-mono-label text-mono-label uppercase tracking-widest">
      {children}
    </h2>
  );
}

function IosToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full border-none transition-colors duration-300",
        checked ? "bg-[#5E5CE6]" : "bg-white/20",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-[27px] w-[27px] rounded-full bg-white shadow-sm transition-transform duration-300",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
          "mt-[2px]",
        )}
      />
    </button>
  );
}

export function SettingsPage() {
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="font-body-md text-body-md pb-section min-h-screen bg-black text-white">
      <main className="max-w-container mx-auto px-lg pt-[100px] flex flex-col gap-lg relative z-10 pb-xxl">
        {/* Section: Account */}
        <div className="mb-xxl">
          <SectionHeader>Account</SectionHeader>
        <Card className="bg-surface-material border-[0.5px] border-border-glass rounded-xl py-0 gap-0 ring-0">
          <CardContent className="p-0">
            <SettingRow>
              <div className="w-12 h-12 rounded-full overflow-hidden mr-md border border-border-glass flex items-center justify-center bg-custom-violet/20 text-custom-violet font-headline-md text-headline-md">
                JS
              </div>
              <div className="flex-grow">
                <div className="font-headline-md text-headline-md">
                  Julian Sterling
                </div>
                <div className="text-text-dim text-caption-xs">
                  j.sterling@generai.luxe
                </div>
              </div>
              <ChevronRight className="size-5 text-text-muted group-active:translate-x-1 transition-transform" />
            </SettingRow>
          </CardContent>
        </Card>
        </div>

        {/* Section: Studio Preferences */}
        <div className="mb-xxl">
          <SectionHeader>Studio Preferences</SectionHeader>
        <Card className="bg-surface-material border-[0.5px] border-border-glass rounded-xl py-0 gap-0 ring-0">
          <CardContent className="p-0">
            <SettingRow>
              <div className="flex-grow">
                <div className="text-body-md">Default AI Tone</div>
                <div className="text-custom-violet text-caption-xs">
                  Creative
                </div>
              </div>
              <ChevronRight className="size-5 text-text-muted group-active:translate-x-1 transition-transform" />
            </SettingRow>
            <Separator className="bg-border-glass" />
            <SettingRow>
              <div className="flex-grow">
                <div className="text-body-md">Default Platform</div>
                <div className="text-text-dim text-caption-xs">Twitter (X)</div>
              </div>
              <ChevronRight className="size-5 text-text-muted group-active:translate-x-1 transition-transform" />
            </SettingRow>
          </CardContent>
        </Card>
        </div>

        {/* Section: Subscription */}
        <div className="mb-xxl">
          <SectionHeader>Subscription</SectionHeader>
          <div
            className="bg-surface-material border-[0.5px] border-border-glass rounded-xl p-lg"
            style={{
              background:
                "linear-gradient(135deg, rgba(142, 108, 247, 0.15) 0%, rgba(0, 0, 0, 0) 100%)",
            }}
          >
            <div className="flex justify-between items-start mb-lg">
              <div>
                <div className="flex items-center gap-xs mb-xxs">
                  <span className="text-headline-md font-headline-md">
                    Pro Plan
                  </span>
                  <span className="bg-custom-violet/20 text-custom-violet text-[10px] px-sm py-[2px] rounded-full font-bold uppercase tracking-wider border border-custom-violet/30">
                    Active
                  </span>
                </div>
                <p className="text-text-dim text-caption-xs leading-relaxed max-w-[240px]">
                  Access to GPT-4o, unlimited image generation, and priority
                  rendering.
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-custom-violet/10 flex items-center justify-center border border-custom-violet/20">
                <Sparkles className="size-5 text-custom-violet" />
              </div>
            </div>
            <Button className="w-full h-[52px] bg-custom-violet text-white font-button-md text-button-md rounded-xl active:scale-[0.98] transition-transform duration-200 border-none hover:bg-custom-violet/90">
              Manage Subscription
            </Button>
          </div>
        </div>

        {/* Section: Rewards */}
        <div className="mb-xxl">
          <SectionHeader>Rewards</SectionHeader>
          <div className="bg-surface-material border-[0.5px] border-border-glass rounded-xl p-lg flex items-center justify-between">
            <div className="flex items-center gap-md">
              <div className="w-10 h-10 rounded-full bg-custom-gold/10 flex items-center justify-center border border-custom-gold/20">
                <Coins className="size-5 text-custom-gold" />
              </div>
              <div>
                <div className="text-body-md">Generai Points</div>
                <div className="text-text-dim text-caption-xs italic">
                  Next drop in 4 days
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-custom-gold font-headline-md text-headline-md">
                5,000
              </div>
              <div className="text-text-dim text-caption-xs">Remaining</div>
            </div>
          </div>
        </div>

        {/* Section: App Settings */}
        <div className="mb-xxl">
          <SectionHeader>App Settings</SectionHeader>
        <Card className="bg-surface-material border-[0.5px] border-border-glass rounded-xl py-0 gap-0 ring-0">
          <CardContent className="p-0">
            {/* Notifications Row */}
            <div className="flex items-center justify-between p-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg bg-custom-violet/10 flex items-center justify-center mr-md">
                  <Bell className="size-4 text-custom-violet" />
                </div>
                <span className="font-body-md text-body-md">Notifications</span>
              </div>
              <IosToggle checked={notifications} onChange={setNotifications} />
            </div>

            <Separator className="bg-border-glass" />

            {/* Appearance Row */}
            <SettingRow>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg bg-custom-violet/10 flex items-center justify-center mr-md">
                  <Moon className="size-4 text-custom-violet" />
                </div>
                <span className="font-body-md text-body-md">Appearance</span>
              </div>
              <div className="flex items-center gap-xs">
                <span className="text-text-dim text-caption-xs">Dark</span>
                <ChevronRight className="size-5 text-text-muted group-active:translate-x-1 transition-transform" />
              </div>
            </SettingRow>

            <Separator className="bg-border-glass" />

            {/* Language Row */}
            <SettingRow>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg bg-custom-violet/10 flex items-center justify-center mr-md">
                  <Globe className="size-4 text-custom-violet" />
                </div>
                <span className="font-body-md text-body-md">Language</span>
              </div>
              <div className="flex items-center gap-xs">
                <span className="text-text-dim text-caption-xs">English</span>
                <ChevronRight className="size-5 text-text-muted group-active:translate-x-1 transition-transform" />
              </div>
            </SettingRow>

            <Separator className="bg-border-glass" />

            {/* Sign Out Row */}
            <div className="flex items-center justify-center p-lg active:bg-red-500/10 transition-colors cursor-pointer group gap-sm">
              <LogOut className="size-5 text-red-500" />
              <span className="font-body-md text-body-md text-red-500">
                Sign Out
              </span>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Footer */}
        <div className="mt-xxl mb-xl text-center space-y-1 opacity-40">
          <p className="font-mono-label text-[10px] uppercase tracking-[0.2em] text-white">
            Generai Luxe v2.4.0
          </p>
          <p className="text-[10px] font-medium text-white/80">
            Made for the creators of tomorrow.
          </p>
        </div>
      </main>
    </div>
  );
}
