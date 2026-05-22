import { cn } from "@/lib/utils";

interface TopAppBarProps {
  title?: string;
  className?: string;
}

export function TopAppBar({ title = "GENERAI", className }: TopAppBarProps) {
  return (
    <header
      className={cn(
        "fixed top-0 left-0 w-full z-50",
        "bg-surface-material backdrop-blur-[20px] backdrop-saturate-[150%]",
        "border-b border-border-glass/50",
        "flex justify-center items-center",
        "px-lg py-sm pt-12 pb-3",
        className,
      )}
    >
      <h1 className="font-button-md text-button-md text-white tracking-wide text-center">
        {title}
      </h1>
    </header>
  );
}
