import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActivityHistoryLink } from "@/components/dashboard/activity-history-link";
import { BottomNavBar } from "@/components/bottom-nav-bar";
import { CustomSelect } from "@/components/custom-select";
import { PointsBalanceCard } from "@/components/dashboard/points-balance-card";
import { ProTipBanner } from "@/components/dashboard/pro-tip-banner";
import { TopAppBar } from "@/components/top-app-bar";
import { Instagram, Linkedin, Twitter, Upload } from "lucide-react";

const CONTENT_TYPES = [
  { value: "thread", icon: <Twitter />, label: "Thread Format" },
  { value: "linkedin", icon: <Linkedin />, label: "LinkedIn Post" },
  { value: "instagram", icon: <Instagram />, label: "Instagram Caption" },
];

export function StudioPage() {
  const [contentType, setContentType] = useState("instagram");
  const [prompt, setPrompt] = useState("");

  return (
    <div className="font-body-md text-body-md pb-section min-h-screen bg-black text-white">
      <TopAppBar />

      <main className="max-w-container mx-auto px-lg pt-[100px] flex flex-col gap-lg relative z-10 pb-xxl">
        {/* Points Card */}
        <PointsBalanceCard
          balance={5000} //get-points
          onGetMore={() => {
            /* TODO: navigate to points purchase */
          }}
        />

        {/* Activity Link */}
        <ActivityHistoryLink />

        {/* Generation Form */}
        <section className="mt-md flex flex-col gap-lg">
          {/* Content Type Select */}
          <div className="flex flex-col gap-sm">
            <Label className="text-mono-label text-text-dim pl-xs">
              Content Type
            </Label>
            <CustomSelect
              value={contentType}
              onChange={setContentType}
              options={CONTENT_TYPES}
            />
          </div>

          {/* Instagram Upload */}
          {contentType === "instagram" && (
            <Button
              variant="outline"
              className="w-full border-dashed border-white/20 text-white/60 hover:bg-white/5 hover:text-white py-md rounded-lg gap-2"
            >
              <Upload className="size-5" />
              Upload Image
            </Button>
          )}

          {/* Prompt Textarea */}
          <div className="flex flex-col gap-sm">
            <Label className="text-mono-label text-text-dim pl-xs">
              Prompt
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to create..."
              className="bg-surface-form border-none text-white placeholder:text-text-muted focus:ring-2 focus:ring-primary resize-none rounded-lg px-lg py-md h-32"
            />
          </div>

          {/* Pro Tip Banner */}
          <ProTipBanner
            tip="Specificity matters."
            highlight='"under 280 characters"'
          />

          {/* Primary Action */}
          <Button className="w-full bg-primary text-white py-md rounded-lg active:opacity-80 transition-opacity mt-sm">
            Generate Content (5 points)
          </Button>
        </section>
      </main>

      <BottomNavBar />
    </div>
  );
}
