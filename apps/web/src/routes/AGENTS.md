# apps/web/src/routes

**Scope**: Route-level Hono RPC client setup and TanStack Query patterns for the filesystem-based route components.

## Overview

This directory contains the file-based TanStack Router route components. Each `.tsx` file maps to a URL path. These routes are the primary consumers of Hono's RPC-typed API client and TanStack Query hooks. Two canonical patterns exist:

- **Simple GET/display** — a `useQuery` call with fallback rendering (`app/index.tsx`).
- **Full CRUD with optimistic updates** — three `useMutation` blocks (create, update, delete) with cache manipulation (`todos.tsx`).

For app-wide conventions (port, routing, state strategy), see `apps/web/AGENTS.md`. This file focuses on route-level Hono RPC + TanStack Query usage only.

## Where to Look

| Pattern              | Reference File                                          | Lines      |
| -------------------- | ------------------------------------------------------- | ---------- |
| Hono client setup    | `apps/web/src/routes/todos.tsx`                         | 31-33      |
| Simple GET query     | `apps/web/src/routes/app/index.tsx`                     | 35-42      |
| Optimistic create    | `apps/web/src/routes/todos.tsx`                         | 52-108     |
| Optimistic toggle    | `apps/web/src/routes/todos.tsx`                         | 110-155    |
| Optimistic delete    | `apps/web/src/routes/todos.tsx`                         | 157-189    |
| QueryClient defaults | `apps/web/src/main.tsx`                                 | 8-15       |
| Test wrapper         | `apps/web/src/components/app/history-page.test.tsx`     | 14-32      |
| Server type export   | `apps/server/src/index.ts`                              | 1-37       |

## Hono RPC Client Setup

Every route file that calls the API creates a module-scope Hono RPC client. The client must be declared **outside the component body** to avoid re-creating it on every render.

**Canonical form** (see `apps/web/src/routes/todos.tsx:31-33`):

```ts
import { hc } from "hono/client";
import { env } from "@generai/env/web";
import type { AppType } from "@server/index";

const client = hc<AppType>(env.VITE_SERVER_URL, {
  init: { credentials: "include" },
});
```

Key rules:

- **`credentials: "include"` is mandatory** for any endpoint behind `authMiddleware`. All routes except `/api/people` and `/api/test` require auth cookies. Without it, the server returns 401. See `apps/server/src/routes/generate.routes.ts:20`.
- **`AppType` is imported from `@server/index`**, not a local path. The server exports `AppType = typeof router` at `apps/server/src/index.ts:37`.
- **Module-scope only.** Never instantiate the client inside the component body.

**Known issue**: The demo route at `apps/web/src/routes/demo.tanstack-query.tsx:7` omits `credentials: "include"`:

```ts
const client = hc<AppType>(env.VITE_SERVER_URL); // BUG: no credentials
```

This works only for the public `/api/people` endpoint. Copying this for an authenticated endpoint will silently 401. Always include `credentials: "include"`.

## Reading Data (useQuery)

Use `useQuery` for all GET requests. The canonical simple-GET pattern is at `apps/web/src/routes/app/index.tsx:35-42`:

```ts
const { data } = useQuery({
  queryKey: ["points"],
  queryFn: async () => {
    const res = await client.api.generate.points.$get();
    if (!res.ok) throw new Error("Failed to fetch points");
    return res.json();
  },
});
```

**What to watch for:**

- The `queryKey` is a flat array with a single string. No nesting, no factories.
- The `queryFn` calls the typed Hono RPC method and throws on non-ok.
- The return type of `res.json()` is inferred from the server's route definition.

**Rendering with fallback** (see `apps/web/src/routes/app/index.tsx:51`):

```tsx
<PointsBalanceCard balance={data?.points ?? 0} />
```

The `data?.X ?? defaultValue` pattern is the standard fallback for display-only queries. If the query fails or is loading, the UI shows a sensible default instead of nothing.

For list queries with full state handling, see `apps/web/src/routes/todos.tsx:43-50`:

```ts
const { data, isError, error, isLoading } = useQuery({
  queryKey: ["todos"],
  queryFn: async () => {
    const res = await client.api.todos.$get();
    if (!res.ok) throw new Error("Failed to fetch todos");
    return res.json();
  },
});

const todos = Array.isArray(data) ? data : [];
```

