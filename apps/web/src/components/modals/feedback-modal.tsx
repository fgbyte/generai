import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitFeedback } from "@/hooks/use-submit-feedback";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const [content, setContent] = useState("");
  const { mutate, isPending } = useSubmitFeedback();

  const charCount = content.length;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    mutate(content.trim(), {
      onSuccess: () => {
        setContent("");
        onOpenChange(false);
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[576px] bg-surface-thick backdrop-blur-3xl border-t sm:border border-border-glass rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-5 animate-in slide-in-from-bottom"
        style={{
          paddingBottom: `calc(1.5rem + max(var(--safe-area-inset-bottom, 0px), env(safe-area-inset-bottom, 0px)))`,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-mono-label text-text-dim uppercase">
            Send feedback
          </span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-surface-material transition-colors"
          >
            <X className="size-4 text-white" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Help us improve. Your feedback goes directly to the team.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Textarea
            autoFocus
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            minLength={1}
            maxLength={2000}
          />

          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${charCount > 1800 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {charCount} / 2000
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={content.trim().length === 0 || charCount > 2000}
              >
                {isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
