import type { LucideIcon } from "lucide-react";
import { ImagePlus } from "lucide-react";

type ImageEmptyStateProps = {
  /**
   * Override the icon shown inside the badge. Defaults to `ImagePlus`,
   * which signals "add an image". Pass another Lucide icon if a
   * specific platform calls for a different affordance.
   */
  icon?: LucideIcon;
  /**
   * Short label rendered as a mono-uppercase eyebrow, e.g. "No Image Yet".
   * Keep it tight — it sits above the helper text inside the post slot.
   */
  label?: string;
  /**
   * Helper sentence explaining what the user should do. Defaults to
   * a platform-agnostic "Upload an image to preview your post here."
   */
  message?: string;
  /**
   * Optional className overrides for the wrapper. Useful for platforms
   * that need a different aspect ratio (e.g. Twitter 16:9) or padding.
   */
  className?: string;
};

/**
 * Reusable empty-state used by every platform preview (`instagram`,
 * `twitter`, `dribbble`, `pinterest`, …) whenever no image has been
 * uploaded yet. Lives here so each preview stays in sync visually
 * without duplicating the markup.
 *
 * Keeping the visual language identical across platforms:
 *  - Square aspect-ratio by default to match a generic post slot.
 *  - Subtle surface background + hairline border to sit inside the
 *    surrounding preview Card without competing with the photo grid.
 *  - Glowing primary badge with a Lucide icon, matching the
 *    `CommingSoonMock` treatment.
 */
export function ImageEmptyState({
  icon: Icon = ImagePlus,
  label = "No Image Saved",
  message = "Upload an image to preview your post here.",
  className,
}: ImageEmptyStateProps) {
  return (
    <output
      aria-label={label}
      className={
        "relative aspect-square w-full bg-surface-thick/40 border-y border-border-glass/30 flex flex-col items-center justify-center gap-4 px-6 " +
        (className ?? "")
      }
    >
      <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
        <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
        <Icon className="size-8 text-primary relative" />
      </div>
      <div className="flex flex-col items-center gap-1 max-w-[260px] text-center">
        <span
          className="text-[10px] font-semibold uppercase text-text-dim"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </span>
        <p className="text-[13px] leading-relaxed text-text-dim">{message}</p>
      </div>
    </output>
  );
}
