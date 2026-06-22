import { Instagram as InstagramIcon, Twitter, Dribbble, Pin } from "lucide-react";

/**
 * Canonical list of supported publishing platforms, their display
 * labels, and icons. Kept in its own data file so both the
 * `<PlatformSelector>` UI and the parent page can look up a platform
 * by id (e.g. to find the icon for a placeholder mock).
 */
export const platforms = [
  { id: "instagram", label: "Instagram", icon: InstagramIcon },
  { id: "twitter", label: "X / Twitter", icon: Twitter },
  { id: "dribbble", label: "Dribbble", icon: Dribbble },
  { id: "pinterest", label: "Pinterest", icon: Pin },
] as const;

export type PlatformId = (typeof platforms)[number]["id"];

export type PlatformInfo = (typeof platforms)[number];

/** Resolve a platform by id; returns undefined if no match. */
export function findPlatform(id: PlatformId): PlatformInfo | undefined {
  return platforms.find((p) => p.id === id);
}
