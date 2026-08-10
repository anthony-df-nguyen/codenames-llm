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

// The model override is a standalone preference, not part of an in-progress
// session — it should survive a reset/new game rather than being cleared
// alongside it.
const MODEL_STORAGE_KEY = "codenames-model";

export function loadPreferredModel(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(MODEL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function savePreferredModel(model: string | null) {
  try {
    if (model) {
      window.localStorage.setItem(MODEL_STORAGE_KEY, model);
    } else {
      window.localStorage.removeItem(MODEL_STORAGE_KEY);
    }
  } catch {
    // Ignore — see savePersistedGame.
  }
}

// Same standalone-preference treatment as the model override: this is a
// setup-screen setting, not in-progress session state.
const LOGGING_STORAGE_KEY = "codenames-enable-logging";

export function loadPreferredLogging(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LOGGING_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function savePreferredLogging(enabled: boolean) {
  try {
    window.localStorage.setItem(LOGGING_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore — see savePersistedGame.
  }
}
