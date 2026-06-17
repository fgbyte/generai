import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { generationStore } from "@/stores/generation-store";
import { useGenerateContent, type ContentTypeUnion } from "@/hooks/use-generate-content";
import { Textarea } from "@/components/ui/textarea";

import { CommingSoonMock } from "@/components/previews/comming-soon-mock";
import { CommingSoonModal } from "@/components/modals/comming-soon-modal";
import { InstagramPreview } from "@/components/previews/instagram-preview";
import { ImageUpload } from "@/components/app/image-upload";
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
  AlertCircle,
} from "lucide-react";

/**
 * Maps a generation `contentType` to the corresponding platform tab in this
 * page. `instagram` keeps its dedicated preview; `thread` and `linkedin` are
 * text-based and currently fall through to the Twitter placeholder mock
 * (their real previews are not yet implemented).
 *
 * Exported for unit testing in `-content-type.test.ts`.
 */
export function contentTypeToPlatformId(contentType: ContentTypeUnion): PlatformId {
  switch (contentType) {
    case "instagram":
      return "instagram";
    case "thread":
    case "linkedin":
      return "twitter";
  }
}

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
const previewRegistry: Partial<
  Record<PlatformId, ComponentType<{ caption: string; image?: string }>>
> = {
  instagram: InstagramPreview,
  // twitter: TwitterPreview,
  // dribbble: DribbblePreview,
  // pinterest: PinterestPreview,
};

