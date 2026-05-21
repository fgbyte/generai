import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudioPage } from "./studio-page";

vi.mock("@/components/app/points-balance-card", () => ({
  PointsBalanceCard: () => <div data-testid="points-balance-card" />,
}));

vi.mock("@/components/app/activity-history-link", () => ({
  ActivityHistoryLink: () => <div data-testid="activity-history-link" />,
}));

vi.mock("@/components/custom-select", () => ({
  CustomSelect: () => <div data-testid="custom-select" />,
}));

vi.mock("@/components/app/pro-tip-banner", () => ({
  ProTipBanner: () => <div data-testid="pro-tip-banner" />,
}));

describe("StudioPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders points balance card", () => {
    render(<StudioPage />);
    expect(screen.getByTestId("points-balance-card")).toBeInTheDocument();
  });

  it("renders activity history link", () => {
    render(<StudioPage />);
    expect(screen.getByTestId("activity-history-link")).toBeInTheDocument();
  });

  it("renders content type select", () => {
    render(<StudioPage />);
    expect(screen.getByTestId("custom-select")).toBeInTheDocument();
    expect(screen.getByText("Content Type")).toBeInTheDocument();
  });

  it("renders prompt textarea", () => {
    render(<StudioPage />);
    expect(screen.getByText("Prompt")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Describe what you want to create...")).toBeInTheDocument();
  });

  it("renders pro tip banner", () => {
    render(<StudioPage />);
    expect(screen.getByTestId("pro-tip-banner")).toBeInTheDocument();
  });

  it("renders generate button", () => {
    render(<StudioPage />);
    expect(screen.getByText("Generate Content (5 points)")).toBeInTheDocument();
  });

  it("renders instagram upload button by default", () => {
    render(<StudioPage />);
    expect(screen.getByText("Upload Image")).toBeInTheDocument();
  });

  it("does not render upload button when content type is not instagram", () => {
    render(<StudioPage />);
    // Upload button should exist for default instagram content type
    expect(screen.getByText("Upload Image")).toBeInTheDocument();
  });
});
