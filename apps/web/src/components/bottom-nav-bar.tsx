import { Sparkles, History, Calendar, Settings } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

type NavItem = {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
};

interface BottomNavBarProps {
  items?: NavItem[];
  className?: string;
}

function useActiveNav(items: NavItem[]): NavItem[] {
  const pathname = useLocation({ select: (loc) => loc.pathname });
  return items.map((item) => ({
    ...item,
    active: pathname === item.href,
  }));
}

const defaultItems: NavItem[] = [
  {
    icon: <Sparkles className="!size-[28px]" />,
    label: "Studio",
    href: "/app",
  },
  {
    icon: <History className="!size-[28px]" />,
    label: "History",
    href: "/app/history",
  },
  {
    icon: <Calendar className="!size-[28px]" />,
    label: "Calendar",
    href: "/app/calendar",
  },
  {
    icon: <Settings className="!size-[28px]" />,
    label: "Settings",
    href: "/app/settings",
  },
];

export function BottomNavBar({ items = defaultItems, className }: BottomNavBarProps) {
  const navItems = useActiveNav(items);

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 w-full z-50",
        "bg-surface-thick backdrop-blur-[30px] backdrop-saturate-[200%]",
        "border-t border-border-glass/50",
        "flex justify-around items-center",
        "px-lg pt-sm pb-6",
        className,
      )}
      style={{ minHeight: "var(--bottom-nav-height)" }}
    >
      {navItems.map((item) => (
        <Link
          key={item.label}
          to={item.href}
          className={cn(
            "flex flex-col items-center justify-center",
            "active:opacity-70 transition-opacity",
            item.active ? "text-primary" : "text-text-dim hover:text-white/80",
          )}
        >
          {item.icon}
          <span className="text-nav-label mt-1">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
