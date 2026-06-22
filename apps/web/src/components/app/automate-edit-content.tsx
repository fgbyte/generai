import { useEffect, useState } from "react";
import { Pencil, CopyIcon, Check, RefreshCw, AlertCircle } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/app/image-upload";

interface EditContentProps {
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
}

/**
 * Editable caption + prompt section. Collapses by default; expands on
 * click of the "Edit Content" toggle. Also hosts the "needs image"
 * warning + re-upload prompt and the Regenerate caption CTA.
 */
export function EditContent({
  caption,
  setCaption,
  prompt,
  setPrompt,
  onRegenerate,
  isRegenerating,
  needsImage,
  onImageReupload,
}: EditContentProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
    } catch {
      // noop
    }
  };

  // Auto-reset the "Copied!" state after 1.5s. Cleanup prevents
  // stale state updates if the component unmounts or the user
  // clicks again before the timer fires.
  useEffect(() => {
    if (!copied) return;
    const timeoutId = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeoutId);
  }, [copied]);

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
