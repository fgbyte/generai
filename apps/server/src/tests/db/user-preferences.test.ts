import { beforeEach, describe, expect, it, vi } from "vitest";
import { userPreferences } from "@generai/db/schema/user-preferences";

const dbMock = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@generai/db", () => ({
  db: dbMock,
}));

import {
  getUserPreferences,
  upsertUserPreferences,
} from "@generai/db/queries/user-preferences";

describe("user preferences queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the preferences row for an existing user", async () => {
    const row = {
      userId: "user_123",
      aiTone: "Professional",
      defaultPlatform: "LinkedIn",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const limit = vi.fn().mockResolvedValue([row]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });

    await expect(getUserPreferences("user_123")).resolves.toEqual(row);
    expect(from).toHaveBeenCalledWith(userPreferences);
    expect(where).toHaveBeenCalled();
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("returns null when no preferences row exists for the user", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });

    await expect(getUserPreferences("missing_user")).resolves.toBeNull();
  });

  it("inserts a new preferences row via upsert when none exists", async () => {
    const insertedRow = {
      userId: "user_123",
      aiTone: "Professional",
      defaultPlatform: "LinkedIn",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const returning = vi.fn().mockResolvedValue([insertedRow]);
    const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    dbMock.insert.mockReturnValue({ values });

    await expect(
      upsertUserPreferences("user_123", {
        aiTone: "Professional",
        defaultPlatform: "LinkedIn",
      }),
    ).resolves.toEqual(insertedRow);
    expect(dbMock.insert).toHaveBeenCalledWith(userPreferences);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_123", aiTone: "Professional" }),
    );
  });

  it("upserts by userId when a row already exists", async () => {
    const updatedRow = {
      userId: "user_123",
      aiTone: "Casual",
      defaultPlatform: "Instagram",
      updatedAt: new Date("2026-02-01T00:00:00.000Z"),
    };
    const returning = vi.fn().mockResolvedValue([updatedRow]);
    const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    dbMock.insert.mockReturnValue({ values });

    await expect(
      upsertUserPreferences("user_123", { aiTone: "Casual" }),
    ).resolves.toEqual(updatedRow);

    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ target: userPreferences.userId }),
    );
  });
});
