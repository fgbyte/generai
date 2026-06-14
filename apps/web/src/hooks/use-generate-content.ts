import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { hc } from "hono/client";
import { env } from "@generai/env/web";
import type { AppType } from "@server/index";
import { toast } from "sonner";

import { generationStore } from "@/stores/generation-store";

const client = hc<AppType>(env.VITE_SERVER_URL, {
  init: { credentials: "include" },
});

export type GenerateContentResponse = {
  content: string[];
  contentType: "thread" | "instagram" | "linkedin";
  id: string;
};

interface UseGenerateContentOptions {
  /**
   * Called after the new content is written to the generation store.
   * Use this to navigate, update local state, etc.
   * NOT called on error.
   */
  onSuccess?: (data: GenerateContentResponse) => void;
}

/**
 * Hook for generating (or regenerating) content via POST /api/generate.
 *
 * Reads the original prompt, imageBase64, and contentType from the
 * generationStore so callers don't need to pass them. The store is
 * updated with the new content on success. Toasts errors and invalidates
 * ["points"] on settle.
 */
export function useGenerateContent(options: UseGenerateContentOptions = {}) {
  const queryClient = useQueryClient();
  const generation = useStore(generationStore, (s) => s.current);

  return useMutation<GenerateContentResponse, Error, void>({
    mutationFn: async () => {
      if (!generation) {
        throw new Error("No previous generation to regenerate from");
      }
      const res = await client.api.generate.$post({
        json: {
          contentType: generation.contentType,
          prompt: generation.prompt,
          imageBase64: generation.imageBase64 ?? undefined,
        },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({} as Record<string, string>));
        throw new Error(errBody.error ?? `Generation failed (${res.status})`);
      }
      return res.json() as Promise<GenerateContentResponse>;
    },
    onSuccess: (data) => {
      // Always write the new content to the store (shared logic)
      // We capture generation from the closure since we just verified it exists in mutationFn
      const previous = generation;
      if (previous) {
        generationStore.setState((prev) => ({
          ...prev,
          current: {
            id: data.id,
            content: data.content,
            contentType: data.contentType,
            prompt: previous.prompt,
            imageBase64: previous.imageBase64,
            createdAt: new Date().toISOString(),
          },
        }));
      }
      // Then call the caller-specific success handler
      options.onSuccess?.(data);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate content");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });
}
