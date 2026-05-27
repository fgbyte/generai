import { ChevronRight, History } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

interface ActivityHistoryLinkProps {
  href?: string;
  className?: string;
}

export function ActivityHistoryLink({
  href = "/app/history",
  className,
}: ActivityHistoryLinkProps) {
  return (
    <Link
      to={href}
      className={cn(
        "bg-surface-material backdrop-blur-[20px] backdrop-saturate-150",
        "border border-border-glass/50",
        "rounded-lg px-lg py-md",
        "flex justify-between items-center",
        "hover:bg-white/10 transition-colors",
        "active:scale-[0.98]",
        className,
      )}
    >
      <div className="flex items-center gap-md">
        <History className="size-5 text-primary" />
        <span className="font-body-md text-white">Prompts Store</span>
      </div>
      <ChevronRight className="size-5 text-white/40" />
    </Link>
  );
}
