import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatedContent } from "@generai/db/schema/generated-content";

const dbMock = vi.hoisted(() => ({
  insert: vi.fn(),
  delete: vi.fn(),
  select: vi.fn(),
}));

vi.mock("@generai/db", () => ({
  db: dbMock,
}));

import {
  deleteGeneratedContent,
  getGeneratedContentHistory,
  saveGeneratedContent,
} from "@generai/db/queries/generated-content";

describe("generated content queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates an id when saving generated content", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "gc_123" }]);
    const values = vi.fn().mockReturnValue({ returning });
    dbMock.insert.mockReturnValue({ values });

    await saveGeneratedContent("user_123", "hello world", "write a thread", "thread");

    expect(dbMock.insert).toHaveBeenCalledWith(generatedContent);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        userId: "user_123",
        content: "hello world",
        prompt: "write a thread",
        contentType: "thread",
      }),
    );
  });

  it("returns the inserted generated content row", async () => {
    const insertedRow = {
      id: "gc_123",
      userId: "user_123",
      content: "hello world",
      prompt: "write a thread",
      contentType: "thread",
    };
    const returning = vi.fn().mockResolvedValue([insertedRow]);
    const values = vi.fn().mockReturnValue({ returning });
    dbMock.insert.mockReturnValue({ values });

    await expect(
      saveGeneratedContent("user_123", "hello world", "write a thread", "thread"),
    ).resolves.toEqual(insertedRow);
  });

  it("loads generated content history ordered by creation date with the requested limit", async () => {
    const historyRows = [
      {
        id: "gc_2",
        content: "second",
        prompt: "prompt 2",
        contentType: "thread",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      {
        id: "gc_1",
        content: "first",
        prompt: "prompt 1",
        contentType: "linkedin",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ];
    const limit = vi.fn().mockResolvedValue(historyRows);
    const orderBy = vi.fn().mockReturnValue({ limit });
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    dbMock.select.mockReturnValue({ from });

    await expect(getGeneratedContentHistory("user_123", 5)).resolves.toEqual(historyRows);
    expect(dbMock.select).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith(generatedContent);
    expect(where).toHaveBeenCalledTimes(1);
    expect(orderBy).toHaveBeenCalledTimes(1);
    expect(limit).toHaveBeenCalledWith(5);
  });

  it("deletes generated content by id and returns the deleted row", async () => {
    const deletedRow = { id: "gc_123" };
    const returning = vi.fn().mockResolvedValue([deletedRow]);
    const where = vi.fn().mockReturnValue({ returning });
    dbMock.delete.mockReturnValue({ where });

    await expect(deleteGeneratedContent("gc_123")).resolves.toEqual(deletedRow);
    expect(dbMock.delete).toHaveBeenCalledWith(generatedContent);
    expect(where).toHaveBeenCalledTimes(1);
  });
});
