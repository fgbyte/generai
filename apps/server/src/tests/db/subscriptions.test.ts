import { beforeEach, describe, expect, it, vi } from "vitest";
import { subscriptions } from "@generai/db/schema/subscriptions";

const dbMock = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@generai/db", () => ({
  db: dbMock,
}));

import {
  createOrUpdateSubscription,
  getSubscriptionByStripeId,
  getSubscriptionByUserId,
} from "@generai/db/queries/subscriptions";

describe("subscription queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the subscription found by Stripe subscription id", async () => {
    const row = { id: "sub_local_1", stripeSubscriptionId: "sub_stripe_1" };
    const limit = vi.fn().mockResolvedValue([row]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });

    await expect(getSubscriptionByStripeId("sub_stripe_1")).resolves.toEqual(row);
    expect(from).toHaveBeenCalledWith(subscriptions);
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("generates an id when creating a new subscription", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const whereSelect = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where: whereSelect });
    dbMock.select.mockReturnValue({ from });

    const returning = vi.fn().mockResolvedValue([{ id: "sub_local_1" }]);
    const values = vi.fn().mockReturnValue({ returning });
    dbMock.insert.mockReturnValue({ values });

    const currentPeriodStart = new Date("2026-01-01T00:00:00.000Z");
    const currentPeriodEnd = new Date("2026-02-01T00:00:00.000Z");

    await createOrUpdateSubscription(
      "user_123",
      "sub_stripe_1",
      "pro",
      "active",
      currentPeriodStart,
      currentPeriodEnd,
    );

    expect(dbMock.insert).toHaveBeenCalledWith(subscriptions);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        userId: "user_123",
        stripeSubscriptionId: "sub_stripe_1",
        plan: "pro",
        status: "active",
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      }),
    );
  });

  it("creates a new subscription when the Stripe subscription does not exist", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const whereSelect = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where: whereSelect });
    dbMock.select.mockReturnValue({ from });

    const createdRow = { id: "sub_local_1", stripeSubscriptionId: "sub_stripe_1" };
    const returning = vi.fn().mockResolvedValue([createdRow]);
    const values = vi.fn().mockReturnValue({ returning });
    dbMock.insert.mockReturnValue({ values });

    const currentPeriodStart = new Date("2026-01-01T00:00:00.000Z");
    const currentPeriodEnd = new Date("2026-02-01T00:00:00.000Z");

    await expect(
      createOrUpdateSubscription(
        "user_123",
        "sub_stripe_1",
        "pro",
        "active",
        currentPeriodStart,
        currentPeriodEnd,
      ),
    ).resolves.toEqual(createdRow);
  });

  it("updates an existing subscription instead of inserting a duplicate", async () => {
    const existingRow = { id: "sub_local_1", stripeSubscriptionId: "sub_stripe_1" };
    const limit = vi.fn().mockResolvedValue([existingRow]);
    const whereSelect = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where: whereSelect });
    dbMock.select.mockReturnValue({ from });

    const updatedRow = { ...existingRow, plan: "business", status: "past_due" };
    const returning = vi.fn().mockResolvedValue([updatedRow]);
    const whereUpdate = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where: whereUpdate });
    dbMock.update.mockReturnValue({ set });

    const currentPeriodStart = new Date("2026-03-01T00:00:00.000Z");
    const currentPeriodEnd = new Date("2026-04-01T00:00:00.000Z");

    await expect(
      createOrUpdateSubscription(
        "user_123",
        "sub_stripe_1",
        "business",
        "past_due",
        currentPeriodStart,
        currentPeriodEnd,
      ),
    ).resolves.toEqual(updatedRow);

    expect(dbMock.insert).not.toHaveBeenCalled();
    expect(dbMock.update).toHaveBeenCalledWith(subscriptions);
    expect(set).toHaveBeenCalledWith({
      plan: "business",
      status: "past_due",
      currentPeriodStart,
      currentPeriodEnd,
    });
  });

  it("returns the most recent subscription for a user ordered by currentPeriodEnd DESC", async () => {
    const row = {
      id: "sub_1",
      userId: "user_123",
      stripeSubscriptionId: "sub_stripe_1",
      plan: "pro",
      status: "active",
      currentPeriodStart: new Date("2026-01-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-02-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
    };
    const limit = vi.fn().mockResolvedValue([row]);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });

    await expect(getSubscriptionByUserId("user_123")).resolves.toEqual(row);
    expect(from).toHaveBeenCalledWith(subscriptions);
    expect(where).toHaveBeenCalled();
    expect(orderBy).toHaveBeenCalledWith(expect.anything());
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("returns null when the user has no subscription", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });

    await expect(getSubscriptionByUserId("missing_user")).resolves.toBeNull();
  });

  it("limits the result to a single row when multiple subscriptions exist for a user", async () => {
    const limit = vi.fn().mockResolvedValue([{ id: "sub_latest" }]);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });

    await expect(getSubscriptionByUserId("user_123")).resolves.toEqual({ id: "sub_latest" });
    expect(limit).toHaveBeenCalledWith(1);
  });
});
