import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { env } from "@generai/env/web";
import { hc } from "hono/client";
import { useQuery } from "@tanstack/react-query";
import type { AppType } from "@server/index";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/app/image-upload";

import {
  ChevronDown,
  ChevronRight,
  Coins,
  History,
  Instagram,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { useGenerateContent } from "@/hooks/use-generate-content";
import { authFetch } from "@/lib/api-client";

export const Route = createFileRoute("/app/")({
  component: RouteComponent,
});

const CONTENT_TYPES = [{ value: "instagram", icon: <Instagram />, label: "Instagram Caption" }];

const client = hc<AppType>(env.VITE_SERVER_URL, {
  init: { credentials: "include" },
  fetch: authFetch,
});

function RouteComponent() {
  const { data } = useQuery({
    queryKey: ["points"],
    queryFn: async () => {
      const res = await client.api.generate.points.$get();
      if (!res.ok) throw new Error("Failed to fetch points");
      return res.json();
    },
  });
  const [contentType, setContentType] = useState("instagram");
  const [prompt, setPrompt] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const navigate = useNavigate();

  const generateMutation = useGenerateContent({
    onSuccess: () => navigate({ to: "/app/automate" }),
  });

  const isPromptValid = prompt.trim().length > 0;
  const isImageValid = contentType !== "instagram" || imageBase64 !== null;
  const isButtonDisabled = !isPromptValid || !isImageValid || generateMutation.isPending;

  return (
    <div className="font-body-md text-body-md min-h-screen bg-black text-white">
      <main className="max-w-container mx-auto px-lg flex flex-col gap-lg relative z-10">
        {/* Points Card */}
        <section className="bg-surface-material backdrop-blur-[20px] backdrop-saturate-[150%] border border-border-glass/50 rounded-xl p-lg relative overflow-hidden flex flex-col gap-md">
          <div className="absolute top-lg right-lg text-secondary opacity-80">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[rgba(245,158,11,0.18)] bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.16),transparent_60%),rgba(255,204,0,0.03)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <Coins className="size-7 text-secondary" />
            </div>
          </div>
          <div>
            <p className="text-mono-label text-text-dim mb-xs">Available Balance</p>
            <h2 className="text-display-xl text-white tracking-tight">{data?.points ?? "~"}</h2>
          </div>
          <Button
            onClick={() => navigate({ to: "/app/settings" })}
            className="w-full bg-white/10 text-white border border-border-glass/50 hover:bg-white/20 transition-colors mt-sm"
          >
            Get More Points
          </Button>
        </section>

        {/* Generation Form */}
        <section className="mt-md flex flex-col gap-lg">
          {/* Content Type Select */}
          <div className="flex flex-col gap-sm">
            <Label className="text-mono-label text-text-dim pl-xs">Content Type</Label>
            <ContentTypeSelect
              value={contentType}
              onChange={setContentType}
              options={CONTENT_TYPES}
            />
          </div>

          {/* Instagram Upload */}
          {contentType === "instagram" && (
            <ImageUpload key={contentType} onBase64Change={setImageBase64} />
          )}

          {/* Prompt Textarea */}
          <div className="flex flex-col gap-sm">
            <Label className="text-mono-label text-text-dim pl-xs">Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to create..."
              className="bg-surface-form border-none text-white placeholder:text-text-muted focus:ring-2 focus:ring-primary resize-none rounded-lg px-lg py-md h-32"
            />
          </div>

          {/* Activity Link */}
          <Link
            to="/app/history"
            className="bg-surface-material backdrop-blur-[20px] backdrop-saturate-150 border border-border-glass/50 rounded-lg px-lg py-md flex justify-between items-center hover:bg-white/10 transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center gap-md">
              <History className="size-5 text-primary" />
              <span className="font-body-md text-white">Prompts Store</span>
            </div>
            <ChevronRight className="size-5 text-white/40" />
          </Link>

          {/* Pro Tip Banner */}
          <div className="flex gap-md bg-primary/10 rounded-lg p-md items-start">
            <Lightbulb className="size-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-caption-xs text-white/80 leading-snug">
              Pro Tip: Specificity matters. Try adding constraints like{" "}
              <span className="text-white font-medium">"under 280 characters"</span> for better
              results.
            </p>
          </div>

          {/* Primary Action */}
          <button
            type="button"
            onClick={() =>
              generateMutation.mutate({
                contentType: contentType as "thread" | "instagram" | "linkedin",
                prompt,
                imageBase64,
              })
            }
            disabled={isButtonDisabled}
            className="btn-primary mt-[1.2rem] h-[3.0625rem] w-full rounded-[1rem] border-none bg-linear-to-r from-[#7c5ce6] to-[#8f67ff] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_14px_28px_rgba(102,63,219,0.35)] transition-colors duration-150 hover:from-[#7656df] hover:to-[#8a63fa] disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:test-md flex items-center justify-center gap-2"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating…
              </>
            ) : (
              "Generate Content (5 points)"
            )}
          </button>
        </section>
      </main>
    </div>
  );
}

function ContentTypeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-lg px-lg py-md text-white text-left bg-surface-form focus:outline-none focus:ring-2 focus:ring-primary border-none flex items-center justify-between cursor-pointer"
      >
        <span className="flex items-center gap-2">
          {selected?.icon}
          {selected?.label}
        </span>
        <ChevronDown
          className={`size-5 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden bg-surface-form backdrop-blur-[20px] border border-border-glass/50">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-lg py-md text-white text-sm hover:bg-white/10 transition-colors ${
                opt.value === value ? "bg-white/10" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                {opt.icon}
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
