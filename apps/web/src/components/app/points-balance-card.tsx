import { Coins } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PointsBalanceCardProps {
  balance: number | string;
  onGetMore?: () => void;
  className?: string;
}

export function PointsBalanceCard({ balance, onGetMore, className }: PointsBalanceCardProps) {
  return (
    <section
      className={cn(
        "bg-surface-material backdrop-blur-[20px] backdrop-saturate-[150%]",
        "border border-border-glass/50",
        "rounded-xl p-lg relative overflow-hidden",
        "flex flex-col gap-md",
        className,
      )}
    >
      <div className="absolute top-lg right-lg text-secondary opacity-80">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[rgba(245,158,11,0.18)] bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.16),transparent_60%),rgba(255,204,0,0.03)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <Coins className="size-7 text-secondary" />
        </div>
      </div>

      <div>
        <p className="text-mono-label text-text-dim mb-xs">Available Balance</p>
        <h2 className="text-display-xl text-white tracking-tight">
          {typeof balance === "number" ? balance.toLocaleString() : balance}
        </h2>
      </div>

      <Button
        onClick={onGetMore}
        className={cn(
          "w-full bg-white/10 text-white",
          "border border-border-glass/50",
          "hover:bg-white/20 transition-colors",
          "mt-sm",
        )}
      >
        Get More Points
      </Button>
    </section>
  );
}
