import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/app/automate/lovable")({
  component: Index,
});

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "star", fill: true },
  { id: "twitter", label: "Twitter", icon: "public", fill: false },
  { id: "pinterest", label: "Pinterest", icon: "layers", fill: false },
];

function Icon({
  name,
  fill = false,
  className = "",
}: {
  name: string;
  fill?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}` }}
    >
      {name}
    </span>
  );
}

function Index() {
  const [active, setActive] = useState("instagram");
  const [captionOpen, setCaptionOpen] = useState(false);
  const [caption, setCaption] = useState(
    "✨ Unlocking the future of creativity. This piece merges fluid dynamics with neural networks to create something truly unique.\n#Generai #ArtFuture",
  );
  const [copied, setCopied] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [scheduleDate, setScheduleDate] = useState(today);
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [repeat, setRepeat] = useState("none");
  const [scheduled, setScheduled] = useState(false);

  const handleSchedule = () => {
    setScheduled(true);
    setTimeout(() => {
      setScheduled(false);
      setScheduleOpen(false);
    }, 1400);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

  return (
    <div
      className="flex justify-center min-h-screen bg-black text-white antialiased"
      style={{ fontFamily: "Hanken Grotesk, sans-serif" }}
    >
      <main className="w-full max-w-[576px] relative flex flex-col min-h-screen">
        {/* Top App Bar */}
        <header className="bg-surface-thick sticky top-0 backdrop-blur-3xl border-b border-border-glass flex justify-between items-center px-4 w-full h-16 z-[100]">
          <button className="flex items-center gap-2 active:scale-[0.98] transition-all">
            <Icon name="close" />
          </button>
          <h1 className="text-[20px] leading-6 font-semibold">Content Preview</h1>
          <button className="text-[17px] text-text-dim hover:opacity-80 active:scale-[0.98] transition-all">
            Drafts
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 flex flex-col gap-4 px-4 pt-4 pb-32">
          {/* Platform selection */}
          <section className="flex flex-col gap-2">
            <span
              className="text-[12px] font-semibold uppercase text-text-dim"
              style={{
                fontFamily: "JetBrains Mono, monospace",
                letterSpacing: "0.5px",
              }}
            >
              Select Platform
            </span>
            <div className="flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
              {PLATFORMS.map((p) => {
                const isActive = p.id === active;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActive(p.id)}
                    className={`flex items-center gap-1 px-4 py-2 rounded-full border shrink-0 transition-all ${
                      isActive
                        ? "bg-violet-brand text-white border-transparent shadow-[0_0_15px_rgba(109,93,242,0.4)]"
                        : "bg-surface-material border-border-glass text-text-dim hover:text-white"
                    }`}
                  >
                    <Icon name={p.icon} fill={isActive} className="text-[18px]" />
                    <span className="text-[12px] font-semibold">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Media preview card */}
          <section className="flex flex-col gap-2">
            <div className="relative w-full rounded-xl overflow-hidden border border-border-glass bg-surface-material backdrop-blur-md active:scale-[0.99] transition-transform">
              <div className="flex items-center gap-2 p-3 border-b border-border-glass">
                <div className="w-8 h-8 rounded-full bg-violet-brand flex items-center justify-center text-[10px] font-bold">
                  G
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">generai_art</span>
                  <span className="text-[10px] text-text-dim">Sponsored</span>
                </div>
                <Icon name="more_horiz" className="ml-auto text-text-dim" />
              </div>
              <div className="relative aspect-square w-full">
                <img
                  alt="AI Generated Artwork"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzH1U3r66ktiodmIP2khjP1gidviXnX9Hjkf9w48CFem7CsECEw17ZiH3IYlDLeHaF99L6EYXCfDQX35HkVpIxcXhhPAghSOIQU7-JkTTQl3nV7DnITOCQgMf17mI3os9dIsNZBhBjckEyAcj71nyJ7onsw_RzcPo3E0w5-EnCeIQrgm-saRjIgxGcKUjqBQcJghhqa8OipL9k9WX3M97FQeCc9t6U9_Tdjhihy-FsPMZcHdN-Qo0IaK1LTfQpucCP3OzrDtF-hJLr"
                />
                <button className="absolute bottom-3 right-3 bg-surface-thick backdrop-blur-md px-3 py-1 rounded-full border border-border-glass flex items-center gap-1 hover:bg-surface-thick/90 transition-colors z-10">
                  <Icon name="brush" className="text-[16px]" />
                  <span className="text-[12px]">Edit Design</span>
                </button>
              </div>
              <div className="px-3 pb-1 mt-3">
                <button className="w-full flex items-center justify-center gap-1 py-2 bg-surface-material border border-border-glass rounded-xl text-violet-brand active:scale-[0.98] transition-all hover:bg-surface-material/80">
                  <Icon name="add" className="text-[20px]" />
                  <span className="text-[14px] font-semibold">Add more images</span>
                </button>
              </div>
              <div className="p-3 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Icon name="favorite" />
                  <Icon name="chat_bubble" />
                  <Icon name="send" />
                  <Icon name="bookmark" className="ml-auto" />
                </div>
                <div className="space-y-1">
                  <p className="text-[12px] leading-relaxed">
                    <span className="font-semibold mr-1">generai_art</span>✨ Exploring new horizons
                    with Generai. This piece was generated using the 'Liquid Silk' model with a
                    focus on movement and light.
                  </p>
                  <p className="text-[12px] text-violet-brand">#Generai #AIArt #DigitalCreation</p>
                </div>
              </div>
            </div>
          </section>

          {/* Caption */}
          <section className="flex flex-col gap-2">
            <span
              className="text-[12px] font-semibold uppercase text-text-dim"
              style={{
                fontFamily: "JetBrains Mono, monospace",
                letterSpacing: "0.5px",
              }}
            >
              Edit Post Caption
            </span>
            <button
              onClick={() => setCaptionOpen((v) => !v)}
              aria-expanded={captionOpen}
              className="w-full flex items-center justify-center gap-2 py-3 bg-surface-material border border-border-glass rounded-xl hover:bg-surface-material/50 active:scale-[0.98] transition-all"
            >
              <Icon name="edit_note" className="text-[20px] text-violet-brand" />
              <span className="text-[17px] font-semibold">Edit Caption</span>
            </button>
            {captionOpen && (
              <div className="relative rounded-xl border border-border-glass bg-surface-material p-3">
                <button
                  onClick={handleCopy}
                  aria-label="Copy caption"
                  className="absolute top-2 right-2 p-2 rounded-lg bg-surface-thick border border-border-glass text-text-dim hover:text-white active:scale-95 transition-all z-10"
                >
                  <Icon name={copied ? "check" : "content_copy"} className="text-[16px]" />
                </button>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={5}
                  className="w-full bg-transparent resize-none outline-none text-[14px] leading-relaxed text-white pr-10 placeholder:text-text-dim"
                />
              </div>
            )}
            <div className="flex justify-end">
              <button className="group flex items-center gap-1 px-3 py-2 hover:bg-violet-brand/10 rounded-lg text-violet-brand transition-all">
                <Icon
                  name="refresh"
                  className="text-[18px] group-hover:rotate-180 transition-transform duration-500"
                />
                <span className="text-[14px] font-semibold">Regenerate Caption</span>
              </button>
            </div>
          </section>

          {/* Hint */}
          <div className="flex items-center gap-3 p-3 bg-violet-brand/10 rounded-lg border border-violet-brand/20">
            <Icon name="auto_awesome" className="text-violet-brand text-[20px]" />
            <p className="text-[12px] text-text-dim">
              Generative tags and optimal timing analysis are applied automatically.
            </p>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[576px] p-4 bg-black/80 backdrop-blur-3xl z-[110] border-t border-border-glass">
          <div className="grid grid-cols-2 gap-3">
            <button className="h-[52px] bg-surface-material border border-border-glass rounded-xl text-[17px] font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2">
              <Icon name="send" />
              Publish Now
            </button>
            <button
              onClick={() => setScheduleOpen(true)}
              className="h-[52px] bg-violet-brand text-white rounded-xl text-[17px] font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(109,93,242,0.4)]"
            >
              <Icon name="event_available" />
              Schedule
            </button>
          </div>
        </div>
      </main>

      {scheduleOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setScheduleOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[576px] bg-surface-thick backdrop-blur-3xl border-t sm:border border-border-glass rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-5 animate-in slide-in-from-bottom"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-violet-brand/20 flex items-center justify-center">
                  <Icon name="event_available" className="text-violet-brand text-[20px]" fill />
                </div>
                <div>
                  <h2 className="text-[18px] font-semibold leading-tight">Schedule Content</h2>
                  <p className="text-[12px] text-text-dim">Pick when this post goes live</p>
                </div>
              </div>
              <button
                onClick={() => setScheduleOpen(false)}
                aria-label="Close"
                className="p-2 rounded-full hover:bg-surface-material transition-colors"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 bg-surface-material border border-border-glass rounded-xl p-3 focus-within:border-violet-brand transition-colors">
                <span
                  className="text-[10px] font-semibold uppercase text-text-dim"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    letterSpacing: "0.5px",
                  }}
                >
                  Date
                </span>
                <input
                  type="date"
                  min={today}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="bg-transparent outline-none text-[15px] font-semibold text-white [color-scheme:dark]"
                />
              </label>
              <label className="flex flex-col gap-1 bg-surface-material border border-border-glass rounded-xl p-3 focus-within:border-violet-brand transition-colors">
                <span
                  className="text-[10px] font-semibold uppercase text-text-dim"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    letterSpacing: "0.5px",
                  }}
                >
                  Time
                </span>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="bg-transparent outline-none text-[15px] font-semibold text-white [color-scheme:dark]"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <span
                className="text-[10px] font-semibold uppercase text-text-dim"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "0.5px",
                }}
              >
                Repeat
              </span>
              <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {[
                  { id: "none", label: "One-time" },
                  { id: "daily", label: "Daily" },
                  { id: "weekly", label: "Weekly" },
                  { id: "monthly", label: "Monthly" },
                ].map((r) => {
                  const isActive = repeat === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRepeat(r.id)}
                      className={`px-4 py-2 rounded-full text-[12px] font-semibold shrink-0 border transition-all ${
                        isActive
                          ? "bg-violet-brand text-white border-transparent"
                          : "bg-surface-material border-border-glass text-text-dim hover:text-white"
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-violet-brand/10 rounded-xl border border-violet-brand/20">
              <Icon name="auto_awesome" className="text-violet-brand text-[20px]" />
              <p className="text-[12px] text-text-dim">
                Best engagement window for{" "}
                <span className="text-white font-semibold capitalize">{active}</span> is around 8–10
                PM.
              </p>
            </div>

            <button
              onClick={handleSchedule}
              disabled={scheduled}
              className="h-[52px] bg-violet-brand text-white rounded-xl text-[17px] font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(109,93,242,0.4)] disabled:opacity-90"
            >
              <Icon name={scheduled ? "check_circle" : "schedule_send"} fill={scheduled} />
              {scheduled ? "Scheduled!" : "Confirm Schedule"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
