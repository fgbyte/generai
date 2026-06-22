import { Sparkles, X } from "lucide-react";

interface CommingSoonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommingSoonModal({ open, onOpenChange }: CommingSoonModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 w-full h-full bg-black/70 backdrop-blur-sm animate-in fade-in border-0 p-0 cursor-pointer"
      />
      <div
        className="relative w-full max-w-[576px] bg-surface-thick backdrop-blur-3xl border-t sm:border border-border-glass rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-5 animate-in slide-in-from-bottom"
        style={{
          // Reserve room below the "Got it" CTA for the Android system
          // nav bar / iOS home indicator. Mirrors the calc used by
          // BottomNavBar so the action button never sits underneath the
          // OS chrome on devices that render the bottom-sheet variant.
          paddingBottom: `calc(1.5rem + max(var(--safe-area-inset-bottom, 0px), env(safe-area-inset-bottom, 0px)))`,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-mono-label text-text-dim uppercase">Publishing</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-surface-material transition-colors"
          >
            <X className="size-4 text-white" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
            <Sparkles className="size-7 text-primary relative" />
          </div>

          <h2
            className="shine-text text-[48px] font-bold tracking-tight leading-none mt-1"
            style={{ letterSpacing: "-0.03em" }}
          >
            Comming Soon
          </h2>

          <p className="text-center text-[14px] leading-relaxed text-text-dim max-w-[340px]">
            The publishing and scheduling feature is currently under development. We're working hard
            to bring it to you — stay tuned!
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="h-[52px] btn-primary text-white rounded-xl text-[17px] font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(109,93,242,0.4)]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
