import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryPage } from "./index";
import { generationStore } from "@/stores/generation-store";

vi.mock("@/components/top-app-bar", () => ({
  TopAppBar: () => <div data-testid="top-app-bar" />,
}));

vi.mock("@/components/bottom-nav-bar", () => ({
  BottomNavBar: () => <div data-testid="bottom-nav-bar" />,
}));

// Mock api-client to avoid auth-token.ts touching window.localStorage
// (Bun's jsdom throws "Cannot initialize local storage without a --localstorage-file path").
vi.mock("@/lib/api-client", () => ({
  authFetch: (...args: unknown[]) => fetch(...(args as Parameters<typeof fetch>)),
}));

// Hoist the navigate mock so it's available inside the vi.mock factory below
// (vi.mock is hoisted above all imports and runs before the module body).
const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <HistoryPage />
      </QueryClientProvider>,
    ),
  };
}

const SAMPLE_HISTORY = {
  items: [
    {
      id: "gc_today",
      content: "Thread body",
      prompt: "Write a launch thread",
      contentType: "thread",
      // Use real today so formatDateGroup yields "TODAY".
      createdAt: new Date().toISOString(),
    },
    {
      id: "gc_yesterday",
      content: "LinkedIn body",
      prompt: "Write a hiring update",
      contentType: "linkedin",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};

function mockGetOnce(fetchMock: ReturnType<typeof vi.spyOn>, body: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("HistoryPage", () => {
  beforeEach(() => {
    // Reset shared state between tests so the navigate mock and the
    // persisted generationStore don't leak across cases.
    navigateMock.mockReset();
    generationStore.setState((prev) => ({ ...prev, current: null }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders history items returned by GET /api/generate/history", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(SAMPLE_HISTORY), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderHistoryPage();

    expect(await screen.findByText("Write a launch thread")).toBeInTheDocument();
    expect(screen.getByText("Write a hiring update")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Delete "/i })).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/generate/history"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("renders the empty state when the endpoint returns no items", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderHistoryPage();

    expect(await screen.findByText("No Activity Yet")).toBeInTheDocument();
    expect(screen.getByText(/Your generated content will appear here/i)).toBeInTheDocument();
  });

  it("optimistically removes the item from the UI immediately and does NOT refetch after delete", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    // 1) Initial GET returns both items.
    mockGetOnce(fetchMock, SAMPLE_HISTORY);
    // 2) DELETE takes ~80ms to resolve so we can observe the optimistic state.
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve(
                new Response(JSON.stringify({ success: true }), {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                }),
              ),
            80,
          ),
        ),
    );

    const user = userEvent.setup();
    const { queryClient } = renderHistoryPage();

    // Wait for the GET to render both items.
    expect(await screen.findByText("Write a launch thread")).toBeInTheDocument();
    expect(screen.getByText("Write a hiring update")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Click the delete button for the first item.
    const deleteButtons = screen.getAllByRole("button", { name: /Delete "/i });
    const firstDelete = deleteButtons[0];
    if (!firstDelete) throw new Error("No delete button found");
    await user.click(firstDelete);

    // Optimistic: item disappears from the DOM BEFORE the server response settles.
    await waitFor(() => {
      expect(screen.queryByText("Write a launch thread")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Write a hiring update")).toBeInTheDocument();

    // Wait for the DELETE round-trip to complete.
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/generate/history"),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    // Give the mutation a tick to settle (any onSettled would fire here).
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Critical: after delete settles, we must NOT issue a refetch.
    // The optimistic UI works by updating the cache; a follow-up GET would
    // briefly re-show the deleted item before this refetch returns.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/generate/history"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/generate/history"),
      expect.objectContaining({ method: "DELETE" }),
    );

    // Cache should reflect the optimistic removal (no GET needed to confirm).
    const cached = queryClient.getQueryData<{ items: Array<{ id: string }> }>(["history"]);
    expect(cached?.items.map((i) => i.id)).toEqual(["gc_yesterday"]);
  });

  it("rolls back the optimistic removal when the DELETE request fails", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    mockGetOnce(fetchMock, SAMPLE_HISTORY);
    // DELETE takes ~80ms and then fails with 500.
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve(
                new Response(JSON.stringify({ error: "boom" }), {
                  status: 500,
                  headers: { "Content-Type": "application/json" },
                }),
              ),
            80,
          ),
        ),
    );

    const user = userEvent.setup();
    const { queryClient } = renderHistoryPage();

    expect(await screen.findByText("Write a launch thread")).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole("button", { name: /Delete "/i });
    const firstDelete = deleteButtons[0];
    if (!firstDelete) throw new Error("No delete button found");
    await user.click(firstDelete);

    // Optimistic: gone briefly (visible while DELETE is in flight).
    await waitFor(() => {
      expect(screen.queryByText("Write a launch thread")).not.toBeInTheDocument();
    });

    // Rollback: the item reappears after the server error.
    await waitFor(() => {
      expect(screen.getByText("Write a launch thread")).toBeInTheDocument();
    });
    expect(screen.getByText("Write a hiring update")).toBeInTheDocument();

    const cached = queryClient.getQueryData<{ items: Array<{ id: string }> }>(["history"]);
    expect(cached?.items.map((i) => i.id)).toEqual(["gc_today", "gc_yesterday"]);
  });

  it("hides a date group header when its last item is deleted", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    // Only one item, dated today.
    mockGetOnce(fetchMock, {
      items: [
        {
          id: "gc_only",
          content: "Solo",
          prompt: "Only item",
          contentType: "thread",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    // Slow DELETE so optimistic removal is observable.
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve(
                new Response(JSON.stringify({ success: true }), {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                }),
              ),
            80,
          ),
        ),
    );

    const user = userEvent.setup();
    renderHistoryPage();

    expect(await screen.findByText("Only item")).toBeInTheDocument();
    expect(screen.getByText("TODAY")).toBeInTheDocument();

    const deleteButton = screen.getByRole("button", { name: /Delete "/i });
    await user.click(deleteButton);

    // Item gone → empty state appears → no stranded "TODAY" header.
    await waitFor(() => {
      expect(screen.queryByText("Only item")).not.toBeInTheDocument();
    });
    expect(screen.getByText("No Activity Yet")).toBeInTheDocument();
    expect(screen.queryByText("TODAY")).not.toBeInTheDocument();
  });

  // ── Open-in-preview flow (click on card → generationStore + navigate) ──

  const THREAD_HISTORY = {
    items: [
      {
        id: "gc_thread",
        // Server joins thread content with "\n\n" (see generate.routes.ts:51).
        // The client must split it back into an array to match the shape
        // produced by useGenerateContent.
        content: "Tweet 1/3\n\nTweet 2/3\n\nTweet 3/3",
        prompt: "Launch thread",
        contentType: "thread",
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const INSTAGRAM_HISTORY = {
    items: [
      {
        id: "gc_ig",
        content: "Single IG caption body",
        prompt: "Caption for product launch",
        contentType: "instagram",
        createdAt: new Date().toISOString(),
      },
    ],
  };

  it("clicking a card populates the generationStore and navigates to /app/automate", async () => {
    mockGetOnce(vi.spyOn(globalThis, "fetch"), THREAD_HISTORY);

    const user = userEvent.setup();
    renderHistoryPage();

    const card = await screen.findByRole("button", { name: /Open "Launch thread"/i });
    await user.click(card);

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith({ to: "/app/automate" });

    const stored = generationStore.state.current;
    expect(stored).not.toBeNull();
    expect(stored?.id).toBe("gc_thread");
    expect(stored?.prompt).toBe("Launch thread");
    expect(stored?.contentType).toBe("thread");
  });

  it("splits thread content on '\\n\\n' into an array matching the generation shape", async () => {
    mockGetOnce(vi.spyOn(globalThis, "fetch"), THREAD_HISTORY);

    const user = userEvent.setup();
    renderHistoryPage();

    await user.click(await screen.findByRole("button", { name: /Open "Launch thread"/i }));

    const stored = generationStore.state.current;
    expect(stored?.content).toEqual(["Tweet 1/3", "Tweet 2/3", "Tweet 3/3"]);
  });

  it("keeps instagram content as a single-element array (no split)", async () => {
    mockGetOnce(vi.spyOn(globalThis, "fetch"), INSTAGRAM_HISTORY);

    const user = userEvent.setup();
    renderHistoryPage();

    await user.click(
      await screen.findByRole("button", { name: /Open "Caption for product launch"/i }),
    );

    const stored = generationStore.state.current;
    expect(stored?.contentType).toBe("instagram");
    expect(stored?.content).toEqual(["Single IG caption body"]);
    // History items don't carry the image — the re-upload UX in automate
    // handles regeneration when the image is missing.
    expect(stored?.imageBase64).toBeNull();
  });

  it("pressing Enter on a focused card triggers the same open flow", async () => {
    mockGetOnce(vi.spyOn(globalThis, "fetch"), THREAD_HISTORY);

    const user = userEvent.setup();
    renderHistoryPage();

    const card = await screen.findByRole("button", { name: /Open "Launch thread"/i });
    card.focus();
    await user.keyboard("{Enter}");

    expect(navigateMock).toHaveBeenCalledWith({ to: "/app/automate" });
    expect(generationStore.state.current?.id).toBe("gc_thread");
  });

  it("pressing Space on a focused card triggers the same open flow", async () => {
    mockGetOnce(vi.spyOn(globalThis, "fetch"), THREAD_HISTORY);

    const user = userEvent.setup();
    renderHistoryPage();

    const card = await screen.findByRole("button", { name: /Open "Launch thread"/i });
    card.focus();
    await user.keyboard(" ");

    expect(navigateMock).toHaveBeenCalledWith({ to: "/app/automate" });
    expect(generationStore.state.current?.id).toBe("gc_thread");
  });

  it("clicking the delete button does NOT trigger navigation (stopPropagation)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    mockGetOnce(fetchMock, SAMPLE_HISTORY);
    // Slow DELETE so the optimistic removal is observable mid-flight.
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve(
                new Response(JSON.stringify({ success: true }), {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                }),
              ),
            80,
          ),
        ),
    );

    const user = userEvent.setup();
    renderHistoryPage();

    // Wait for items to render.
    expect(await screen.findByText("Write a launch thread")).toBeInTheDocument();

    // Click delete on the first card. The card itself is a role="button"
    // with onClick — if stopPropagation is missing, this would also fire
    // handleOpen and navigate to /app/automate.
    const deleteButton = screen.getAllByRole("button", { name: /Delete "/i })[0];
    if (!deleteButton) throw new Error("No delete button found");
    await user.click(deleteButton);

    // Give any rogue propagation a tick to land.
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(navigateMock).not.toHaveBeenCalled();
    // And the store must NOT have been populated with this item.
    expect(generationStore.state.current).toBeNull();
  });
});
