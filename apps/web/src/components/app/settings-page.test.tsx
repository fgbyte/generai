import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import { SettingsPage } from "./settings-page";

// Mock the auth client used inside SettingsPage
const mockSignOut = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut: (...args: unknown[]) => mockSignOut(...args),
  },
}));

// Mock the router hook used inside SettingsPage
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("renders the Account section with user name and email", () => {
    render(<SettingsPage />);

    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Julian Sterling")).toBeInTheDocument();
    expect(screen.getByText("j.sterling@generai.luxe")).toBeInTheDocument();
  });

  it("renders the Studio Preferences section with Default AI Tone and Default Platform", () => {
    render(<SettingsPage />);

    expect(screen.getByText("Studio Preferences")).toBeInTheDocument();
    expect(screen.getByText("Default AI Tone")).toBeInTheDocument();
    expect(screen.getByText("Creative")).toBeInTheDocument();
    expect(screen.getByText("Default Platform")).toBeInTheDocument();
    expect(screen.getByText("Twitter (X)")).toBeInTheDocument();
  });

  it("renders the Rewards section with Generai Points data", () => {
    render(<SettingsPage />);

    expect(screen.getByText("Rewards")).toBeInTheDocument();
    expect(screen.getByText("Generai Points")).toBeInTheDocument();
    expect(screen.getByText("5,000")).toBeInTheDocument();
    expect(screen.getByText("Remaining")).toBeInTheDocument();
    expect(screen.getByText("Next drop in 4 days")).toBeInTheDocument();
  });

  it("renders the Sign Out button", () => {
    render(<SettingsPage />);

    expect(screen.getByText("Sign Out")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign Out/i }),
    ).toBeInTheDocument();
  });

  it("calls authClient.signOut and navigates to '/' when Sign Out is clicked", async () => {
    mockSignOut.mockResolvedValueOnce({});

    render(<SettingsPage />);

    const signOutButton = screen.getByRole("button", { name: /Sign Out/i });
    fireEvent.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchOptions: expect.objectContaining({
          onSuccess: expect.any(Function),
        }),
      }),
    );

    // Simulate calling the onSuccess callback that triggers navigation
    const callArgs = mockSignOut.mock.calls[0][0] as {
      fetchOptions: { onSuccess: () => void };
    };
    callArgs.fetchOptions.onSuccess();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  it("shows 'Signing out...' text and disables the button while signing out", async () => {
    let resolveSignOut: (value: unknown) => void;
    const signOutPromise = new Promise((resolve) => {
      resolveSignOut = resolve;
    });
    mockSignOut.mockImplementationOnce(() => signOutPromise);

    render(<SettingsPage />);

    const signOutButton = screen.getByRole("button", { name: /Sign Out/i });
    fireEvent.click(signOutButton);

    expect(screen.getByText("Signing out...")).toBeInTheDocument();
    expect(signOutButton).toBeDisabled();
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // Resolve sign-out inside act-compatible waitFor so React flushes state cleanly
    await waitFor(async () => {
      resolveSignOut({});
    });
  });

  it("renders the app version footer", () => {
    render(<SettingsPage />);

    expect(screen.getByText("Generai Luxe v2.4.0")).toBeInTheDocument();
    expect(
      screen.getByText("Made for the creators of tomorrow."),
    ).toBeInTheDocument();
  });
});
