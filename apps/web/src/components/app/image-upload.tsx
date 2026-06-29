import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useImageUpload } from "@/hooks/use-image-upload";

type UploadState = "idle" | "uploading" | "uploaded";

interface ImageUploadProps {
  /**
   * Compression knobs forwarded to `compressToBase64`. Defaults inside the
   * hook are `maxPx: 1024, quality: 0.75` — the sweet spot for vision
   * models on Instagram-style photo content.
   */
  compressOptions?: {
    maxPx?: number;
    quality?: number;
  };
  className?: string;
  /** Called with a data:image/jpeg;base64,... string when a file is
   *  successfully compressed, or null when the selection is removed /
   *  component unmounts / compression fails. */
  onBase64Change?: (base64: string | null) => void;
}

/**
 * Self-contained image upload UI with three states:
 *  - idle:      dashed-border picker button
 *  - uploading: spinner + "Compressing…" (matches `useMutation` pending)
 *  - uploaded:  thumbnail (left) + green "Uploaded" label (right)
 *
 * The actual base64 handed to the parent is produced by `useImageUpload`,
 * which scales the file down (max 1024px on the longest side) and re-encodes
 * it as JPEG q=0.75 — yielding ~150–250 KB payloads from phone photos that
 * would otherwise be several MB. Backend / store payload shape is
 * unchanged: parents still receive a `data:image/...;base64,...` string.
 *
 * Clicking the uploaded body reopens the file picker to replace the image.
 * The trailing X button clears the selection.
 */
export function ImageUpload({ compressOptions, className, onBase64Change }: ImageUploadProps) {
  const [state, setState] = useState<UploadState>("idle");
  // Thumbnail is rendered from the *original* file blob so the user sees
  // exactly what they picked; the parent receives the *compressed* base64.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate: compress, reset } = useImageUpload(compressOptions);

  // Revoke object URL on unmount or when replaced/cleared.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Notify parent of removal on unmount so stale base64 isn't kept.
  // `useEffectEvent` (React 19+) gives us a stable function that always
  // reads the latest `onBase64Change` prop, so the unmount cleanup
  // calls the freshest callback without re-subscribing the effect.
  const onUnmountNotify = useEffectEvent(() => {
    onBase64Change?.(null);
  });

  useEffect(() => {
    return onUnmountNotify;
  }, []);

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = (file: File) => {
    // Show the original pick as the thumbnail immediately so the user gets
    // instant feedback even while compression runs.
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setState("uploading");

    compress(file, {
      onSuccess: (base64) => {
        setState("uploaded");
        onBase64Change?.(base64);
      },
      onError: (err) => {
        // Compression failed — drop the pick so the user can retry.
        URL.revokeObjectURL(url);
        setPreviewUrl(null);
        setState("idle");
        resetInput();
        toast.error(err.message || "Could not process image");
        onBase64Change?.(null);
      },
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      resetInput();
      return;
    }
    handleFile(file);
  };

  const openPicker = () => {
    if (state === "uploading") return;
    inputRef.current?.click();
  };

  const handleRemove = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setState("idle");
    resetInput();
    reset(); // clear mutation state so a re-pick doesn't race stale errors
    onBase64Change?.(null);
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {state === "idle" && (
        <button
          type="button"
          onClick={openPicker}
          className="w-full border border-dashed border-white/20 text-white/60 hover:bg-white/5 hover:text-white py-md rounded-lg gap-2 flex items-center justify-center transition-colors"
        >
          <Upload className="size-5" />
          <span>Upload Image</span>
        </button>
      )}

      {state === "uploading" && (
        <output
          aria-live="polite"
          className="w-full border border-dashed border-white/20 text-white/60 py-md rounded-lg gap-2 flex items-center justify-center"
        >
          <Loader2 className="size-5 animate-spin" />
          <span>Compressing…</span>
        </output>
      )}

      {state === "uploaded" && previewUrl && (
        <div className="w-full border border-white/15 bg-surface-form rounded-lg px-md py-md flex items-center gap-md">
          <button
            type="button"
            onClick={openPicker}
            className="flex items-center gap-md flex-1 min-w-0 text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <img
              src={previewUrl}
              alt="Upload preview"
              className="size-12 rounded-md object-cover flex-shrink-0"
            />
            <span className="text-mono-label text-emerald-400 flex-1 truncate">Uploaded</span>
          </button>
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove image"
            className="text-white/40 hover:text-white transition-colors p-xs rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
