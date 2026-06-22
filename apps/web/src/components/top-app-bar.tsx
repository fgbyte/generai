import { useState } from "react";
import { Lightbulb } from "lucide-react";

import { FeedbackModal } from "@/components/modals/feedback-modal";
import { cn } from "@/lib/utils";

interface TopAppBarProps {
  title?: string;
  className?: string;
}

export function TopAppBar({ title = "GENERAI", className }: TopAppBarProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 w-full z-50",
          "bg-surface-material backdrop-blur-[20px] backdrop-saturate-[150%]",
          "border-b border-border-glass/50",
          "flex justify-center items-center",
          "px-lg py-sm pt-12 pb-3",
          className,
        )}
      >
        <h1 className="font-button-md text-button-md text-white tracking-wide text-center">
          {title}
        </h1>
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          aria-label="Send feedback"
          title="Send feedback"
          className="absolute right-lg top-1/2 -translate-y-[calc(50%+0.75rem)] p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 active:bg-white/15 transition-colors"
        >
          <Lightbulb className="size-5" />
        </button>
      </header>
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
