import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";

import heroImageUrl from "@/assets/generai-login-hero.jpg";

type InstagramPreviewProps = {
  caption: string;
  image?: string; // Optional override: URL (e.g. blob URL) of the image to display
};

export function InstagramPreview({ caption, image }: InstagramPreviewProps) {
  const [liked, setLiked] = useState(false);
  const [currentImageIndex, _setCurrentImageIndex] = useState(0);
  const [images, _setImages] = useState([heroImageUrl]);

  const displaySrc = image ?? images[currentImageIndex];

  // Parse caption to extract main text and tags
  const parseCaption = (text: string) => {
    const parts = text.split("\n");
    const mainText = parts[0] || "";
    const tagsLine = parts.slice(1).join(" ");
    // Extract individual tags
    const tags = tagsLine.match(/#\w+/g) || [];
    return { mainText, tags };
  };

  const { mainText, tags } = parseCaption(caption);

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
        <div className="relative aspect-square w-full">
          <img
            src={displaySrc}
            alt="AI Generated Artwork"
            className="size-full object-cover"
          />
          {!image && images.length > 1 && (
            <div className="absolute text-white bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-border-glass/50 bg-surface-thick/70 px-3 py-1.5 text-caption-xs backdrop-blur-md">
              {currentImageIndex + 1}/{images.length}
            </div>
          )}
        </div>

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
          <p className="leading-relaxed text-white">
            <span className="mr-1 font-semibold">generai_art</span>
            {mainText}
          </p>
          {tags.length > 0 && <p className="text-caption-xs text-primary/80">{tags.join(" ")}</p>}
          <p className="text-caption-xs text-text-dim">{formattedDate}</p>
        </div>
      </CardContent>
    </Card>
  );
}
