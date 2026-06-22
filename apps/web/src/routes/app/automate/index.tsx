import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { generationStore } from "@/stores/generation-store";
import { useGenerateContent, type ContentTypeUnion } from "@/hooks/use-generate-content";

import { CommingSoonMock } from "@/components/previews/comming-soon-mock";
import { InstagramPreview } from "@/components/previews/instagram-preview";
import { AutomateTopAppBar } from "@/components/app/automate-top-app-bar";
import { PlatformSelector } from "@/components/app/automate-platform-selector";
import { findPlatform, type PlatformId } from "@/components/app/automate-platforms";
import { EditContent } from "@/components/app/automate-edit-content";
import { CtaFooter } from "@/components/app/automate-cta-footer";
import { X, Sparkles } from "lucide-react";

/**
 * Decode a `data:<mime>;base64,<...>` URI to a same-origin blob URL.
 * Pure synchronous transform — no network fetch, no async race.
 * Returns `null` if the input doesn't look like a data URL.
 */
function dataUrlToBlobUrl(dataUrl: string): string | null {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx < 0) return null;
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/^data:([^;,]+)/);
  const mime = mimeMatch?.[1] ?? "application/octet-stream";
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
}

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

/* ── Preview registry ────────────────────────────────────── *
 * Maps each platform to its dedicated preview component.
 * Platforms without a real implementation fall through to
 * <CommingSoonMock> at the call site.
 * ─────────────────────────────────────────────────────────── */
const previewRegistry: Partial<
  Record<PlatformId, ComponentType<{ caption: string; image?: string }>>
> = {
  instagram: InstagramPreview,
};

/* ═══════════════════════════════════════════════════════════ *
 *  MAIN PAGE                                                *
 ═══════════════════════════════════════════════════════════ */

/**
 * Module-scope helper: captures no local state, only `generationStore`
 * (a module-level import), so allocating it once at module load avoids
 * rebuilding the closure on every AutomatePage render.
 */
function handleImageReupload(base64: string) {
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
}

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

  // Synchronous base64 -> blob URL conversion. We avoid fetch() entirely:
  //   1. Keeps it out of useEffect (no race / double-fire risk).
  //   2. atob is synchronous and cheaper than the round-trip through fetch.
  // The cleanup effect below revokes the previous URL only when it changes,
  // so we never leak blob URLs across renders.
  const imageUrl = useMemo(
    () => (generation?.imageBase64 ? dataUrlToBlobUrl(generation.imageBase64) : null),
    [generation?.imageBase64],
  );

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

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

  const currentPlatform = findPlatform(selected);
  const PlatformPreview = previewRegistry[selected];

  return (
    <div className="relative flex flex-col bg-black mb-5">
      <AutomateTopAppBar />

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
