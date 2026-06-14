import { createFileRoute } from "@tanstack/react-router";
import { env } from "@generai/env/web";
import { hc } from "hono/client";
import { useQuery } from "@tanstack/react-query";
import type { AppType } from "@server/index";

import { useState } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActivityHistoryLink } from "@/components/app/activity-history-link";
import { ImageUpload } from "@/components/app/image-upload";

import { CustomSelect } from "@/components/custom-select";
import { PointsBalanceCard } from "@/components/app/points-balance-card";
import { ProTipBanner } from "@/components/app/pro-tip-banner";
import { Instagram } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({
  component: RouteComponent,
});

const CONTENT_TYPES = [
  // { value: "thread", icon: <Twitter />, label: "Thread Format" },
  // { value: "linkedin", icon: <Linkedin />, label: "LinkedIn Post" },
  { value: "instagram", icon: <Instagram />, label: "Instagram Caption" },
];

const client = hc<AppType>(env.VITE_SERVER_URL, {
  init: { credentials: "include" },
});

function RouteComponent() {
  const { data } = useQuery({
    queryKey: ["points"],
    queryFn: async () => {
      const res = await client.api.generate.points.$get();
      if (!res.ok) throw new Error("Failed to fetch points");
      return res.json();
    },
  });
  const [contentType, setContentType] = useState("instagram");
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();
  return (
    <div className="font-body-md text-body-md min-h-screen bg-black text-white">
      <main className="max-w-container mx-auto px-lg flex flex-col gap-lg relative z-10">
        {/* Points Card */}
        <PointsBalanceCard
          balance={data?.points ?? 0}
          onGetMore={() => {
            /* TODO: navigate to points purchase */
            navigate({ to: "/app/settings" });
          }}
        />

        {/* Generation Form */}
        <section className="mt-md flex flex-col gap-lg">
          {/* Content Type Select */}
          <div className="flex flex-col gap-sm">
            <Label className="text-mono-label text-text-dim pl-xs">Content Type</Label>
            <CustomSelect value={contentType} onChange={setContentType} options={CONTENT_TYPES} />
          </div>

          {/* Instagram Upload */}
          {contentType === "instagram" && <ImageUpload />}

          {/* Prompt Textarea */}
          <div className="flex flex-col gap-sm">
            <Label className="text-mono-label text-text-dim pl-xs">Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to create..."
              className="bg-surface-form border-none text-white placeholder:text-text-muted focus:ring-2 focus:ring-primary resize-none rounded-lg px-lg py-md h-32"
            />
          </div>

          {/* Activity Link */}
          <ActivityHistoryLink />

          {/* Pro Tip Banner */}
          <ProTipBanner tip="Specificity matters." highlight='"under 280 characters"' />

          {/* Primary Action */}
          <Link
            to="/app/automate"
            className="btn-primary mt-[1.2rem] h-[3.0625rem] w-full rounded-[1rem] border-none bg-linear-to-r from-[#7c5ce6] to-[#8f67ff] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_14px_28px_rgba(102,63,219,0.35)] transition-colors duration-150 hover:from-[#7656df] hover:to-[#8a63fa] text-sm sm:test-md"
          >
            Generate Content (5 points)
          </Link>
        </section>
      </main>
    </div>
  );
}
