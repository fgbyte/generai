import { z } from "zod";

export const creditsConfigSchema = z
  .object({
    resetAmount: z.number().int().positive().default(50),
    resetInterval: z.enum(["day", "week", "month"]).default("month"),
    costPerGeneration: z.number().int().positive().default(5),
  })
  .refine((cfg) => cfg.costPerGeneration < cfg.resetAmount, {
    message: "costPerGeneration should be below resetAmount",
  });

export type CreditsConfig = z.infer<typeof creditsConfigSchema>;

export const creditsConfig: CreditsConfig = Object.freeze(
  creditsConfigSchema.parse({}),
);

export type ResetInterval = "day" | "week" | "month";

/**
 * `pointsResetAt` stores the LAST-APPLIED boundary, never `now()`; on apply set
 * it to `computeNextResetAt(oldBoundary, interval)` to prevent anchor drift.
 */
export function computeNextResetAt(
  lastResetAt: Date,
  interval: ResetInterval,
): Date {
  const d = new Date(lastResetAt); // clone — never mutate the input

  if (interval === "month") {
    const day = d.getUTCDate();
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1; // target month (0-based)
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate(); // last day of target month
    const clampedDay = Math.min(day, lastDay);
    return new Date(
      Date.UTC(
        year,
        month,
        clampedDay,
        d.getUTCHours(),
        d.getUTCMinutes(),
        d.getUTCSeconds(),
        d.getUTCMilliseconds(),
      ),
    );
  }

  if (interval === "week") {
    d.setUTCDate(d.getUTCDate() + 7);
    return d;
  }

  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export function isResetDue(
  lastResetAt: Date,
  interval: ResetInterval,
  now: Date = new Date(),
): boolean {
  return computeNextResetAt(lastResetAt, interval).getTime() <= now.getTime();
}

export function computeEffectivePoints(
  points: number,
  lastResetAt: Date,
  interval: ResetInterval,
  resetAmount: number,
  now: Date = new Date(),
): number {
  return isResetDue(lastResetAt, interval, now) ? resetAmount : points;
}