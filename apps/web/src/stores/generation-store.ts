import { Store } from "@tanstack/store";

export interface GenerationResult {
  id: string;
  content: string[];
  contentType: "thread" | "instagram" | "linkedin";
  prompt: string;
  imageBase64: string | null;
  createdAt: string;
}

export interface GenerationState {
  current: GenerationResult | null;
}

const STORAGE_KEY = "generai:lastGeneration";

const initialState: GenerationState = { current: null };

// Hydrate from localStorage on module init (SSR-safe)
if (typeof window !== "undefined") {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as GenerationResult;
      initialState.current = parsed;
    }
  } catch (err) {
    console.warn("[generation-store] Failed to hydrate from localStorage:", err);
  }
}

export const generationStore = new Store<GenerationState>(initialState);

// Persist state changes to localStorage
if (typeof window !== "undefined") {
  generationStore.subscribe((state) => {
    try {
      if (state.current) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.current));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn("[generation-store] Failed to persist to localStorage:", err);
    }
  });
}
