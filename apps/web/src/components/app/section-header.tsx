interface SectionHeaderProps {
  children: string;
}

/**
 * Uppercase, mono-typed section heading used at the top of each Settings
 * section (Account, Studio Preferences, Subscription, Rewards).
 */
export function SectionHeader({ children }: SectionHeaderProps) {
  return (
    <h2 className="px-[0.625rem] text-text-dim font-mono-label text-mono-label uppercase tracking-[0.26em]">
      {children}
    </h2>
  );
}
