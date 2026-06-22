import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

/**
 * Fixed top app bar shown on the Automate page. The left button closes the
 * page (returns to /app), the center title is decorative, the right link
 * opens the History page.
 */
export function AutomateTopAppBar() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface-material backdrop-blur-[20px] backdrop-saturate-[150%] border-b border-border-glass/50 flex justify-between items-center px-lg py-sm pt-12 pb-3">
      <button
        type="button"
        className="flex items-center justify-center rounded-lg p-2 transition-all hover:bg-white/10 active:scale-[0.98]"
      >
        <Link to="/app">
          <X className="size-5 text-white" />
        </Link>
      </button>

      <h1 className="font-headline-md text-headline-md text-white">Content Preview</h1>

      <Link
        to="/app/history"
        className="text-body-md text-text-dim transition-opacity hover:opacity-80"
      >
        Drafts
      </Link>
    </header>
  );
}
