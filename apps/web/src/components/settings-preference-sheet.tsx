import { X } from "lucide-react";
import { toast } from "sonner";

const AI_TONES = ["Creative", "Professional", "Casual"] as const;
const PLATFORMS = ["Instagram", "Twitter (X)", "Dribbble", "Pinterest"] as const;
const COMING_SOON_PLATFORMS = ["Twitter (X)", "Dribbble", "Pinterest"] as const;

type AiTone = (typeof AI_TONES)[number];
type Platform = (typeof PLATFORMS)[number];

interface PreferenceSheetProps {
  open: "aiTone" | "defaultPlatform" | null;
  onOpenChange: (open: "aiTone" | "defaultPlatform" | null) => void;
  currentAiTone: AiTone;
  currentPlatform: Platform;
  isPending: boolean;
  onSelectAiTone: (tone: AiTone, platform: Platform) => void;
  onSelectPlatform: (tone: AiTone, platform: Platform) => void;
}

export function PreferenceSheet({
  open,
  onOpenChange,
  currentAiTone,
  currentPlatform,
  isPending,
  onSelectAiTone,
  onSelectPlatform,
}: PreferenceSheetProps) {
  if (open === null) return null;

  const isAiTone = open === "aiTone";
  const title = isAiTone ? "Default AI Tone" : "Default Platform";
  const description = isAiTone
    ? "Select the default tone for AI-generated content."
    : "Select your default social media platform.";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={() => onOpenChange(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[576px] bg-surface-thick backdrop-blur-3xl border-t sm:border border-border-glass rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-5 animate-in slide-in-from-bottom"
        style={{
          paddingBottom: `calc(1.5rem + max(var(--safe-area-inset-bottom, 0px), env(safe-area-inset-bottom, 0px)))`,
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-mono-label text-text-dim uppercase">{title}</span>
          <button
            type="button"
            onClick={() => onOpenChange(null)}
            aria-label="Close"
            className="p-2 rounded-full hover:bg-surface-material transition-colors"
          >
            <X className="size-4 text-white" />
          </button>
        </div>

        <p className="text-[14px] leading-relaxed text-text-dim">{description}</p>

        <div className="flex flex-col gap-3">
          {isAiTone &&
            AI_TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                disabled={isPending}
                onClick={() => onSelectAiTone(tone, currentPlatform)}
                className={`w-full rounded-lg border px-lg py-md text-left text-sm font-medium transition-colors ${
                  currentAiTone === tone
                    ? "border-[#7c5ce6] bg-[#7c5ce6]/15 text-white"
                    : "border-white/10 bg-surface-deep text-white/70 hover:bg-white/5"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {tone}
              </button>
            ))}
          {!isAiTone &&
            PLATFORMS.map((platform) => {
              const isComingSoon = COMING_SOON_PLATFORMS.includes(
                platform as (typeof COMING_SOON_PLATFORMS)[number],
              );
              return (
                <button
                  key={platform}
                  type="button"
                  disabled={isPending || isComingSoon}
                  onClick={() => onSelectPlatform(currentAiTone, platform)}
                  className={`w-full rounded-lg border px-lg py-md text-left text-sm font-medium transition-colors ${
                    currentPlatform === platform
                      ? "border-[#7c5ce6] bg-[#7c5ce6]/15 text-white"
                      : "border-white/10 bg-surface-deep text-white/70 hover:bg-white/5"
                  } ${isComingSoon ? "opacity-40 cursor-not-allowed" : ""} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="flex items-center justify-between">
                    {platform}
                    {isComingSoon && (
                      <span className="text-[0.625rem] font-bold uppercase tracking-wider text-white/40">
                        Coming Soon
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
