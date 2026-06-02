"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function TimePicker({ value, onValueChange, className }: TimePickerProps) {
  const [hours, minutes] = value.split(":");

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newHours = parseInt(e.target.value, 10);
    if (isNaN(newHours)) newHours = 0;
    if (newHours < 0) newHours = 0;
    if (newHours > 23) newHours = 23;
    onValueChange(`${String(newHours).padStart(2, "0")}:${minutes || "00"}`);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newMinutes = parseInt(e.target.value, 10);
    if (isNaN(newMinutes)) newMinutes = 0;
    if (newMinutes < 0) newMinutes = 0;
    if (newMinutes > 59) newMinutes = 59;
    onValueChange(`${hours || "12"}:${String(newMinutes).padStart(2, "0")}`);
  };

  return (
    <div className={cn("flex items-end gap-2", className)}>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="hours"
          className="text-[10px] font-semibold uppercase text-text-dim"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            letterSpacing: "0.5px",
          }}
        >
          Hours
        </label>
        <input
          id="hours"
          type="number"
          min={0}
          max={23}
          value={hours}
          onChange={handleHoursChange}
          className="w-12 h-10 bg-surface-material border border-border-glass rounded-md text-center text-white font-semibold outline-none focus:border-violet-brand transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
      <span className="text-white pb-2 font-body-md">:</span>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="minutes"
          className="text-[10px] font-semibold uppercase text-text-dim"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            letterSpacing: "0.5px",
          }}
        >
          Minutes
        </label>
        <input
          id="minutes"
          type="number"
          min={0}
          max={59}
          value={minutes}
          onChange={handleMinutesChange}
          className="w-12 h-10 bg-surface-material border border-border-glass rounded-md text-center text-white font-semibold outline-none focus:border-violet-brand transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
}
