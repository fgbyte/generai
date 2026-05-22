import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

interface CustomSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  className?: string;
}

export function CustomSelect({ value, onChange, options, className }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full rounded-lg px-lg py-md text-white text-left",
          "bg-surface-form focus:outline-none focus:ring-2 focus:ring-primary border-none",
          "flex items-center justify-between",
          "cursor-pointer",
          className,
        )}
      >
        <span className="flex items-center gap-2">
          {selected?.icon}
          {selected?.label}
        </span>
        <ChevronDown
          className={cn("size-5 text-white/40 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 w-full mt-1 rounded-lg overflow-hidden",
            "bg-surface-form backdrop-blur-[20px]",
            "border border-border-glass/50",
          )}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-lg py-md text-white text-sm",
                "hover:bg-white/10 transition-colors",
                opt.value === value && "bg-white/10",
              )}
            >
              <span className="flex items-center gap-2">
                {opt.icon}
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
