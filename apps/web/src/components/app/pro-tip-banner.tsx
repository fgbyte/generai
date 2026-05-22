import { Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";

interface ProTipBannerProps {
  tip: string;
  highlight?: string;
  className?: string;
}

export function ProTipBanner({ tip, highlight, className }: ProTipBannerProps) {
  return (
    <div className={cn("flex gap-md bg-primary/10 rounded-lg p-md items-start", className)}>
      <Lightbulb className="size-5 text-primary flex-shrink-0 mt-0.5" />
      <p className="text-caption-xs text-white/80 leading-snug">
        Pro Tip: {tip}
        {highlight && (
          <>
            {" "}
            Try adding constraints like <span className="text-white font-medium">
              {highlight}
            </span>{" "}
            for better results.
          </>
        )}
      </p>
    </div>
  );
}
