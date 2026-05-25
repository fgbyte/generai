import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  X,
  Instagram as InstagramIcon,
  Twitter,
  Dribbble,
  Pin,
  CalendarDays,
  Clock,
  RefreshCw,
  Sparkles,
  MoreHorizontal,
  Plus,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Copy,
} from "lucide-react";

import heroImageUrl from "@/assets/generai-login-hero.jpg";

/* ── Reused sub-components ───────────────────────────────── */
function TopAppBar() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface-material backdrop-blur-[20px] backdrop-saturate-[150%] border-b border-border-glass/50 flex justify-between items-center px-lg py-sm pt-12 pb-3">
      <button
        type="button"
        className="flex items-center justify-center rounded-lg p-2 transition-all hover:bg-white/10 active:scale-[0.98]"
      >
        <X className="size-5 text-white" />
      </button>

      <h1 className="font-headline-md text-headline-md text-white">
        Schedule Post
      </h1>

      <Link
        to="/app/automate/drafts"
        className="text-body-md text-text-dim transition-opacity hover:opacity-80"
      >
        Drafts
      </Link>
    </header>
  );
}

function InstagramPreview() {
  const [liked, setLiked] = useState(false);

  return (
    <Card className="overflow-hidden border border-border-glass/30 bg-surface-material/60">
      <CardContent className="flex flex-col gap-3 p-0">
        {/* IG Header */}
        <div className="flex items-center gap-3 px-4 pt-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-caption-xs font-bold text-white">
            G
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">
              generai_art
            </span>
            <span className="text-caption-xs text-text-dim">Sponsored</span>
          </div>
          <button
            type="button"
            className="ml-auto rounded-md p-1 text-text-dim transition-colors hover:bg-white/10 hover:text-white"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </div>

        {/* Post Image */}
        <div className="relative aspect-square w-full">
          <img
            src={heroImageUrl}
            alt="AI Generated Artwork"
            className="size-full object-cover"
          />
          <button
            type="button"
            className="absolute text-white bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-border-glass/50 bg-surface-thick/70 px-3 py-1.5 text-caption-xs backdrop-blur-md transition-colors hover:bg-surface-thick/90"
          >
            <Send className="size-4" />
            Edit Design
          </button>
        </div>

        {/* Add more images */}
        <div className="px-4">
          <Button
            variant="outline"
            className="w-full gap-1.5 rounded-xl border-white/20 bg-surface-material/30 py-3 text-sm text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:text-white"
          >
            <Plus className="size-4" />
            Add more images
          </Button>
        </div>

        {/* Interactions */}
        <div className="flex items-center gap-4 px-4">
          <button
            type="button"
            onClick={() => setLiked((p) => !p)}
            aria-label={liked ? "Unlike" : "Like"}
            className="transition-transform active:scale-90"
          >
            <Heart
              className={`size-6 ${liked ? "fill-red-400 text-red-400" : "text-white"}`}
            />
          </button>
          <button
            type="button"
            aria-label="Comment"
            className="transition-transform text-white active:scale-90 hover:text-white/60"
          >
            <MessageCircle className="size-6" />
          </button>
          <button
            type="button"
            aria-label="Share"
            className="transition-transform text-white active:scale-90 hover:text-white/60"
          >
            <Send className="size-6" />
          </button>
          <button
            type="button"
            className="ml-auto rounded-md p-1 text-white transition-colors hover:bg-white/10"
          >
            <Bookmark className="size-6" />
          </button>
        </div>

        {/* Caption */}
        <div className="flex flex-col gap-1 px-4 pb-4">
          <p className="leading-relaxed text-white">
            <span className="mr-1 font-semibold">generai_art</span>✨ Unlocking
            the future of creativity. This piece merges fluid dynamics with
            neural networks to create something truly unique.
          </p>
          <p className="text-caption-xs text-primary/80">#Generai #ArtFuture</p>
          <p className="text-caption-xs text-text-dim">October 25, 2023</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Platform Selection ──────────────────────────────────── */
const platforms = [
  { id: "instagram", label: "Instagram", icon: InstagramIcon },
  { id: "twitter", label: "X / Twitter", icon: Twitter },
  { id: "dribbble", label: "Dribbble", icon: Dribbble },
  { id: "pinterest", label: "Pinterest", icon: Pin },
];

function PlatformSelector() {
  const [selected, setSelected] = useState<string>("instagram");

  return (
    <div className="flex flex-col gap-3">
      <span className="text-mono-label text-text-dim uppercase">
        Select Platform
      </span>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {platforms.map((p) => {
          const isActive = p.id === selected;
          const Icon = p.icon;
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "border-primary/30 bg-primary text-white shadow-[0_0_15px_rgba(109,93,242,0.4)]"
                  : "border-border-glass/50 bg-surface-material text-text-dim hover:bg-surface-material/80 hover:text-white"
              }`}
              aria-pressed={isActive}
            >
              <Icon className="size-4" />
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Date / Time Selectors 💩 ───────────────────────────────── */
function DateTimeSelector() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-mono-label text-text-dim uppercase">Date</span>
        <button
          type="button"
          className="flex items-center justify-between rounded-xl border border-border-glass/30 bg-surface-material px-4 py-3 transition-all hover:bg-surface-deep active:scale-[0.98]"
        >
          <span className="font-body-md text-body-md">Oct 25, 2023</span>
          <CalendarDays className="size-5 text-text-muted" />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-mono-label text-text-dim uppercase">Time</span>
        <button
          type="button"
          className="flex items-center justify-between rounded-xl border border-border-glass/30 bg-surface-material px-4 py-3 transition-all hover:bg-surface-deep active:scale-[0.98]"
        >
          <span className="font-body-md text-body-md">10:30 AM</span>
          <Clock className="size-5 text-text-muted" />
        </button>
      </div>
    </div>
  );
}

/* ── Caption Editor 💩 ──────────────────────────────────────── */
function CaptionEditor() {
  const [caption, setCaption] = useState(
    "✨ Unlocking the future of creativity. This piece merges fluid dynamics with neural networks to create something truly unique. #Generai #ArtFuture",
  );

  return (
    <div className="flex flex-col gap-3">
      <span className="text-mono-label text-text-dim uppercase">
        Edit Post Caption
      </span>
      <div className="relative">
        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="min-h-[100px] resize-none rounded-xl border border-border-glass/30 bg-surface-material/30 px-4 py-3 text-sm text-white placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-primary/50"
          placeholder="Write a caption..."
        />
        <button
          type="button"
          className="absolute top-3 right-3 rounded-lg bg-surface-thick/50 p-1.5 text-text-dim transition-colors hover:text-white"
          aria-label="Copy caption"
        >
          <Copy className="size-4" />
        </button>
      </div>
      <button
        type="button"
        className="flex items-center justify-end gap-1 py-3 pr-2 text-sm text-primary/80 transition-all active:scale-[0.98] hover:text-white"
      >
        <RefreshCw className="size-4" />
        Regenerate Captions
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ *
 *  MAIN PAGE                                                *
 ═══════════════════════════════════════════════════════════ */

function AutomatePage() {
  const [notification, setNotification] = useState(true);

  return (
    <div className="relative flex min-h-screen flex-col bg-black pb-section">
      <TopAppBar />

      <main className="mx-auto flex w-full max-w-container flex-col gap-6 px-6 pt-20 pb-6">
        <InstagramPreview />

        <PlatformSelector />

        <DateTimeSelector />

        <CaptionEditor />

        {/* Notification Banner */}
        {notification && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/10 bg-primary/5 p-3">
            <Sparkles className="size-5 shrink-0 text-primary" />
            <p className="text-caption-xs text-text-dim">
              Generative tags and optimal timing analysis are applied
              automatically.
            </p>
            <button
              type="button"
              onClick={() => setNotification(false)}
              className="ml-auto text-text-muted transition-colors hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </main>

      {/* Sticky Footer Action */}
      <div className="bottom-0 left-0 right-0 border-t border-border-glass/20 bg-black/80 px-6 py-4 backdrop-blur-3xl">
        <Button className="btn-primary h-[52px] w-full rounded-xl text-base shadow-lg shadow-primary/20">
          Schedule Content
        </Button>
      </div>
    </div>
  );
}

/* ══ Route definition ═══════════════════════════════════━ */
export const Route = createFileRoute("/app/automate/")({
  component: AutomatePage,
});
