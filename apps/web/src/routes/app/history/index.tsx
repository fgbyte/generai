import { createFileRoute } from "@tanstack/react-router";
import {
  AtSign,
  BriefcaseBusiness,
  Camera,
  ChevronRight,
  Filter,
  Sparkles,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { env } from "@generai/env/web";
import { hc } from "hono/client";
import type { AppType } from "@server/index";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

interface HistoryItem {
  id: string;
  content: string;
  prompt: string;
  contentType: string;
  createdAt: string;
}

interface HistoryResponse {
  items: HistoryItem[];
}

interface HistoryMutationContext {
  previousHistory: HistoryResponse | undefined;
}

const client = hc<AppType>(env.VITE_SERVER_URL, {
  init: { credentials: "include" },
});

const CONTENT_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; points: number }
> = {
  thread: {
    label: "Twitter Thread Generation",
    icon: <AtSign className="size-5" />,
    points: 5,
  },
  instagram: {
    label: "Instagram Caption",
    icon: <Camera className="size-5" />,
    points: 5,
  },
  linkedin: {
    label: "LinkedIn Post",
    icon: <BriefcaseBusiness className="size-5" />,
    points: 5,
  },
};

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDate.getTime() === today.getTime()) return "TODAY";
  if (itemDate.getTime() === yesterday.getTime()) return "YESTERDAY";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (itemDate.getTime() === today.getTime()) return `Today, ${time}`;
  if (itemDate.getTime() === yesterday.getTime()) return `Yesterday, ${time}`;
  return time;
}

function groupByDate(items: HistoryItem[]): Map<string, HistoryItem[]> {
  const groups = new Map<string, HistoryItem[]>();
  for (const item of items) {
    const key = formatDateGroup(item.createdAt);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function ActivityCard({
  item,
  onDelete,
  isDeleting,
}: {
  item: HistoryItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const config = CONTENT_TYPE_CONFIG[item.contentType] ?? {
    label: item.contentType,
    icon: <Sparkles className="size-5" />,
    points: 5,
  };

  return (
    <div className="list-item">
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-surface-form flex items-center justify-center flex-shrink-0 self-start">
        <span className="text-white">{config.icon}</span>
      </div>

      {/* Content */}
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-start mb-xxs">
          <span className="text-white font-headline-md text-[15px]">{config.label}</span>
          <Badge
            variant="secondary"
            className="bg-secondary/12 text-secondary text-[10px] font-bold"
          >
            {config.points} pts
          </Badge>
        </div>
        <p className="text-text-dim text-caption-xs line-clamp-2 mb-sm leading-snug">
          {item.prompt}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-text-muted text-caption-xs italic">
            {formatTime(item.createdAt)}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(item.id)}
              disabled={isDeleting}
              className="h-7 w-7 text-text-muted hover:text-destructive"
              aria-label={`Delete "${item.prompt}"`}
            >
              <Trash2 className="size-4" />
            </Button>
            <ChevronRight className="size-[18px] text-text-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DateHeader({ label }: { label: string }) {
  return <p className="text-text-muted font-mono-label text-mono-label mt-xl px-xs">{label}</p>;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-section text-center">
      <div className="w-12 h-12 rounded-full bg-surface-form flex items-center justify-center mb-md">
        <Sparkles className="size-6 text-text-muted" />
      </div>
      <h3 className="font-headline-md text-headline-md text-white mb-sm">No Activity Yet</h3>
      <p className="text-text-dim text-body-md max-w-xs">
        Your generated content will appear here. Head to the Studio to create your first post!
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive">
      <CardContent className="pt-6">
        <div className="text-destructive flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-medium">Error loading history</p>
            <p className="text-muted-foreground text-sm">{message}</p>
          </div>
        </div>
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

export function HistoryPage() {
  const queryClient = useQueryClient();

  const { data, isError, error, isLoading } = useQuery<HistoryResponse>({
    queryKey: ["history"],
    queryFn: async () => {
      const res = await client.api.generate.history.$get();
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json();
    },
  });

  const deleteHistoryMutation = useMutation<unknown, Error, string, HistoryMutationContext>({
    mutationFn: async (id: string) => {
      const res = await client.api.generate.history.$delete({
        query: { id },
      });
      if (!res.ok) throw new Error("Failed to delete history item");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["history"] });
      const previousHistory = queryClient.getQueryData<HistoryResponse>(["history"]);

      queryClient.setQueryData<HistoryResponse>(["history"], (old) => {
        if (!old) return old;
        return {
          items: old.items.filter((item) => item.id !== id),
        };
      });

      return { previousHistory };
    },
    onError: (err, _id, context) => {
      console.error("Failed to delete history item:", err);
      if (context?.previousHistory !== undefined) {
        queryClient.setQueryData(["history"], context.previousHistory);
      } else {
        queryClient.removeQueries({ queryKey: ["history"] });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  const items = data?.items ?? [];
  const grouped = groupByDate(items);
  const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

  const handleDelete = (id: string) => {
    deleteHistoryMutation.mutate(id);
  };

  return (
    <div className="font-body-md text-body-md pb-section min-h-screen bg-black text-white">
      <main className="max-w-container mx-auto px-lg flex flex-col gap-lg relative z-10">
        {/* Header */}
        <div className="mb-xl flex justify-between items-end">
          <div>
            <p className="text-primary font-mono-label text-mono-label mb-xs">ACTIVITY</p>
            <h2 className="font-display-xl text-display-xl">History</h2>
          </div>
          <Button
            variant="outline"
            className="btn-glass text-caption-xs font-button-md text-white rounded-lg"
          >
            <Filter className="size-4" />
            Filters
          </Button>
        </div>

        {/* Activity Feed */}
        {isError ? (
          <ErrorState
            message={errorMessage}
            onRetry={() => queryClient.invalidateQueries({ queryKey: ["history"] })}
          />
        ) : isLoading ? (
          <div className="space-y-md">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-md">
            {Array.from(grouped.entries()).map(([dateLabel, dateItems], groupIndex) => (
              <div key={dateLabel}>
                {groupIndex > 0 && <Separator className="my-md bg-border-glass/30" />}
                <DateHeader label={dateLabel} />
                <div className="space-y-sm mt-sm">
                  {dateItems.map((item) => (
                    <ActivityCard
                      key={item.id}
                      item={item}
                      onDelete={handleDelete}
                      isDeleting={deleteHistoryMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export const Route = createFileRoute("/app/history/")({
  component: HistoryPage,
});
