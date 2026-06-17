import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type CommingSoonMockProps = {
  label: string;
  icon: LucideIcon;
  /**
   * Optional draft caption rendered as a preview block above the
   * "Coming Soon" notice. Used by the history flow to surface the loaded
   * post text inside the corresponding platform mock.
   */
  caption?: string;
};

export function CommingSoonMock({ label, icon: Icon, caption }: CommingSoonMockProps) {
  return (
    <Card className="overflow-hidden border border-border-glass/30 bg-surface-material/60">
      <CardContent className="flex flex-col items-center gap-5 py-12 px-6">
        {caption && caption.trim().length > 0 && (
          <div className="w-full max-w-[420px] rounded-xl border border-border-glass/40 bg-surface-thick/60 p-4 text-left">
            <p
              className="mb-2 text-[10px] uppercase text-text-dim"
              style={{
                fontFamily: "JetBrains Mono, monospace",
                letterSpacing: "0.5px",
              }}
            >
              Draft Preview
            </p>
            <p className="line-clamp-6 text-[14px] leading-relaxed whitespace-pre-wrap text-white">
              {caption}
            </p>
          </div>
        )}

        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
          <Icon className="size-10 text-primary relative" />
        </div>

        <h2
          className="shine-text text-[44px] font-bold tracking-tight leading-none"
          style={{ letterSpacing: "-0.03em" }}
        >
          Comming Soon
        </h2>

        <div className="flex flex-col items-center gap-2 max-w-[360px]">
          <span
            className="text-[10px] font-semibold uppercase text-text-dim"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              letterSpacing: "0.5px",
            }}
          >
            {label} Preview
          </span>
          <p className="text-center text-[14px] leading-relaxed text-text-dim">
            We're crafting the perfect preview experience for this platform. Stay tuned — it'll be
            worth the wait!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
