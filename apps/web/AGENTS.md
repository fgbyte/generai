# apps/web

**Scope**: Frontend application - React + TanStack Router + Tailwind v4 + shadcn/ui

## Overview

Client-side SPA with file-based routing via TanStack Router, Tailwind CSS v4 styling, and shadcn/ui components.

## Structure

```
apps/web/
├── src/
│   ├── routes/          # File-based routes (TanStack Router)
│   ├── components/      # React components
│   │   └── ui/          # shadcn/ui components
│   ├── lib/             # Utility functions
│   └── index.css        # Tailwind + CSS vars
├── index.html
└── vite.config.ts       # Vite + Tailwind v4 plugin
```

## Where to Look

| Task          | Location                                             |
| ------------- | ---------------------------------------------------- |
| Add route     | `src/routes/` - create `.tsx` file                   |
| Route layout  | `src/routes/__root.tsx`                              |
| UI components | `src/components/ui/`                                 |
| Styling       | `src/index.css` - Tailwind v4 CSS vars               |
| Vite config   | `vite.config.ts` - Tailwind + TanStack Router plugin |

## Conventions

- **Routes**: File-based routing. Route params: `$param.tsx`, Layout: `__root.tsx`
- **Components**: shadcn/ui in `components/ui/`, app components in `components/`
- **Styling**: Tailwind v4 - no tailwind.config.js, configured in Vite plugin
- **Icons**: Lucide React (`lucide-react`)
- **State**: TanStack Store for global state, TanStack Query for server state

## Anti-Patterns

- **NEVER import from** `routeTree.gen.ts` - it's auto-generated
- **No direct API calls** - use TanStack Query hooks
- **No class components** - functional components only

## Commands

```bash
bun run dev        # Vite dev server (port 3001)
bun run build      # Production build
bun run check-types # TypeScript + TanStack Router gen
```

## Optimistic UI Pattern

Use optimistic updates for instant UI feedback on mutations. The UI updates immediately, then syncs with the server.

### Pattern Structure

```typescript
const mutation = useMutation({
  mutationFn: async (variables) => {
    // API call
    const res = await api.endpoint.$method(variables);
    if (!res.ok) throw new Error("Failed");
    return res.json();
  },

  // 1. Optimistically update UI BEFORE request
  onMutate: async (variables) => {
    await queryClient.cancelQueries({ queryKey: ["data"] });
    const previousData = queryClient.getQueryData(["data"]);

    queryClient.setQueryData(["data"], (old) => {
      // Return updated data
      return updatedOld;
    });

    return { previousData }; // Context for rollback
  },

  // 2. Rollback on error
  onError: (_err, _variables, context) => {
    queryClient.setQueryData(["data"], context?.previousData);
  },

  // 3. Sync with server when settled
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["data"] });
  },
});
```

### Examples by Operation Type

**Create (Add to list):**

```typescript
onMutate: async (newItem) => {
  await queryClient.cancelQueries({ queryKey: ["items"] });
  const previousItems = queryClient.getQueryData(["items"]);

  const optimisticItem = {
    id: `temp-${Date.now()}`,
    ...newItem,
    createdAt: new Date().toISOString(),
  };

  queryClient.setQueryData(["items"], (old) => {
    return old ? [optimisticItem, ...old] : [optimisticItem];
  });

  return { previousItems };
},
```

**Update (Modify existing):**

```typescript
onMutate: async ({ id, updates }) => {
  await queryClient.cancelQueries({ queryKey: ["items"] });
  const previousItems = queryClient.getQueryData(["items"]);

  queryClient.setQueryData(["items"], (old) => {
    return old?.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
  });

  return { previousItems };
},
```

**Delete (Remove from list):**

```typescript
onMutate: async (id) => {
  await queryClient.cancelQueries({ queryKey: ["items"] });
  const previousItems = queryClient.getQueryData(["items"]);

  queryClient.setQueryData(["items"], (old) => {
    return old?.filter((item) => item.id !== id);
  });

  return { previousItems };
},
```

### Key Rules

1. **Always cancel queries first** - Prevents race conditions
2. **Snapshot previous data** - Needed for rollback
3. **Return context from onMutate** - Passed to onError
4. **Don't disable UI during mutation** - Let user interact freely
5. **Always invalidate on settled** - Ensures server sync

### When to Use

| Use Optimistic  | Don't Use            |
| --------------- | -------------------- |
| Toggle switches | Payment transactions |
| Delete items    | Irreversible actions |
| Reorder lists   | Critical data writes |
| Like/upvote     | Multi-step workflows |

### Reference Implementation

See `src/routes/todos.tsx` for complete optimistic UI implementation with all three operations (create, update, delete).

## Notes

- Port 3001 (server runs on 3000)
- TanStack Router generates `routeTree.gen.ts` on dev/build
- Environment vars via `@generai/env/web`
