import { beforeEach, describe, expect, it, vi } from "vitest";
import { user } from "@generai/db/schema/auth";
import { creditsConfig } from "@generai/config/credits";

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@generai/db", () => ({
  db: dbMock,
}));

import {
  deleteUser,
  getUserByStripeCustomerId,
  getUserPoints,
  getUserPointsWithResetInfo,
  setUserPointsAbsolute,
  updateUserPoints,
} from "@generai/db/queries/users";

describe("user queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the user found by Stripe customer id", async () => {
    const foundUser = { id: "user_123", stripeCustomerId: "cus_123" };
    const limit = vi.fn().mockResolvedValue([foundUser]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });

    await expect(getUserByStripeCustomerId("cus_123")).resolves.toEqual(foundUser);
    expect(from).toHaveBeenCalledWith(user);
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("updates user points and returns the number of affected rows", async () => {
    const returning = vi.fn().mockResolvedValue([{ points: 45 }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    dbMock.update.mockReturnValue({ set });

    const count = await updateUserPoints("user_123", -5);
    expect(count).toBe(1);

    expect(dbMock.update).toHaveBeenCalledWith(user);
    expect(set).toHaveBeenCalledWith({
      points: expect.anything(),
    });
  });

  it("returns the current points balance for an existing user", async () => {
    const limit = vi.fn().mockResolvedValue([{ points: 50 }]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });

    await expect(getUserPoints("user_123")).resolves.toBe(50);
    expect(dbMock.select).toHaveBeenCalledWith({ points: user.points });
  });

  it("returns 0 when the user does not exist", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });

    await expect(getUserPoints("missing_user")).resolves.toBe(0);
  });

  it("returns 0 and logs when loading points throws", async () => {
    const error = new Error("db unavailable");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const from = vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => {
        throw error;
      }),
    });
    dbMock.select.mockReturnValue({ from });

    await expect(getUserPoints("user_123")).resolves.toBe(0);
    expect(errorSpy).toHaveBeenCalledWith("Error fetching user points:", error);

    errorSpy.mockRestore();
  });

  it("deletes a user and returns the deleted row", async () => {
    const deletedUser = { id: "user_123", email: "x@example.com" };
    const returning = vi.fn().mockResolvedValue([deletedUser]);
    const where = vi.fn().mockReturnValue({ returning });
    dbMock.delete.mockReturnValue({ where });

    await expect(deleteUser("user_123")).resolves.toEqual(deletedUser);
    expect(dbMock.delete).toHaveBeenCalledWith(user);
    expect(where).toHaveBeenCalled();
  });

  it("returns undefined when deleting a user that does not exist", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    dbMock.delete.mockReturnValue({ where });

    await expect(deleteUser("missing_user")).resolves.toBeUndefined();
  });

  // ── setUserPointsAbsolute ──────────────────────────────────────────

  it("setUserPointsAbsolute sets points and pointsResetAt exactly", async () => {
    const updatedRow = { id: "user_1", points: 100, pointsResetAt: new Date("2026-03-01") };
    const returning = vi.fn().mockResolvedValue([updatedRow]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    dbMock.update.mockReturnValue({ set });

    const boundary = new Date("2026-03-01");
    const result = await setUserPointsAbsolute("user_1", 100, boundary);

    expect(result).toEqual(updatedRow);
    expect(dbMock.update).toHaveBeenCalledWith(user);
    expect(set).toHaveBeenCalledWith({ points: 100, pointsResetAt: boundary });
  });

  it("setUserPointsAbsolute returns undefined for missing user", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    dbMock.update.mockReturnValue({ set });

    const result = await setUserPointsAbsolute("missing", 50, new Date());
    expect(result).toBeUndefined();
  });

  // ── updateUserPoints guard ─────────────────────────────────────────

  it("updateUserPoints returns 0 rows when negative delta exceeds balance", async () => {
    const returning = vi.fn().mockResolvedValue([]); // guard blocked
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    dbMock.update.mockReturnValue({ set });

    const count = await updateUserPoints("user_1", -5); // balance is 3
    expect(count).toBe(0);
    expect(dbMock.update).toHaveBeenCalledWith(user);
  });

  it("updateUserPoints returns 1 row when negative delta equals balance", async () => {
    const returning = vi.fn().mockResolvedValue([{ points: 0 }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    dbMock.update.mockReturnValue({ set });

    const count = await updateUserPoints("user_1", -5); // balance is 5
    expect(count).toBe(1);
  });

  it("updateUserPoints returns 1 row for positive delta", async () => {
    const returning = vi.fn().mockResolvedValue([{ points: 55 }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    dbMock.update.mockReturnValue({ set });

    const count = await updateUserPoints("user_1", 5);
    expect(count).toBe(1);
  });

  // ── getUserPointsWithResetInfo ─────────────────────────────────────

  it("getUserPointsWithResetInfo returns reset info for a user whose reset is due", async () => {
    // Fixture: pointsResetAt 31 days ago → isResetDue should be true (monthly interval)
    const oldReset = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const row = { points: 3, pointsResetAt: oldReset, createdAt: new Date() };
    const limit = vi.fn().mockResolvedValue([row]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });

    const info = await getUserPointsWithResetInfo("user_1");

    expect(info.points).toBe(3);
    expect(info.isDue).toBe(true);
    expect(info.effectivePoints).toBe(creditsConfig.resetAmount); // 50
    expect(info.nextResetAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(info.lastResetAt).toBe(oldReset);
  });

  it("getUserPointsWithResetInfo returns reset info for a user whose reset is NOT due", async () => {
    // Fixture: pointsResetAt = now → isResetDue should be false
    const recentReset = new Date();
    const row = { points: 30, pointsResetAt: recentReset, createdAt: new Date() };
    const limit = vi.fn().mockResolvedValue([row]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });

    const info = await getUserPointsWithResetInfo("user_2");

    expect(info.points).toBe(30);
    expect(info.isDue).toBe(false);
    expect(info.effectivePoints).toBe(30);
    expect(info.nextResetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("getUserPointsWithResetInfo returns safe defaults for missing user", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });

    const info = await getUserPointsWithResetInfo("missing_user");

    expect(info.points).toBe(0);
    expect(info.isDue).toBe(false);
    expect(info.effectivePoints).toBe(0);
    expect(info.lastResetAt).toBeInstanceOf(Date);
    expect(info.nextResetAt).toBeInstanceOf(Date);
  });
});
