import {
  AtSign,
  BriefcaseBusiness,
  Camera,
  ChevronRight,
  Filter,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface HistoryItem {
  id: string;
  content: string;
  prompt: string;
  contentType: string;
  createdAt: string;
}

const HISTORY_MOCK_ENDPOINT = "/mock/api/generate/history.json";

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
  const itemDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

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
  const itemDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

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

function ActivityCard({ item }: { item: HistoryItem }) {
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
          <span className="text-white font-headline-md text-[15px]">
            {config.label}
          </span>
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
          <ChevronRight className="size-[18px] text-text-muted" />
        </div>
      </div>
    </div>
  );
}

function DateHeader({ label }: { label: string }) {
  return (
    <p className="text-text-muted font-mono-label text-mono-label mt-xl px-xs">
      {label}
    </p>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-section text-center">
      {/* Empty state icon using shadcn pattern */}
      <div className="w-12 h-12 rounded-full bg-surface-form flex items-center justify-center mb-md">
        <Sparkles className="size-6 text-text-muted" />
      </div>
      <h3 className="font-headline-md text-headline-md text-white mb-sm">
        No Activity Yet
      </h3>
      <p className="text-text-dim text-body-md max-w-xs">
        Your generated content will appear here. Head to the Studio to create
        your first post!
      </p>
    </div>
  );
}

export function HistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["generate", "history"],
    queryFn: async () => {
      const res = await fetch(HISTORY_MOCK_ENDPOINT);
      if (!res.ok) throw new Error("Failed to fetch history");
      return res.json() as Promise<{ items: HistoryItem[] }>;
    },
  });

  const items = data?.items ?? [];
  const grouped = groupByDate(items);

  return (
    <div className="font-body-md text-body-md pb-section min-h-screen bg-black text-white">
      <main className="max-w-container mx-auto px-lg flex flex-col gap-lg relative z-10 pb-xxl">
        {/* Header */}
        <div className="mb-xl flex justify-between items-end">
          <div>
            <p className="text-primary font-mono-label text-mono-label mb-xs">
              ACTIVITY
            </p>
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
        {isLoading ? (
          <div className="space-y-md">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-md">
            {Array.from(grouped.entries()).map(
              ([dateLabel, dateItems], groupIndex) => (
                <div key={dateLabel}>
                  {groupIndex > 0 && (
                    <Separator className="my-md bg-border-glass/30" />
                  )}
                  <DateHeader label={dateLabel} />
                  <div className="space-y-sm mt-sm">
                    {dateItems.map((item) => (
                      <ActivityCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </main>
    </div>
  );
}
