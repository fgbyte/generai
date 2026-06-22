import type { LucideIcon } from "lucide-react";

import { platforms, type PlatformId } from "@/components/app/automate-platforms";

interface PlatformSelectorProps {
  value: PlatformId;
  onChange: (value: PlatformId) => void;
}

/**
 * Horizontal pill selector for the four supported platforms. Acts as a
 * toggle group with `aria-pressed` per option so screen readers announce
 * the active platform.
 */
export function PlatformSelector({ value, onChange }: PlatformSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-mono-label text-text-dim uppercase">Select Platform</span>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {platforms.map((p) => {
          const isActive = p.id === value;
          const Icon: LucideIcon = p.icon;
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => onChange(p.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "border-primary/30 bg-primary text-white shadow-[0_0_15px_rgba(109,93,242,0.4)]"
                  : "border-border-glass/50 bg-surface-material text-text-dim hover:bg-surface-material/80 hover:text-white"
              }`}
              aria-pressed={isActive}
            >
              <Icon className="size-4" />
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
