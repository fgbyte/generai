import { createFileRoute } from "@tanstack/react-router";
import { env } from "@generai/env/web";
import { hc } from "hono/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppType } from "@server/index";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, AlertCircle, ClipboardList } from "lucide-react";

// Types for TanStack Query optimistic UI
interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface TodoMutationContext {
  previousTodos: Todo[] | undefined;
  optimisticTodo?: Todo;
}

const client = hc<AppType>(env.VITE_SERVER_URL, {
  init: { credentials: "include" },
});

export const Route = createFileRoute("/todos")({
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();
  const [newTodoTitle, setNewTodoTitle] = useState("");

  const { data, isError, error, isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const res = await client.api.todos.$get();
      if (!res.ok) throw new Error("Failed to fetch todos");
      return res.json();
    },
  }); //✅

  const addTodoMutation = useMutation<Todo, Error, string, TodoMutationContext>({
    mutationFn: async (title: string) => {
      const res = await client.api.todos.$post({
        json: { title, description: "" },
      });
      if (!res.ok) throw new Error("Failed to create todo");
      return res.json() as Promise<Todo>;
    },
    onMutate: async (title) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["todos"] });

      // Snapshot previous value with proper typing
      const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);

      // Optimistically add new todo
      const optimisticTodo: Todo = {
        id: `temp-${Date.now()}`,
        title,
        description: "",
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: "",
      };

      // Apply optimistic update with proper typing
      queryClient.setQueryData<Todo[]>(["todos"], (old) => {
        const oldTodos = old ?? [];
        return [optimisticTodo, ...oldTodos];
      });

      setNewTodoTitle("");

      return { previousTodos, optimisticTodo };
    },
    onSuccess: (data, _variables, context) => {
      // Replace optimistic todo with real server response
      queryClient.setQueryData<Todo[]>(["todos"], (old) => {
        if (!old) return [data];
        return old.map((todo) => (todo.id === context?.optimisticTodo?.id ? data : todo));
      });
    },
    onError: (err, _newTodo, context) => {
      // Revert on error
      console.error("Failed to create todo:", err);
      if (context?.previousTodos !== undefined) {
        queryClient.setQueryData(["todos"], context.previousTodos);
      } else {
        queryClient.removeQueries({ queryKey: ["todos"] });
      }
    },
    onSettled: () => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  const toggleTodoMutation = useMutation<
    Todo,
    Error,
    { id: string; completed: boolean },
    TodoMutationContext
  >({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await client.api.todos[":id"].$patch({
        param: { id },
        json: { completed },
      });
      if (!res.ok) throw new Error("Failed to update todo");
      return res.json() as Promise<Todo>;
    },
    onMutate: async ({ id, completed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["todos"] });

      // Snapshot previous value with proper typing
      const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);

      // Optimistically update todo with proper typing
      queryClient.setQueryData<Todo[]>(["todos"], (old) => {
        if (!old) return old;
        return old.map((todo) => (todo.id === id ? { ...todo, completed } : todo));
      });

      return { previousTodos };
    },
    onSuccess: (data, variables) => {
      // Update cache with server response to ensure consistency
      // This prevents flicker by updating before any refetch happens
      queryClient.setQueryData<Todo[]>(["todos"], (old) => {
        if (!old) return old;
        return old.map((todo) => (todo.id === variables.id ? data : todo));
      });
    },
    onError: (_err, _variables, context) => {
      // Revert on error
      if (context?.previousTodos !== undefined) {
        queryClient.setQueryData(["todos"], context.previousTodos);
      }
    },
    // No onSettled invalidate - we already updated cache in onSuccess
    // This avoids the flicker from refetching
  });

  const deleteTodoMutation = useMutation<unknown, Error, string, TodoMutationContext>({
    mutationFn: async (id: string) => {
      const res = await client.api.todos[":id"].$delete({
        param: { id },
      });
      if (!res.ok) throw new Error("Failed to delete todo");
      return res.json();
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["todos"] });

      // Snapshot previous value with proper typing
      const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);

      // Optimistically remove todo with proper typing
      queryClient.setQueryData<Todo[]>(["todos"], (old) => {
        if (!old) return old;
        return old.filter((todo) => todo.id !== id);
      });

      return { previousTodos };
    },
    onError: (_err, _id, context) => {
      // Revert on error - restore the deleted item
      if (context?.previousTodos !== undefined) {
        queryClient.setQueryData(["todos"], context.previousTodos);
      }
    },
    // No onSettled invalidate - the item is already removed from UI
    // This prevents the flicker from refetching and re-removing
    // Trade-off: cache might be slightly stale if external changes occur
  });

  const handleAddTodo = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (newTodoTitle.trim()) {
      addTodoMutation.mutate(newTodoTitle.trim());
    }
  };

  // Error state - Query failed
  if (isError) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-destructive flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-medium">Error loading todos</p>
                <p className="text-muted-foreground text-sm">{error.message}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["todos"] })}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const todos = Array.isArray(data) ? data : [];
  const completedCount = todos.filter((todo) => todo.completed).length;
  const totalCount = todos.length;

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5" />
              Todo List
            </CardTitle>
            {!isLoading && (
              <div className="text-muted-foreground text-sm">
                {completedCount} / {totalCount} completed
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new todo form */}
          <form onSubmit={handleAddTodo} className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Add a new task..."
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                disabled={isLoading || addTodoMutation.isPending}
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading || addTodoMutation.isPending || !newTodoTitle.trim()}
            >
              <Plus className="size-4" />
              Add
            </Button>
          </form>

          {/* Todo list */}
          <div className="space-y-2">
            {isLoading ? (
              // Loading skeletons with proper accessibility
              <div className="space-y-2" aria-label="Loading todos">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : todos.length === 0 ? (
              // Empty state
              <div className="text-muted-foreground py-12 text-center">
                <ClipboardList className="mx-auto mb-3 size-12 opacity-20" />
                <p className="text-sm font-medium">No tasks yet</p>
                <p className="text-xs">Add a task above to get started</p>
              </div>
            ) : (
              // Todo items
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className="hover:bg-muted/50 group flex items-center gap-3 rounded-none border p-3 transition-colors"
                >
                  <Checkbox
                    id={`todo-${todo.id}`}
                    checked={todo.completed ?? false}
                    onCheckedChange={(checked) =>
                      toggleTodoMutation.mutate({
                        id: todo.id,
                        completed: checked === true,
                      })
                    }
                    aria-label={`Mark "${todo.title}" as ${todo.completed ? "incomplete" : "complete"}`}
                  />
                  <Label
                    htmlFor={`todo-${todo.id}`}
                    className={`flex-1 cursor-pointer text-sm ${
                      todo.completed ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {todo.title}
                  </Label>
                  {todo.description && (
                    <span className="text-muted-foreground hidden text-xs sm:inline">
                      {todo.description}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTodoMutation.mutate(todo.id)}
                    className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={`Delete "${todo.title}"`}
                  >
                    <Trash2 className="text-destructive size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Progress bar - only show when loaded and has items */}
          {!isLoading && totalCount > 0 && (
            <div className="space-y-1">
              <div className="bg-muted h-1.5 w-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
              <p className="text-muted-foreground text-xs text-center">
                {Math.round((completedCount / totalCount) * 100)}% complete
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
