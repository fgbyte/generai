import { describe, expect, it } from "vitest";
import { computeNextResetAt, computeEffectivePoints, isResetDue } from "@generai/config";

describe("computeNextResetAt", () => {
  it("advances a month for a mid-month date", () => {
    expect(computeNextResetAt(new Date("2026-01-15T00:00:00Z"), "month").toISOString()).toBe(
      "2026-02-15T00:00:00.000Z",
    );
  });

  it("clamps Jan 31 to Feb 28", () => {
    expect(computeNextResetAt(new Date("2026-01-31T00:00:00Z"), "month").toISOString()).toBe(
      "2026-02-28T00:00:00.000Z",
    );
  });

  it("stays clamped (Feb 28 does not expand to Mar 31)", () => {
    expect(computeNextResetAt(new Date("2026-02-28T00:00:00Z"), "month").toISOString()).toBe(
      "2026-03-28T00:00:00.000Z",
    );
  });

  it("advances a week", () => {
    expect(computeNextResetAt(new Date("2026-01-15T00:00:00Z"), "week").toISOString()).toBe(
      "2026-01-22T00:00:00.000Z",
    );
  });

  it("advances a day", () => {
    expect(computeNextResetAt(new Date("2026-01-15T00:00:00Z"), "day").toISOString()).toBe(
      "2026-01-16T00:00:00.000Z",
    );
  });

  it("does not mutate the input date", () => {
    const input = new Date("2026-01-31T00:00:00Z");
    computeNextResetAt(input, "month");
    expect(input.toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });
});

describe("isResetDue", () => {
  it("returns false before the boundary", () => {
    expect(
      isResetDue(new Date("2026-01-15T00:00:00Z"), "month", new Date("2026-02-14T23:59:59Z")),
    ).toBe(false);
  });

  it("returns true at the boundary (inclusive)", () => {
    expect(
      isResetDue(new Date("2026-01-15T00:00:00Z"), "month", new Date("2026-02-15T00:00:00Z")),
    ).toBe(true);
  });
});

describe("computeEffectivePoints", () => {
  const now = new Date("2026-03-01T00:00:00Z");

  it("returns resetAmount when due", () => {
    const oldEnough = new Date("2026-01-20T00:00:00Z"); // 40 days before now
    expect(computeEffectivePoints(3, oldEnough, "month", 50, now)).toBe(50);
  });

  it("returns current points when not due", () => {
    const notDue = new Date(now); // same instant, not yet past boundary
    expect(computeEffectivePoints(3, notDue, "month", 50, now)).toBe(3);
  });
});