/* ── Content Editor ──────────────────────────────────────── */
function EditContent({
  caption,
  setCaption,
  prompt,
  setPrompt,
  onRegenerate,
  isRegenerating,
  needsImage,
  onImageReupload,
}: {
  caption: string;
  setCaption: (value: string) => void;
  prompt: string;
  setPrompt: (value: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  /**
   * True when the current generation needs an image to call the generate
   * endpoint (Instagram without a stored image). Disables Regenerate and
   * surfaces a re-upload prompt.
   */
  needsImage: boolean;
  /**
   * Called with the new base64 string when the user re-uploads an image.
   * Null is ignored — clearing is not supported from this control.
   */
  onImageReupload: (base64: string) => void;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
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
        Edit Post Content
      </span>
      <button
        type="button"
        onClick={() => setEditorOpen((v) => !v)}
        aria-expanded={editorOpen}
        className="w-full flex items-center justify-center gap-2 py-3 bg-surface-material/30 border border-border-glass rounded-lg hover:bg-surface-material/50 active:scale-[0.98] transition-all"
      >
        <Pencil className="size-4 inline-block text-primary" />
        <span className="text-[17px] font-semibold text-white">Edit Content</span>
      </button>
      {editorOpen && (
        <div className="flex flex-col gap-3">
          {/* Caption editor (with copy) */}
          <div className="flex flex-col gap-1">
            <label htmlFor="caption" className="text-mono-label text-text-dim text-[11px]">
              Caption
            </label>
            <div className="relative rounded-xl border border-border-glass bg-surface-material p-3">
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy caption"
                className="absolute top-2 right-2 p-2 rounded-lg bg-surface-thick border border-border-glass text-text-dim hover:text-white active:scale-95 transition-all z-10"
              >
                {copied ? <Check className="size-4" /> : <CopyIcon className="size-4" />}
              </button>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={5}
                className="w-full bg-transparent border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 resize-none text-[14px] leading-relaxed text-white pr-10 placeholder:text-text-dim"
              />
            </div>
          </div>
          {/* Prompt editor */}
          <div className="flex flex-col gap-1">
            <label htmlFor="prompt" className="text-mono-label text-text-dim text-[11px]">
              Prompt
            </label>
            <div className="relative rounded-xl border border-border-glass bg-surface-material p-3">
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full bg-transparent border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary/40 resize-none text-[14px] leading-relaxed text-white pr-10 placeholder:text-text-dim"
                placeholder="No prompt available"
              />
            </div>
          </div>
        </div>
      )}
      {needsImage && (
        <div
          role="alert"
          className="mt-2 flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
        >
          <div className="flex items-center gap-2 text-amber-300">
            <AlertCircle className="size-4" />
            <span className="text-caption-xs font-medium">Image required to regenerate</span>
          </div>
          <p className="text-caption-xs text-text-dim">
            The original image wasn&apos;t saved with this content. Re-upload the same image to
            enable regeneration.
          </p>
          <ImageUpload onBase64Change={(b64) => b64 && onImageReupload(b64)} />
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isRegenerating || needsImage}
          title={
            needsImage
              ? "Upload the image to enable regeneration"
              : isRegenerating
                ? "Regenerating…"
                : "Regenerate caption with the same image"
          }
          className="group flex items-center gap-1 px-3 py-2 hover:bg-primary/10 rounded-lg text-violet-brand transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`size-4 text-primary ${isRegenerating ? "animate-spin" : ""}`} />
          <span className="text-[14px] font-semibold text-primary">
            {isRegenerating ? "Regenerating…" : "Regenerate Caption"}
          </span>
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
  const generation = useStore(generationStore, (s) => s.current);
  const [selected, setSelected] = useState<PlatformId>(() => {
    if (generation?.contentType) {
      return contentTypeToPlatformId(generation.contentType);
    }
    return "instagram";
  });
  const [notification, setNotification] = useState(true);
  const [caption, setCaption] = useState<string>(() => {
    if (generation?.content && generation.content.length > 0) {
      return generation.content.join("\n\n");
    }
    return "✨ Unlocking the future of creativity. This piece merges fluid dynamics with neural networks to create something truly unique.\n#Generai #ArtFuture";
  });
  const [prompt, setPrompt] = useState<string>(() => generation?.prompt ?? "");

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Sync the selected platform with the loaded generation's contentType.
  // Covers two cases:
  //   1. First mount: the lazy initializer above reads generation, but if the
  //      store hydrates from localStorage slightly after mount this keeps it
  //      in sync.
  //   2. Subsequent updates: clicking a different history card while this
  //      page is already mounted (or any code path that swaps `current` in
  //      the store) should re-select the matching platform.
  useEffect(() => {
    if (!generation?.contentType) return;
    setSelected(contentTypeToPlatformId(generation.contentType));
  }, [generation?.contentType]);

  useEffect(() => {
    const base64 = generation?.imageBase64;
    if (!base64) {
      setImageUrl(null);
      return;
    }
    let revoked = false;
    let createdUrl: string | null = null;
    (async () => {
      try {
        const res = await fetch(base64);
        const blob = await res.blob();
        createdUrl = URL.createObjectURL(blob);
        if (!revoked) setImageUrl(createdUrl);
      } catch (err) {
        console.warn("[automate] Failed to convert imageBase64 to blob URL:", err);
        setImageUrl(null);
      }
    })();
    return () => {
      revoked = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [generation?.imageBase64]);

  const generateMutation = useGenerateContent({
    onSuccess: (data) => {
      setCaption(data.content.join("\n\n"));
    },
  });

  const handleRegenerate = () => {
    if (!generation) return; // Safety: no generation exists yet
    generateMutation.mutate({
      contentType: generation.contentType,
      prompt: prompt.trim(),
      imageBase64: generation.imageBase64,
    });
  };

  // Instagram posts require an image to call the generate endpoint
  // (the vision model needs it). When the user opens an Instagram item
  // from history the image is lost — flag it so the UI can prompt a
  // re-upload and disable Regenerate.
  const needsImage = generation?.contentType === "instagram" && !generation?.imageBase64;

  const handleImageReupload = (base64: string) => {
    generationStore.setState((prev) => {
      if (!prev.current) return prev;
      return {
        ...prev,
        current: {
          ...prev.current,
          imageBase64: base64,
        },
      };
    });
  };

  const currentPlatform = platforms.find((p) => p.id === selected);
  const PlatformPreview = previewRegistry[selected];

  return (
    <div className="relative flex flex-col bg-black mb-5">
      <TopAppBar />

      <main className="mx-auto flex w-full max-w-container flex-col gap-6 px-lg">
        <PlatformSelector value={selected} onChange={setSelected} />

        {PlatformPreview ? (
          <PlatformPreview caption={caption} image={imageUrl ?? undefined} />
        ) : currentPlatform ? (
          <CommingSoonMock
            label={currentPlatform.label}
            icon={currentPlatform.icon}
            caption={caption}
          />
        ) : null}

        <EditContent
          caption={caption}
          setCaption={setCaption}
          prompt={prompt}
          setPrompt={setPrompt}
          onRegenerate={handleRegenerate}
          isRegenerating={generateMutation.isPending}
          needsImage={needsImage}
          onImageReupload={handleImageReupload}
        />

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
