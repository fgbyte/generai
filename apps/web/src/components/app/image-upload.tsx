import { useEffect, useRef, useState } from "react";
import { Upload, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";

type UploadState = "idle" | "uploading" | "uploaded";

interface ImageUploadProps {
  /**
   * Simulated upload latency in ms. Placeholder for the future R2 PUT
   * — replace with a real mutation when the bucket is wired up.
   */
  simulateLatencyMs?: number;
  className?: string;
}

/**
 * Self-contained image upload UI with three states:
 *  - idle:     dashed-border picker button
 *  - uploading: spinner + "Uploading…" (placeholder for real R2 PUT)
 *  - uploaded:  thumbnail (left) + green "UPLOADED" label (right)
 *
 * Clicking the uploaded body reopens the file picker to replace the image.
 * The trailing X button clears the selection.
 */
export function ImageUpload({ simulateLatencyMs = 1200, className }: ImageUploadProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke object URL on unmount or when replaced/cleared.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setState("uploading");

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Placeholder for the real R2 PUT — keep the loader visible long enough
    // to demo the state. Swap for an `await uploadToR2(file)` later.
    await new Promise((resolve) => setTimeout(resolve, simulateLatencyMs));

    setState("uploaded");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      resetInput();
      return;
    }
    void handleFile(file);
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
        <div
          role="status"
          aria-live="polite"
          className="w-full border border-dashed border-white/20 text-white/60 py-md rounded-lg gap-2 flex items-center justify-center"
        >
          <Loader2 className="size-5 animate-spin" />
          <span>Uploading…</span>
        </div>
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
