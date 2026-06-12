import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockInsert, mockSelect, mockUpdate, mockDb } = vi.hoisted(() => {
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
  const db = { insert, select, update, delete: vi.fn() };
  return {
    mockInsert: insert,
    mockSelect: select,
    mockUpdate: update,
    mockDb: db,
  };
});

vi.mock("@generai/db", () => ({ db: mockDb }));

import {
  createPublishLog,
  getPublishLogById,
  getPublishLogsByAccountId,
  getProcessingPublishLogForAccount,
  updatePublishLog,
} from "@generai/db/queries/instagram-publish-log";

describe("instagram-publish-log queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPublishLog", () => {
    it("inserts a row with status default 'pending'", async () => {
      const row = { id: "log-1", status: "pending" };
      mockInsert().returning.mockResolvedValueOnce([row]);
      const result = await createPublishLog({
        id: "ignored" as string,
        instagramAccountId: "acc-1",
        mediaType: "single_image",
      });
      expect(mockInsert).toHaveBeenCalled();
      expect(result).toEqual(row);
    });
  });

  describe("getPublishLogById", () => {
    it("returns the row when found", async () => {
      const row = { id: "log-1" };
      mockSelect().where().limit.mockResolvedValueOnce([row]);
      const result = await getPublishLogById("log-1");
      expect(result).toEqual(row);
    });

    it("returns null when not found", async () => {
      mockSelect().where().limit.mockResolvedValueOnce([]);
      const result = await getPublishLogById("nope");
      expect(result).toBeNull();
    });
  });

  describe("getPublishLogsByAccountId", () => {
    it("returns array ordered DESC", async () => {
      const rows = [{ id: "a" }, { id: "b" }];
      mockSelect().where().orderBy().limit.mockResolvedValueOnce(rows);
      const result = await getPublishLogsByAccountId("acc-1");
      expect(result).toEqual(rows);
      expect(mockSelect().orderBy).toHaveBeenCalled();
    });

    it("uses default limit of 50", async () => {
      mockSelect().where().orderBy().limit.mockResolvedValueOnce([]);
      await getPublishLogsByAccountId("acc-1");
      expect(mockSelect().limit).toHaveBeenCalledWith(50);
    });

    it("respects custom limit", async () => {
      mockSelect().where().orderBy().limit.mockResolvedValueOnce([]);
      await getPublishLogsByAccountId("acc-1", 5);
      expect(mockSelect().limit).toHaveBeenCalledWith(5);
    });
  });

  describe("getProcessingPublishLogForAccount", () => {
    it("returns the processing log when one exists", async () => {
      const row = { id: "log-1", status: "processing" };
      mockSelect().where().limit.mockResolvedValueOnce([row]);
      const result = await getProcessingPublishLogForAccount("acc-1");
      expect(result).toEqual(row);
    });

    it("returns null when no processing log exists", async () => {
      mockSelect().where().limit.mockResolvedValueOnce([]);
      const result = await getProcessingPublishLogForAccount("acc-1");
      expect(result).toBeNull();
    });
  });

  describe("updatePublishLog", () => {
    it("updates status to published", async () => {
      const row = { id: "log-1", status: "published" };
      mockUpdate().set().where().returning.mockResolvedValueOnce([row]);
      const result = await updatePublishLog("log-1", { status: "published" });
      expect(result).toEqual(row);
    });

    it("updates error fields", async () => {
      const row = { id: "log-1", status: "failed", errorCode: "190" };
      mockUpdate().set().where().returning.mockResolvedValueOnce([row]);
      const result = await updatePublishLog("log-1", {
        status: "failed",
        errorCode: "190",
      });
      expect(result).toEqual(row);
    });
  });
});
