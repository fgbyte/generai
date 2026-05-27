import { useState } from "react";
import { format, parseISO } from "date-fns";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
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
  Pencil,
  CopyIcon,
  Check,
  SendHorizonal,
  CheckCircle,
  CalendarCheck2Icon,
  SparklesIcon,
} from "lucide-react";

import heroImageUrl from "@/assets/generai-login-hero.jpg";

/* ══ Route definition ═══════════════════════════════════━ */
export const Route = createFileRoute("/app/automate/")({
  component: AutomatePage,
});

/* ── Reused sub-components ───────────────────────────────── */
function TopAppBar() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface-material backdrop-blur-[20px] backdrop-saturate-[150%] border-b border-border-glass/50 flex justify-between items-center px-lg py-sm pt-12 pb-3">
      <button
        type="button"
        className="flex items-center justify-center rounded-lg p-2 transition-all hover:bg-white/10 active:scale-[0.98]"
      >
        <Link to="/app">
          <X className="size-5 text-white" />
        </Link>
      </button>

      <h1 className="font-headline-md text-headline-md text-white">
        Content Preview
      </h1>

      <Link
        to="/app/history"
        className="text-body-md text-text-dim transition-opacity hover:opacity-80"
      >
        Drafts
      </Link>
    </header>
  );
}

function InstagramPreview() {
  const [liked, setLiked] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState([heroImageUrl]);

  const addImage = () => {
    setImages((prev) => [...prev, heroImageUrl]);
  };

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
            src={images[currentImageIndex]}
            alt="AI Generated Artwork"
            className="size-full object-cover"
          />
          {images.length > 1 && (
            <div className="absolute text-white bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-border-glass/50 bg-surface-thick/70 px-3 py-1.5 text-caption-xs backdrop-blur-md">
              {currentImageIndex + 1}/{images.length}
            </div>
          )}
        </div>

        {/* Add more images */}
        <div className="px-4">
          <Button
            onClick={addImage}
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

/* ── Caption Editor 💩 ──────────────────────────────────────── */
function CaptionEditor() {
  const [captionOpen, setCaptionOpen] = useState(false);
  const [caption, setCaption] = useState(
    "✨ Unlocking the future of creativity. This piece merges fluid dynamics with neural networks to create something truly unique.\n#Generai #ArtFuture",
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <span
        className="text-[12px] font-semibold uppercase text-text-dim"
        style={{
          fontFamily: "JetBrains Mono, monospace",
          letterSpacing: "0.5px",
        }}
      >
        Edit Post Caption
      </span>
      <button
        onClick={() => setCaptionOpen((v) => !v)}
        aria-expanded={captionOpen}
        className="w-full flex items-center justify-center gap-2 py-3 bg-surface-material/30 border border-border-glass rounded-lg hover:bg-surface-material/50 active:scale-[0.98] transition-all"
      >
        <Pencil className="size-4 inline-block text-primary" />
        <span className="text-[17px] font-semibold text-white">
          Edit Caption
        </span>
      </button>
      {captionOpen && (
        <div className="relative rounded-xl border border-border-glass bg-surface-material p-3">
          <button
            onClick={handleCopy}
            aria-label="Copy caption"
            className="absolute top-2 right-2 p-2 rounded-lg bg-surface-thick border border-border-glass text-text-dim hover:text-white active:scale-95 transition-all z-10"
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <CopyIcon className="size-4" />
            )}
          </button>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={5}
            className="w-full bg-transparent resize-none outline-none text-[14px] leading-relaxed text-white pr-10 placeholder:text-text-dim"
          />
        </div>
      )}
      <div className="flex justify-end">
        <button className="group flex items-center gap-1 px-3 py-2 hover:bg-primary/10 rounded-lg text-violet-brand transition-all">
          <RefreshCw className="size-4 text-primary" />
          <span className="text-[14px] font-semibold text-primary">
            Regenerate Caption
          </span>
        </button>
      </div>
    </section>
  );
}

