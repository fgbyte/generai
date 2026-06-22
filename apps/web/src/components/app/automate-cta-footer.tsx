import { useEffect, useState } from "react";
import { CopyIcon, Check, SendHorizonal } from "lucide-react";

import { CommingSoonModal } from "@/components/modals/comming-soon-modal";

interface CtaFooterProps {
  caption: string;
}

/**
 * Two-button footer: Copy (captions to clipboard with a 1.5s "Copied!"
 * confirmation) and Publish (opens the Coming Soon modal until the real
 * scheduling flow ships).
 */
export function CtaFooter({ caption }: CtaFooterProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
    } catch {
      // noop
    }
  };

  // Auto-reset the "Copied!" state after 1.5s. Cleanup prevents
  // stale state updates if the component unmounts or the user
  // clicks again before the timer fires.
  useEffect(() => {
    if (!copied) return;
    const timeoutId = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeoutId);
  }, [copied]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={handleCopy} className="btn-secondary">
        {copied ? (
          <span className="inline-flex items-center gap-2">
            <Check className="size-4" />
            Copied!
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <CopyIcon className="size-4" />
            Copy
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => setScheduleOpen(true)}
        className="btn-primary text-white rounded-xl text-[17px] font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2"
      >
        <SendHorizonal className="size-4" />
        Publish
      </button>

      {scheduleOpen && <CommingSoonModal open={scheduleOpen} onOpenChange={setScheduleOpen} />}
    </div>
  );
}
