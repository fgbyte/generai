import { describe, expect, it } from "vitest";
import { stripThinkingBlocks } from "../lib/langchain";

describe("stripThinkingBlocks", () => {
  it("removes a single thinking block", () => {
    expect(stripThinkingBlocks("<think>internal reasoning</think>Output")).toBe(
      "Output",
    );
  });

  it("removes multiple thinking blocks", () => {
    expect(stripThinkingBlocks("<think>one</think>A<think>two</think>B")).toBe(
      "AB",
    );
  });

  it("removes a thinking block with multiline content", () => {
    expect(
      stripThinkingBlocks(
        "Before <think>lots of internal\nreasoning here</think> After",
      ),
    ).toBe("Before  After");
  });

  it("preserves content after the thinking block", () => {
    expect(stripThinkingBlocks("<think>hidden</think>Visible answer")).toBe(
      "Visible answer",
    );
  });

  it("removes an empty thinking block", () => {
    expect(stripThinkingBlocks("<think></think>Answer")).toBe("Answer");
  });

  it("strips blocks mixed with regular content", () => {
    const input = "Intro <think>draft</think> Middle <think>more</think> End";
    expect(stripThinkingBlocks(input)).toBe("Intro  Middle  End");
  });

  it("matches tags case-insensitively", () => {
    expect(stripThinkingBlocks("<THINK>hidden</THINK>Answer")).toBe("Answer");
    expect(stripThinkingBlocks("<Think>a</Think><tHINK>b</tHINK>C")).toBe("C");
  });

  it("handles attributes on the opening tag", () => {
    expect(stripThinkingBlocks('<think mode="internal">secret</think>Out')).toBe(
      "Out",
    );
  });

  it("handles whitespace inside the tags", () => {
    expect(stripThinkingBlocks("< think >hidden</ think>Out")).toBe("Out");
  });

  it("handles newlines between tags and content", () => {
    expect(
      stripThinkingBlocks("<think>\n\nreasoning\n\n</think>\nAnswer"),
    ).toBe("Answer");
  });

  it("handles nested thinking blocks", () => {
    expect(
      stripThinkingBlocks(
        "<think>outer<think>inner</think>more</think>Final",
      ),
    ).toBe("Final");
  });

  it("leaves unclosed blocks untouched", () => {
    expect(stripThinkingBlocks("<think>unclosed")).toBe("<think>unclosed");
  });

  it("leaves orphan closing tags untouched", () => {
    expect(stripThinkingBlocks("</think>orphan")).toBe("</think>orphan");
  });

  it("trims surrounding whitespace from the result", () => {
    expect(stripThinkingBlocks("  <think>x</think>  Answer  ")).toBe(
      "Answer",
    );
  });

  it("returns an empty string when only thinking blocks are present", () => {
    expect(stripThinkingBlocks("<think>all hidden</think>")).toBe("");
  });

  it("returns the input unchanged when there are no thinking blocks", () => {
    expect(stripThinkingBlocks("  plain answer  ")).toBe("plain answer");
  });
});
