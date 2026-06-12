import { useState } from "react";
import type { ComponentType } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { CommingSoonMock } from "@/components/previews/comming-soon-mock";
import { CommingSoonModal } from "@/components/modals/comming-soon-modal";
import { InstagramPreview } from "@/components/previews/instagram-preview";
import {
  X,
  Instagram as InstagramIcon,
  Twitter,
  Dribbble,
  Pin,
  RefreshCw,
  Sparkles,
  Pencil,
  CopyIcon,
  Check,
  SendHorizonal,
} from "lucide-react";

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

      <h1 className="font-headline-md text-headline-md text-white">Content Preview</h1>

      <Link
        to="/app/history"
        className="text-body-md text-text-dim transition-opacity hover:opacity-80"
      >
        Drafts
      </Link>
    </header>
  );
}

/* ── Platform Selection ──────────────────────────────────── */
const platforms = [
  { id: "instagram", label: "Instagram", icon: InstagramIcon },
  { id: "twitter", label: "X / Twitter", icon: Twitter },
  { id: "dribbble", label: "Dribbble", icon: Dribbble },
  { id: "pinterest", label: "Pinterest", icon: Pin },
] as const;

export type PlatformId = (typeof platforms)[number]["id"];

function PlatformSelector({
  value,
  onChange,
}: {
  value: PlatformId;
  onChange: (value: PlatformId) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-mono-label text-text-dim uppercase">Select Platform</span>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {platforms.map((p) => {
          const isActive = p.id === value;
          const Icon = p.icon;
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => onChange(p.id)}
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

/* ── Preview registry ────────────────────────────────────── *
 * Maps each platform to its dedicated preview component.
 * Platforms without a real implementation fall through to
 * <CommingSoonMock> at the call site.
 * ─────────────────────────────────────────────────────────── */
const previewRegistry: Partial<Record<PlatformId, ComponentType<{ caption: string }>>> = {
  instagram: InstagramPreview,
  // twitter: TwitterPreview,
  // dribbble: DribbblePreview,
  // pinterest: PinterestPreview,
};

/* ── Caption Editor ──────────────────────────────────────── */
function CaptionEditor({
  caption,
  setCaption,
}: {
  caption: string;
  setCaption: (value: string) => void;
}) {
  const [captionOpen, setCaptionOpen] = useState(false);
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
        <span className="text-[17px] font-semibold text-white">Edit Caption</span>
      </button>
      {captionOpen && (
        <div className="relative rounded-xl border border-border-glass bg-surface-material p-3">
          <button
            onClick={handleCopy}
            aria-label="Copy caption"
            className="absolute top-2 right-2 p-2 rounded-lg bg-surface-thick border border-border-glass text-text-dim hover:text-white active:scale-95 transition-all z-10"
          >
            {copied ? <Check className="size-4" /> : <CopyIcon className="size-4" />}
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
          <span className="text-[14px] font-semibold text-primary">Regenerate Caption</span>
        </button>
      </div>
    </section>
  );
}

function CtaFooter({ caption }: { caption: string }) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
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
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={handleCopy} className=" btn-secondary">
        {copied ? <Check className="size-4" /> : <CopyIcon className="size-4" />}
        {copied ? "Copied!" : "Copy"}
      </button>
      <button
        type="button"
        onClick={() => setScheduleOpen(true)}
        className="btn-primary text-white rounded-xl text-[17px] font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2"
      >
        <SendHorizonal className="size-4" />
        Publish
      </button>

      {scheduleOpen && <CommingSoonModal open={scheduleOpen} onOpenChange={setScheduleOpen} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ *
 *  MAIN PAGE                                                *
 ═══════════════════════════════════════════════════════════ */

function AutomatePage() {
  const [selected, setSelected] = useState<PlatformId>("instagram");
  const [notification, setNotification] = useState(true);
  const [caption, setCaption] = useState(
    "✨ Unlocking the future of creativity. This piece merges fluid dynamics with neural networks to create something truly unique.\n#Generai #ArtFuture",
  );

  const currentPlatform = platforms.find((p) => p.id === selected);
  const PlatformPreview = previewRegistry[selected];

  return (
    <div className="relative flex flex-col bg-black mb-5">
      <TopAppBar />

      <main className="mx-auto flex w-full max-w-container flex-col gap-6 px-lg">
        <PlatformSelector value={selected} onChange={setSelected} />

        {PlatformPreview ? (
          <PlatformPreview caption={caption} />
        ) : currentPlatform ? (
          <CommingSoonMock label={currentPlatform.label} icon={currentPlatform.icon} />
        ) : null}

        <CaptionEditor caption={caption} setCaption={setCaption} />

        {/* Notification Banner */}
        {notification && (
          <div className="flex items-center gap-3 rounded-lg border border-primary/10 bg-primary/5 p-3">
            <Sparkles className="size-5 shrink-0 text-primary" />
            <p className="text-caption-xs text-text-dim">
              Generative tags and optimal timing analysis are applied automatically.
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
        <CtaFooter caption={caption} />
      </main>
    </div>
  );
}
