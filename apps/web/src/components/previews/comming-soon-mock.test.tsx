import { render, screen } from "@testing-library/react";
import { Twitter } from "lucide-react";
import { describe, expect, it } from "vitest";

import { CommingSoonMock } from "./comming-soon-mock";

describe("CommingSoonMock", () => {
  it("renders the platform label and icon", () => {
    render(<CommingSoonMock label="X / Twitter" icon={Twitter} />);

    expect(screen.getByText("X / Twitter Preview")).toBeInTheDocument();
    expect(screen.getByText("Comming Soon")).toBeInTheDocument();
  });

  it("does not render the Draft Preview block when no caption is provided", () => {
    render(<CommingSoonMock label="X / Twitter" icon={Twitter} />);

    expect(screen.queryByText("Draft Preview")).not.toBeInTheDocument();
  });

  it("does not render the Draft Preview block when caption is undefined", () => {
    render(<CommingSoonMock label="X / Twitter" icon={Twitter} caption={undefined} />);

    expect(screen.queryByText("Draft Preview")).not.toBeInTheDocument();
  });

  it("does not render the Draft Preview block when caption is empty", () => {
    render(<CommingSoonMock label="X / Twitter" icon={Twitter} caption="" />);

    expect(screen.queryByText("Draft Preview")).not.toBeInTheDocument();
  });

  it("does not render the Draft Preview block when caption is only whitespace", () => {
    // Use {} so JSX evaluates \n as a real newline. As a bare attribute
    // (caption="...") JSX treats the value as a literal string and \n stays
    // as two characters (\ + n) which .trim() does NOT remove.
    render(<CommingSoonMock label="X / Twitter" icon={Twitter} caption={"   \n  "} />);

    expect(screen.queryByText("Draft Preview")).not.toBeInTheDocument();
  });

  it("renders the Draft Preview block with the caption when provided", () => {
    const caption = "🚀 Launching our new product today!";
    render(<CommingSoonMock label="X / Twitter" icon={Twitter} caption={caption} />);

    expect(screen.getByText("Draft Preview")).toBeInTheDocument();
    expect(screen.getByText(caption)).toBeInTheDocument();
  });

  it("preserves multi-line captions (whitespace-pre-wrap) for thread content", () => {
    const caption = "Tweet 1/3\n\nTweet 2/3\n\nTweet 3/3";
    render(<CommingSoonMock label="X / Twitter" icon={Twitter} caption={caption} />);

    // getByText normalizes whitespace by default; use a function matcher
    // that checks the raw textContent so the embedded newlines are matched.
    const paragraph = screen.getByText(
      (_text, element) => element?.tagName === "P" && element.textContent === caption,
    );
    expect(paragraph).toBeInTheDocument();
    expect(paragraph.className).toContain("whitespace-pre-wrap");
  });
});