The `todos.tsx` pattern exports `isError`, `error`, and `isLoading` and renders four distinct states: error card, loading skeleton, empty state, and data list.

## Writing Data (useMutation)

The `todos.tsx` file (`apps/web/src/routes/todos.tsx:52-189`) is the canonical full-CRUD reference. All three mutations follow the same structure:

1. `cancelQueries` in `onMutate` to prevent race conditions
2. Snapshot previous cache for rollback
3. Optimistically `setQueryData`
4. Return rollback context from `onMutate`
5. `onError` restores the snapshot
6. `onSettled` (or `onSuccess`) syncs with server

All three use the same context type (see `apps/web/src/routes/todos.tsx:26-29`):

```ts
interface TodoMutationContext {
  previousTodos: Todo[] | undefined;
  optimisticTodo?: Todo;
}
```

### Create (Add to List)

See `apps/web/src/routes/todos.tsx:52-108`:

```ts
const addTodoMutation = useMutation<Todo, Error, string, TodoMutationContext>({
  mutationFn: async (title: string) => {
    const res = await client.api.todos.$post({
      json: { title, description: "" },
    });
    if (!res.ok) throw new Error("Failed to create todo");
    return res.json() as Promise<Todo>;
  },
  onMutate: async (title) => {
    await queryClient.cancelQueries({ queryKey: ["todos"] });
    const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);

    const optimisticTodo: Todo = {
      id: `temp-${Date.now()}`,
      title,
      description: "",
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: "",
    };

    queryClient.setQueryData<Todo[]>(["todos"], (old) => {
      const oldTodos = old ?? [];
      return [optimisticTodo, ...oldTodos];
    });

    setNewTodoTitle("");
    return { previousTodos, optimisticTodo };
  },
  onSuccess: (data, _variables, context) => {
    queryClient.setQueryData<Todo[]>(["todos"], (old) => {
      if (!old) return [data];
      return old.map((todo) =>
        todo.id === context?.optimisticTodo?.id ? data : todo
      );
    });
  },
  onError: (err, _newTodo, context) => {
    console.error("Failed to create todo:", err);
    if (context?.previousTodos !== undefined) {
      queryClient.setQueryData(["todos"], context.previousTodos);
    } else {
      queryClient.removeQueries({ queryKey: ["todos"] });
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["todos"] });
  },
});
```

Key points: uses a temp ID (`temp-${Date.now()}`); `onSuccess` replaces the temp item with the server response to avoid flicker; `onSettled` invalidates for eventual consistency.

### Update (Toggle)

See `apps/web/src/routes/todos.tsx:110-155`:

```ts
const toggleTodoMutation = useMutation<
  Todo,
  Error,
  { id: string; completed: boolean },
  TodoMutationContext
>({
  mutationFn: async ({ id, completed }) => {
    const res = await client.api.todos[":id"].$patch({
      param: { id },
      json: { completed },
    });
    if (!res.ok) throw new Error("Failed to update todo");
    return res.json() as Promise<Todo>;
  },
  onMutate: async ({ id, completed }) => {
    await queryClient.cancelQueries({ queryKey: ["todos"] });
    const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);
    queryClient.setQueryData<Todo[]>(["todos"], (old) => {
      if (!old) return old;
      return old.map((todo) =>
        todo.id === id ? { ...todo, completed } : todo
      );
    });
    return { previousTodos };
  },
  onSuccess: (data, variables) => {
    queryClient.setQueryData<Todo[]>(["todos"], (old) => {
      if (!old) return old;
      return old.map((todo) =>
        todo.id === variables.id ? data : todo
      );
    });
  },
  onError: (_err, _variables, context) => {
    if (context?.previousTodos !== undefined) {
      queryClient.setQueryData(["todos"], context.previousTodos);
    }
  },
  // No onSettled — onSuccess already updated cache.
  // Skips invalidation to avoid flicker from refetching and re-toggling.
});
```

Notable: this mutation **deliberately omits** `onSettled` invalidation. Because `onSuccess` already overwrites with the server response, an invalidate would trigger a refetch that could re-toggle the same item.

### Delete

