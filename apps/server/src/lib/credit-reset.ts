import { creditsConfig, computeNextResetAt } from "@generai/config";
import { getUserPointsWithResetInfo, setUserPointsAbsolute } from "@generai/db/queries/users";

export type LazyResetResult = {
  applied: boolean;
  points: number;
  /** Points balance before this call — lets callers log a reset without a second query. */
  previousPoints: number;
  lastResetAt: Date;
  nextResetAt: Date;
};

/**
 * Apply a credit reset ONLY if it is due, using "last-applied boundary"
 * semantics (never `now()`). This is the single entrypoint for applying a
 * reset — the GET route stays write-free.
 * @param userId - The Better-Auth user ID
 */
export async function applyLazyResetIfDue(userId: string): Promise<LazyResetResult> {
  const info = await getUserPointsWithResetInfo(userId);

  if (!info.isDue) {
    return {
      applied: false,
      points: info.points,
      previousPoints: info.points,
      lastResetAt: info.lastResetAt,
      nextResetAt: info.nextResetAt,
    };
  }

  // Advance the boundary via computeNextResetAt(oldBoundary, interval) — NEVER now().
  const newBoundary = computeNextResetAt(info.lastResetAt, creditsConfig.resetInterval);
  await setUserPointsAbsolute(userId, creditsConfig.resetAmount, newBoundary);

  return {
    applied: true,
    points: creditsConfig.resetAmount,
    previousPoints: info.points,
    lastResetAt: newBoundary,
    nextResetAt: computeNextResetAt(newBoundary, creditsConfig.resetInterval),
  };
}
