import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";

import { ImageEmptyState } from "@/components/previews/image-empty-state";

type InstagramPreviewProps = {
  caption: string;
  image?: string; // Optional override: URL (e.g. blob URL) of the image to display
};

export function InstagramPreview({ caption, image }: InstagramPreviewProps) {
  const [liked, setLiked] = useState(false);

  // Format current date for display
  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="overflow-hidden border border-border-glass/30 bg-surface-material/60">
      <CardContent className="flex flex-col gap-3 p-0">
        {/* IG Header */}
        <div className="flex items-center gap-3 px-4 pt-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-caption-xs font-bold text-white">
            G
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">generai_art</span>
            <span className="text-caption-xs text-text-dim">Sponsored</span>
          </div>
          <button
            type="button"
            className="ml-auto rounded-md p-1 text-text-dim transition-colors hover:bg-white/10 hover:text-white"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </div>

        {/* Post Image */}
        {image ? (
          <div className="relative aspect-square w-full">
            <img src={image} alt="AI Generated Artwork" className="size-full object-cover" />
          </div>
        ) : (
          <ImageEmptyState message="Upload an image to preview your Instagram post here." />
        )}

        {/* Interactions */}
        <div className="flex items-center gap-4 px-4">
          <button
            type="button"
            onClick={() => setLiked((p) => !p)}
            aria-label={liked ? "Unlike" : "Like"}
            className="transition-transform active:scale-90"
          >
            <Heart className={`size-6 ${liked ? "fill-red-400 text-red-400" : "text-white"}`} />
          </button>
          <button
            type="button"
            aria-label="Comment"
            className="transition-transform text-white active:scale-90 hover:text-white/60"
          >
            <MessageCircle className="size-6" />
          </button>
          <button
            type="button"
            aria-label="Share"
            className="transition-transform text-white active:scale-90 hover:text-white/60"
          >
            <Send className="size-6" />
          </button>
          <button
            type="button"
            className="ml-auto rounded-md p-1 text-white transition-colors hover:bg-white/10"
          >
            <Bookmark className="size-6" />
          </button>
        </div>

        {/* Caption */}
        <div className="flex flex-col gap-1 px-4 pb-4">
          <p className="leading-relaxed text-white whitespace-pre-wrap">
            <span className="mr-1 font-semibold">generai_art</span> {caption}
          </p>
          <p className="text-caption-xs text-text-dim">{formattedDate}</p>
        </div>
      </CardContent>
    </Card>
  );
}