See `apps/web/src/routes/todos.tsx:157-189`:

```ts
const deleteTodoMutation = useMutation<unknown, Error, string, TodoMutationContext>({
  mutationFn: async (id: string) => {
    const res = await client.api.todos[":id"].$delete({
      param: { id },
    });
    if (!res.ok) throw new Error("Failed to delete todo");
    return res.json();
  },
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ["todos"] });
    const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);
    queryClient.setQueryData<Todo[]>(["todos"], (old) => {
      if (!old) return old;
      return old.filter((todo) => todo.id !== id);
    });
    return { previousTodos };
  },
  onError: (_err, _id, context) => {
    if (context?.previousTodos !== undefined) {
      queryClient.setQueryData(["todos"], context.previousTodos);
    }
  },
  // No onSettled — item already removed. Refetching would briefly re-show it.
});
```

Same trade-off as toggle: `onError` rollback, no `onSettled` invalidation.

### Reference Implementation

- **Full CRUD**: `apps/web/src/routes/todos.tsx:52-189` — the three mutations above.
- **Simple GET**: `apps/web/src/routes/app/index.tsx:35-42` — `useQuery` with `data?.X ?? defaultValue`.

## Query Key Conventions

The codebase uses flat array query keys. No nested keys, no factory functions, no filters as tuple items.

**Keys in use:**

| Query Key   | File                                      | Lines      | Endpoint                  |
| ----------- | ----------------------------------------- | ---------- | ------------------------- |
| `["todos"]` | `apps/web/src/routes/todos.tsx`           | 44, 62, 79 | `GET /api/todos`          |
| `["points"]`| `apps/web/src/routes/app/index.tsx`       | 36         | `GET /api/generate/points`|
| `["people"]`| `apps/web/src/routes/demo.tanstack-query.tsx` | 15    | `GET /api/people`         |

**Rules:**

- **Always use arrays**, never plain strings. `["todos"]` not `"todos"`. Enables prefix-based invalidation.
- **Keep keys flat.** The codebase does not use hierarchical keys like `["todos", id]`. Add hierarchy only if you need sub-resource invalidation.
- **No factory functions.** Unlike the general TanStack Query recommendation, this codebase writes keys inline. Acceptable at current scale (3 keys).

## Caching

**Defaults** configured at `apps/web/src/main.tsx:8-15`:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

- **`staleTime: 5 minutes`** — data is fresh for 5 minutes. Navigating away and back shows cached data without a network request.
- **`refetchOnWindowFocus: false`** — no refetch on tab return.
- **`gcTime`** left at default (5 minutes).

**When to override `staleTime`:** The codebase has no per-query overrides. If you add one, keep it short (e.g., 30s for balance data that users expect to update after a mutation).

**Invalidation strategy:**

- Mutations with optimistic updates invalidate `["todos"]` in `onSettled` (see `todos.tsx:104-107`).
- Mutations that update cache directly in `onSuccess` skip invalidation (see `todos.tsx:153-155` and `todos.tsx:186-188`).
- The user-facing "Retry" button at `todos.tsx:214` calls `queryClient.invalidateQueries({ queryKey: ["todos"] })`.

## Error Handling

Two distinct strategies.

### Presentational fallback (most routes)

For display-only data, use `data?.X ?? defaultValue`. See `apps/web/src/routes/app/index.tsx:51`:

```tsx
balance={data?.points ?? 0}
```

Shows 0 while loading, 0 on error, real value on success. No error UI, no spinner, no retry button.

### Full error states (todos)

For interactive lists, render distinct error, loading, and empty states (see `todos.tsx:198-280`). The error card shows the message plus a Retry button that calls `queryClient.invalidateQueries({ queryKey: ["todos"] })`. Loading uses `<Skeleton>` components. Empty state shows a "No tasks yet" message.

**Rule of thumb:** If the data is the page's primary interactive content, render error/loading/empty states. If supplementary or cosmetic, use the `data?.X ?? defaultValue` fallback and stay silent.

## Testing

Route files in this codebase are **not** unit-tested. Only pure presentational components (like `history-page.tsx`) have tests. The pattern below is for reference if a route-level test becomes warranted.

