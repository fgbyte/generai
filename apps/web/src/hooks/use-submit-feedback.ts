import { useMutation } from "@tanstack/react-query";
import { hc } from "hono/client";
import { env } from "@generai/env/web";
import type { AppType } from "@server/index";
import { toast } from "sonner";

const client = hc<AppType>(env.VITE_SERVER_URL, {
  init: { credentials: "include" },
});

export function useSubmitFeedback() {
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (content: string) => {
      const trimmed = content.trim();
      const res = await client.api.feedback.$post({ json: { content: trimmed } });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({} as Record<string, string>));
        throw new Error(errBody.error ?? `Failed to send feedback (${res.status})`);
      }
      return res.json() as Promise<{ success: boolean }>;
    },
    onSuccess: () => {
      toast.success("Feedback sent, thanks!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send feedback");
    },
  });
}
