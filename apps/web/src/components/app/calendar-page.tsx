import { useState } from "react";
import { Calendar, Clock, MoreVertical, Instagram, Twitter, Dribbble } from "lucide-react";

interface ScheduledPost {
  id: string;
  platform: "instagram" | "twitter" | "dribbble";
  title: string;
  status: "ready" | "pending" | "drafting";
  time: string;
}

const SCHEDULED_POSTS: ScheduledPost[] = [
  {
    id: "1",
    platform: "instagram",
    title: "Cyberpunk Metropolis #01",
    status: "ready",
    time: "10:30 AM",
  },
  {
    id: "2",
    platform: "twitter",
    title: "Future of Generative Art",
    status: "pending",
    time: "02:15 PM",
  },
  {
    id: "3",
    platform: "dribbble",
    title: "Luxe UI Dashboard Kit",
    status: "drafting",
    time: "Tomorrow",
  },
];

const PLATFORM_CONFIG = {
  instagram: {
    label: "Instagram",
    icon: Instagram,
    color: "text-primary",
  },
  twitter: {
    label: "X / Twitter",
    icon: Twitter,
    color: "text-primary",
  },
  dribbble: {
    label: "Dribbble",
    icon: Dribbble,
    color: "text-primary",
  },
} as const;

const STATUS_CONFIG = {
  ready: {
    label: "Ready to publish",
    className: "text-primary",
  },
  pending: {
    label: "Pending review",
    className: "text-secondary",
  },
  drafting: {
    label: "Drafting",
    className: "text-text-dim",
  },
} as const;

interface DayChip {
  day: string;
  date: number;
  isActive?: boolean;
}

const WEEK_DAYS: DayChip[] = [
  { day: "MON", date: 23 },
  { day: "TUE", date: 24 },
  { day: "WED", date: 25, isActive: true },
  { day: "THU", date: 26 },
  { day: "FRI", date: 27 },
  { day: "SAT", date: 28 },
  { day: "SUN", date: 29 },
];

function DayChip({
  chip,
  isSelected,
  onClick,
}: {
  chip: DayChip;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] ${
        isSelected
          ? "bg-primary shadow-[0_0_20px_rgba(94,92,230,0.4)]"
          : "glass-card opacity-60 hover:opacity-100"
      }`}
    >
      <span className="text-[10px] font-medium leading-3 text-text-muted">{chip.day}</span>
      <span
        className={`text-headline-md font-semibold ${isSelected ? "text-white" : "text-white"}`}
      >
        {chip.date}
      </span>
    </button>
  );
}

function TimelineItem({ post }: { post: ScheduledPost }) {
  const platformConfig = PLATFORM_CONFIG[post.platform];
  const statusConfig = STATUS_CONFIG[post.status];

  return (
    <div className="relative pl-8 group">
      {/* Timeline dot */}
      <div
        className={`absolute left-0 top-6 w-4 h-4 rounded-full border-2 border-black z-10 ${
          post.status === "drafting"
            ? "bg-primary/40"
            : "bg-primary shadow-[0_0_20px_rgba(94,92,230,0.4)]"
        }`}
      />

      {/* Card */}
      <div className="glass-card p-4 rounded-xl flex items-center justify-between active:scale-[0.99] transition-all hover:bg-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-mono-label text-text-muted uppercase tracking-widest">
              {platformConfig.label}
            </span>
            <span className="w-1 h-1 rounded-full bg-text-muted" />
            <span className={`text-caption-xs ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
          </div>
          <h3 className="text-headline-md font-semibold text-white">{post.title}</h3>
          <div className="flex items-center gap-1 text-text-dim">
            <Clock className="size-4" />
            <span className="text-caption-xs">{post.time}</span>
          </div>
        </div>
        <button type="button" className="text-text-muted hover:text-white transition-colors">
          <MoreVertical className="size-5" />
        </button>
      </div>
    </div>
  );
}

export function CalendarPage() {
  const [selectedDay, setSelectedDay] = useState(2); // Wed (index 2)

  return (
    <div className="bg-black text-white">
      <main className="max-w-container mx-auto px-lg space-y-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <h1 className="text-display-xl font-bold text-white">Calendar</h1>
          <button
            type="button"
            className="w-12 h-12 glass-card rounded-xl flex items-center justify-center active:scale-95 transition-all"
          >
            <Calendar className="size-6 text-white" />
          </button>
        </div>

        {/* Weekly Calendar View */}
        <section className="overflow-hidden">
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1 px-1 -mx-1">
            {WEEK_DAYS.map((chip, index) => (
              <DayChip
                key={chip.date}
                chip={chip}
                isSelected={selectedDay === index}
                onClick={() => setSelectedDay(index)}
              />
            ))}
          </div>
        </section>

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-headline-md font-semibold">Upcoming</h2>
          <div className="px-2 py-1 glass-card rounded-full">
            <span className="text-mono-label text-primary">
              {SCHEDULED_POSTS.length} POSTS QUEUED
            </span>
          </div>
        </div>

        {/* Timeline List */}
        <section className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-[7px] top-4 bottom-4 w-px bg-white/10" />
          <div className="space-y-4">
            {SCHEDULED_POSTS.map((post) => (
              <TimelineItem key={post.id} post={post} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
