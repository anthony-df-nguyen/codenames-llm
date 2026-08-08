// localStorage persistence for an in-progress game. Best-effort: any parse
// or storage failure just means starting fresh, never a crash.

import type { PersistedSession } from "./session";

const STORAGE_KEY = "codenames-game";

export function loadPersistedGame(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

export function savePersistedGame(session: PersistedSession) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Quota or private-mode failure — the game stays playable, just not
    // resumable after a refresh.
  }
}

export function clearPersistedGame() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — see savePersistedGame.
  }
}