The canonical test wrapper at `apps/web/src/components/app/history-page.test.tsx:14-32`:

```ts
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
```

`history-page.test.tsx` mocks `fetch` directly (not Hono RPC) with `vi.spyOn(globalThis, "fetch")`. Follow this pattern:

1. Create `createTestQueryClient` with `retry: false`.
2. Wrap the component in `QueryClientProvider`.
3. Mock `fetch` with `vi.spyOn` to return controlled JSON responses.
4. Assert on rendered text.

## Project-Specific Gotchas

### Hono RPC type chain has pre-existing inference limits

The `client.api.todos.*` access in `todos.tsx:31-33` may produce TS2339 errors on nested `.route()` registrations (see `apps/server/src/index.ts:27-29`). **This is a pre-existing limitation** of Hono's type-level inference. The pattern is correct and compiles at runtime. Do NOT work around it with `as any` or `@ts-ignore`.

### Auth cookies are mandatory for protected routes

All routes in `generate.routes.ts` run through `authMiddleware` (see `apps/server/src/routes/generate.routes.ts:20`). The client MUST pass `init: { credentials: "include" }` or the server returns 401. Public endpoints only: `/api/people` and `/api/test` (see `apps/server/src/index.ts:27-28`).

### Lint path requirement

`bunx oxlint` resolves paths against cwd. Run from `apps/web/` with a relative path:

```bash
cd apps/web && bunx oxlint src/routes/
```

Running `bunx oxlint apps/web/src/routes/` from repo root fails because oxlint interprets the path relative to cwd.

### Port convention

| App    | Port |
| ------ | ---- |
| Web    | 3001 |
| Server | 3000 |

`env.VITE_SERVER_URL` points to port 3000.

### Module-scope client placement

The Hono client must be at module level, outside the component function. See `todos.tsx:31` and `app/index.tsx:30`. Instantiating inside the component creates a new `hc` instance on every render.

### Import ordering

External packages first, then `@/...` aliases. See `todos.tsx:1-13`:

```ts
import { createFileRoute } from "@tanstack/react-router";
import { env } from "@generai/env/web";
import { hc } from "hono/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppType } from "@server/index";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// ...
```

### `useQuery` before `useState` and `useNavigate`

Place `useQuery` before `useState`/`useNavigate` in the component body. See `app/index.tsx:34-45`:

```ts
function RouteComponent() {
  const { data } = useQuery({ queryKey: ["points"], ... });
  const [contentType, setContentType] = useState("instagram");
  const navigate = useNavigate();
```

## Anti-Patterns

- **Do NOT instantiate the Hono client inside the component body.** Module-scope only. Each render creates wasted resources.
- **Do NOT omit `credentials: "include"` for protected endpoints.** The demo route (`demo.tanstack-query.tsx:7`) is missing this flag and would fail on any authenticated endpoint.
- **Do NOT use `as any` or `@ts-ignore` to silence Hono RPC type chain errors.** The TS2339 errors are a known inference limitation. The code compiles and runs correctly.
- **Do NOT skip `cancelQueries` before `setQueryData` in `onMutate`.** In-flight refetches overwrite the optimistic update. Always cancel first (see `todos.tsx:62`).
- **Do NOT forget to return `{ previousTodos }` from `onMutate`.** `onError` receives this as its third argument. Without a rollback snapshot, the UI stays in the broken optimistic state.
- **Do NOT skip `invalidateQueries` in `onSettled` for mutations that don't update cache in `onSuccess`.** The addTodoMutation has it at `todos.tsx:104-107`. Toggle and delete skip it because they already update in `onSuccess`.
- **Do NOT use string query keys.** Always arrays: `["todos"]` not `"todos"`. String keys break prefix-based invalidation.
- **Do NOT add custom hooks for `usePoints` / `useTodos` in shared `lib/`.** Queries are co-located with the route component (see `todos.tsx:43-50` and `app/index.tsx:35-42`).
- **Do NOT add error UI or retry buttons for read-only fallback queries.** The `data?.points ?? 0` pattern (`app/index.tsx:51`) is the entire error story for display-only data.
- **Do NOT cross-component-invalidate without a clear consumer contract.** Invalidating `["points"]` from a generate mutation is safe only if the points route is a known consumer.
