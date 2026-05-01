import { beforeEach, describe, expect, it, vi } from "vitest";
import { user } from "@generai/db/schema/auth";

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@generai/db", () => ({
  db: dbMock,
}));

import {
  getUserByStripeCustomerId,
  getUserPoints,
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

  it("updates user points and returns the updated row", async () => {
    const updatedUser = { id: "user_123", points: 45 };
    const returning = vi.fn().mockResolvedValue([updatedUser]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    dbMock.update.mockReturnValue({ set });

    await expect(updateUserPoints("user_123", -5)).resolves.toEqual(updatedUser);

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
});