function CtaFooter() {
  const [active, setActive] = useState("instagram");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [scheduleDate, setScheduleDate] = useState(today);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduled, setScheduled] = useState(false);
  const [repeat, setRepeat] = useState("none");

  const handleSchedule = () => {
    setScheduled(true);
    setTimeout(() => {
      setScheduled(false);
      setScheduleOpen(false);
    }, 1400);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <button onClick={() => {}} className=" btn-secondary">
        <SendHorizonal className="size-4" />
        Publish Now
      </button>
      <button
        onClick={() => setScheduleOpen(true)}
        className="btn-primary text-white rounded-xl text-[17px] font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2"
      >
        <CalendarDays className="size-4" />
        Schedule
      </button>

      {scheduleOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setScheduleOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[576px] bg-surface-thick backdrop-blur-3xl border-t sm:border border-border-glass rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-5 animate-in slide-in-from-bottom"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center">
                  <CalendarCheck2Icon className="size-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold leading-tight text-white">
                    Schedule Content
                  </h2>
                  <p className="text-[12px] text-text-dim">
                    Pick when this post goes live
                  </p>
                </div>
              </div>
              <button
                onClick={() => setScheduleOpen(false)}
                aria-label="Close"
                className="p-2 rounded-full hover:bg-surface-material transition-colors"
              >
                <X className="size-4 text-white" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="flex flex-col gap-1 bg-surface-material border border-border-glass rounded-xl p-3 focus-within:border-violet-brand transition-colors text-left w-full"
                    >
                      <span
                        className="text-[10px] font-semibold uppercase text-text-dim"
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Date
                      </span>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[15px] font-semibold text-white">
                          {scheduleDate
                            ? format(parseISO(scheduleDate), "PPP")
                            : "Pick a date"}
                        </span>
                        <CalendarDays className="size-4 text-text-muted shrink-0" />
                      </div>
                    </button>
                  }
                />
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduleDate ? parseISO(scheduleDate) : undefined}
                    onSelect={(date) =>
                      setScheduleDate(date ? format(date, "yyyy-MM-dd") : "")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="flex flex-col gap-1 bg-surface-material border border-border-glass rounded-xl p-3 focus-within:border-violet-brand transition-colors text-left w-full"
                    >
                      <span
                        className="text-[10px] font-semibold uppercase text-text-dim"
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Time
                      </span>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[15px] font-semibold text-white">
                          {scheduleTime}
                        </span>
                        <Clock className="size-4 text-text-muted shrink-0" />
                      </div>
                    </button>
                  }
                />
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="flex items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="hours"
                        className="text-[10px] font-semibold uppercase text-text-dim"
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Hours
                      </label>
                      <input
                        id="hours"
                        type="number"
                        min={0}
                        max={23}
                        value={parseInt(scheduleTime.split(":")[0], 10)}
                        onChange={(e) => {
                          const hours = Math.min(
                            Math.max(parseInt(e.target.value, 10) || 0, 0),
                            23,
                          );
                          setScheduleTime(
                            `${String(hours).padStart(2, "0")}:${scheduleTime.split(":")[1] || "00"}`,
                          );
                        }}
                        className="w-12 h-10 bg-surface-material border border-border-glass rounded-md text-center text-white font-semibold outline-none focus:border-violet-brand transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <span className="text-white pb-2 font-body-md">:</span>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="minutes"
                        className="text-[10px] font-semibold uppercase text-text-dim"
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Minutes
                      </label>
                      <input
                        id="minutes"
                        type="number"
                        min={0}
                        max={59}
                        value={parseInt(scheduleTime.split(":")[1], 10)}
                        onChange={(e) => {
                          const minutes = Math.min(
                            Math.max(parseInt(e.target.value, 10) || 0, 0),
                            59,
                          );
                          setScheduleTime(
                            `${scheduleTime.split(":")[0] || "12"}:${String(minutes).padStart(2, "0")}`,
                          );
                        }}
                        className="w-12 h-10 bg-surface-material border border-border-glass rounded-md text-center text-white font-semibold outline-none focus:border-violet-brand transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/*<div className="flex flex-col gap-2">
              <span
                className="text-[10px] font-semibold uppercase text-text-dim"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "0.5px",
                }}
              >
                Repeat
              </span>
              <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {[
                  { id: "none", label: "One-time" },
                  { id: "daily", label: "Daily" },
                  { id: "weekly", label: "Weekly" },
                  { id: "monthly", label: "Monthly" },
                ].map((r) => {
                  const isActive = repeat === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRepeat(r.id)}
                      className={`px-4 py-2 rounded-full text-[12px] font-semibold shrink-0 border transition-all ${
                        isActive
                          ? "bg-primary text-white border-transparent"
                          : "bg-surface-material border-border-glass text-text-dim hover:text-white"
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>*/}

            <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl border border-primary/20">
              <SparklesIcon className="size-4 text-primary" />
              <p className="text-[12px] text-text-dim">
                Best engagement window for{" "}
                <span className="text-white font-semibold capitalize">
                  {active}
                </span>{" "}
                is around 8–10 PM.
              </p>
            </div>

            <button
              onClick={handleSchedule}
              disabled={scheduled}
              className="h-[52px] btn-primary text-white rounded-xl text-[17px] font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(109,93,242,0.4)] disabled:opacity-90"
            >
              {scheduled && <CheckCircle className="size-4 text-primary" />}
              {scheduled ? "Scheduled!" : "Confirm Schedule"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ *
 *  MAIN PAGE                                                *
 ═══════════════════════════════════════════════════════════ */

function AutomatePage() {
  const [notification, setNotification] = useState(true);

  return (
    <div className="relative flex min-h-screen flex-col bg-black pb-section mb-5">
      <TopAppBar />

      <main className="mx-auto flex w-full max-w-container flex-col gap-6 px-lg pt-20 pb-6">
        <PlatformSelector />

        <InstagramPreview />

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

        {/* CTA Footer */}
        <CtaFooter />
      </main>
    </div>
  );
}
