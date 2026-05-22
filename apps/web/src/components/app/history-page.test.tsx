import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoryPage } from "./history-page";

vi.mock("@/components/top-app-bar", () => ({
  TopAppBar: () => <div data-testid="top-app-bar" />,
}));

vi.mock("@/components/bottom-nav-bar", () => ({
  BottomNavBar: () => <div data-testid="bottom-nav-bar" />,
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderHistoryPage() {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <HistoryPage />
    </QueryClientProvider>,
  );
}

describe("HistoryPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders history items returned by GET /api/generate/history", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "gc_today",
              content: "Thread body",
              prompt: "Write a launch thread",
              contentType: "thread",
              createdAt: "2026-05-20T10:15:00.000Z",
            },
            {
              id: "gc_yesterday",
              content: "LinkedIn body",
              prompt: "Write a hiring update",
              contentType: "linkedin",
              createdAt: "2026-05-19T16:30:00.000Z",
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    renderHistoryPage();

    expect(await screen.findByText("Write a launch thread")).toBeInTheDocument();
    expect(screen.getByText("Write a hiring update")).toBeInTheDocument();
    expect(screen.getAllByText("5 pts")).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith("/mock/api/generate/history.json");
  });

  it("renders the empty state when the endpoint returns no items", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    renderHistoryPage();

    expect(await screen.findByText("No Activity Yet")).toBeInTheDocument();
    expect(screen.getByText(/Your generated content will appear here/i)).toBeInTheDocument();
  });
});
