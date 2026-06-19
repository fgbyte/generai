import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface DeleteAccountConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}

export function DeleteAccountConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
}: DeleteAccountConfirmationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={() => !isDeleting && onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[576px] bg-surface-thick backdrop-blur-3xl border-t sm:border border-border-glass rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-5 animate-in slide-in-from-bottom"
        style={{
          paddingBottom: `calc(1.5rem + max(var(--safe-area-inset-bottom, 0px), env(safe-area-inset-bottom, 0px)))`,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-mono-label text-text-dim uppercase">Delete account</span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-surface-material transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="size-4 text-white" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-[#ff5a52]/10 border border-[#ff5a52]/20">
            <div className="absolute inset-0 rounded-2xl bg-[#ff5a52]/20 blur-xl" />
            <AlertTriangle className="size-6 text-[#ff5a52] relative" />
          </div>

          <h2
            className="text-[28px] font-bold tracking-tight leading-none text-white"
            style={{ letterSpacing: "-0.03em" }}
          >
            Are you sure?
          </h2>

          <p className="text-center text-[14px] leading-relaxed text-text-dim max-w-[340px]">
            This will permanently delete your account, generated content, preferences, and
            subscription data. This action cannot be undone.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="h-[52px] rounded-xl text-white text-[15px] font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-[#ff5a52] hover:bg-[#ff4540] shadow-[0_0_20px_rgba(255,90,82,0.35)]"
          >
            {isDeleting ? "Deleting..." : "Yes, delete my account"}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="h-[52px] rounded-xl border border-white/10 bg-transparent text-white/70 text-[15px] font-semibold hover:bg-white/5 active:scale-[0.97] transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
