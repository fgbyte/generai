import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockInsert, mockSelect, mockUpdate, mockDelete, mockDb } = vi.hoisted(() => {
  const chain = {
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };
  const insert = vi.fn(() => chain);
  const select = vi.fn(() => chain);
  const update = vi.fn(() => chain);
  const del = vi.fn(() => chain);
  const db = { insert, select, update, delete: del };
  return {
    mockInsert: insert,
    mockSelect: select,
    mockUpdate: update,
    mockDelete: del,
    mockDb: db,
  };
});

vi.mock("@generai/db", () => ({ db: mockDb }));

import {
  createInstagramAccount,
  getInstagramAccountByUserId,
  getInstagramAccountById,
  getInstagramAccountByIgUserId,
  updateInstagramAccount,
  deleteInstagramAccount,
  listInstagramAccounts,
} from "@generai/db/queries/instagram-accounts";

describe("instagram-accounts queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createInstagramAccount", () => {
    it("inserts a row with a generated UUID", async () => {
      const row = { id: "test-id", userId: "u1" };
      mockInsert().returning.mockResolvedValueOnce([row]);
      const result = await createInstagramAccount({
        id: "ignored" as string,
        userId: "u1",
        igUserId: "ig1",
        fbPageId: "p1",
        pageAccessToken: "tok",
      });
      expect(mockInsert).toHaveBeenCalled();
      expect(result).toEqual(row);
    });
  });

  describe("getInstagramAccountByUserId", () => {
    it("returns the row when found", async () => {
      const row = { id: "test", userId: "u1" };
      mockSelect().where().limit.mockResolvedValueOnce([row]);
      const result = await getInstagramAccountByUserId("u1");
      expect(result).toEqual(row);
    });

    it("returns null when not found", async () => {
      mockSelect().where().limit.mockResolvedValueOnce([]);
      const result = await getInstagramAccountByUserId("nope");
      expect(result).toBeNull();
    });
  });

  describe("getInstagramAccountById", () => {
    it("returns the row when found", async () => {
      const row = { id: "test" };
      mockSelect().where().limit.mockResolvedValueOnce([row]);
      const result = await getInstagramAccountById("test");
      expect(result).toEqual(row);
    });

    it("returns null when not found", async () => {
      mockSelect().where().limit.mockResolvedValueOnce([]);
      const result = await getInstagramAccountById("nope");
      expect(result).toBeNull();
    });
  });

  describe("getInstagramAccountByIgUserId", () => {
    it("returns the row when found", async () => {
      const row = { id: "test", igUserId: "ig1" };
      mockSelect().where().limit.mockResolvedValueOnce([row]);
      const result = await getInstagramAccountByIgUserId("ig1");
      expect(result).toEqual(row);
    });

    it("returns null when not found", async () => {
      mockSelect().where().limit.mockResolvedValueOnce([]);
      const result = await getInstagramAccountByIgUserId("nope");
      expect(result).toBeNull();
    });
  });

  describe("updateInstagramAccount", () => {
    it("updates and returns the row", async () => {
      const row = { id: "test", igUsername: "new" };
      mockUpdate().set().where().returning.mockResolvedValueOnce([row]);
      const result = await updateInstagramAccount("test", { igUsername: "new" });
      expect(result).toEqual(row);
    });
  });

  describe("deleteInstagramAccount", () => {
    it("deletes when userId matches", async () => {
      const row = { id: "test" };
      mockDelete().where().returning.mockResolvedValueOnce([row]);
      const result = await deleteInstagramAccount("test", "u1");
      expect(result).toEqual(row);
    });

    it("returns null when no row matches", async () => {
      mockDelete().where().returning.mockResolvedValueOnce([]);
      const result = await deleteInstagramAccount("test", "wrong");
      expect(result).toBeNull();
    });
  });

  describe("listInstagramAccounts", () => {
    it("returns all rows ordered by createdAt desc", async () => {
      const rows = [{ id: "a" }, { id: "b" }];
      mockSelect().orderBy.mockResolvedValueOnce(rows);
      const result = await listInstagramAccounts();
      expect(result).toEqual(rows);
      expect(mockSelect().orderBy).toHaveBeenCalled();
    });
  });
});
