import { useMutation, useQueryClient } from "@tanstack/react-query";
import { hc } from "hono/client";
import { env } from "@generai/env/web";
import type { AppType } from "@server/index";
import { toast } from "sonner";

import { generationStore } from "@/stores/generation-store";

const client = hc<AppType>(env.VITE_SERVER_URL, {
  init: { credentials: "include" },
});

export type ContentTypeUnion = "thread" | "instagram" | "linkedin";

export type GenerateContentInput = {
  contentType: ContentTypeUnion;
  prompt: string;
  imageBase64: string | null;
};

export type GenerateContentResponse = {
  content: string[];
  contentType: ContentTypeUnion;
  id: string;
};

interface UseGenerateContentOptions {
  /**
   * Called after the new content is written to the generation store.
   * Use this to navigate, update local state, etc.
   * NOT called on error.
   */
  onSuccess?: (data: GenerateContentResponse, variables: GenerateContentInput) => void;
}

/**
 * Hook for generating (or regenerating) content via POST /api/generate.
 *
 * Callers pass the generation inputs (contentType, prompt, imageBase64) as
 * variables when calling `mutate(input)`. The hook writes the new content
 * to the generation store on success, toasts errors, and invalidates
 * ["points"] on settle.
 */
export function useGenerateContent(options: UseGenerateContentOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<GenerateContentResponse, Error, GenerateContentInput>({
    mutationFn: async (input) => {
      if (!input.prompt.trim()) {
        throw new Error("Prompt is required");
      }
      const res = await client.api.generate.$post({
        json: {
          contentType: input.contentType,
          prompt: input.prompt,
          imageBase64: input.imageBase64 ?? undefined,
        },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}) as Record<string, string>);
        throw new Error(errBody.error ?? `Generation failed (${res.status})`);
      }
      return res.json() as Promise<GenerateContentResponse>;
    },
    onSuccess: (data, variables) => {
      // Write the new content to the store using the variables that produced it
      generationStore.setState((prev) => ({
        ...prev,
        current: {
          id: data.id,
          content: data.content,
          contentType: data.contentType,
          prompt: variables.prompt,
          imageBase64: variables.imageBase64,
          createdAt: new Date().toISOString(),
        },
      }));
      options.onSuccess?.(data, variables);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate content");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });
}
