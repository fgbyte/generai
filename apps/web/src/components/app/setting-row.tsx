import type { ReactNode } from "react";

interface SettingRowProps {
  children: ReactNode;
  onClick?: () => void;
}

/**
 * Full-width clickable row used inside the settings Cards (Account,
 * Studio Preferences). Wrapped in a real `<button>` so keyboard and screen
 * reader users can activate it like any other button.
 */
export function SettingRow({ children, onClick }: SettingRowProps) {
  return (
    <button
      type="button"
      className="group cursor-pointer flex w-full items-center gap-lg justify-between border-none bg-transparent px-xl py-lg text-left text-white transition-[background-color,transform] duration-150 active:scale-[0.992] active:bg-white/2.5"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
