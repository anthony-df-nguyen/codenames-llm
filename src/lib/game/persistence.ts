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

// Whether each bot role's reasoning is shown in the live game log. Reasoning
// is always captured (for transcript export) regardless of these — they're
// purely a display filter, so they're a standalone preference like the
// model/logging ones above, not part of in-progress session state. Guesser
// defaults on (useful to watch it think); spymaster defaults off (would
// leak clue-giving strategy the human guesser shouldn't see mid-game, and
// is noisier).
const SHOW_SPYMASTER_REASONING_KEY = "codenames-show-spymaster-reasoning";
const SHOW_GUESSER_REASONING_KEY = "codenames-show-guesser-reasoning";

export function loadShowSpymasterReasoning(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(SHOW_SPYMASTER_REASONING_KEY);
    return raw === null ? false : raw === "true";
  } catch {
    return false;
  }
}

export function saveShowSpymasterReasoning(enabled: boolean) {
  try {
    window.localStorage.setItem(SHOW_SPYMASTER_REASONING_KEY, String(enabled));
  } catch {
    // Ignore — see savePersistedGame.
  }
}

export function loadShowGuesserReasoning(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(SHOW_GUESSER_REASONING_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

export function saveShowGuesserReasoning(enabled: boolean) {
  try {
    window.localStorage.setItem(SHOW_GUESSER_REASONING_KEY, String(enabled));
  } catch {
    // Ignore — see savePersistedGame.
  }
}

const SHOW_TIMESTAMPS_KEY = "codenames-show-timestamps";

export function loadShowTimestamps(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(SHOW_TIMESTAMPS_KEY);
    return raw === null ? false : raw === "true";
  } catch {
    return false;
  }
}

export function saveShowTimestamps(enabled: boolean) {
  try {
    window.localStorage.setItem(SHOW_TIMESTAMPS_KEY, String(enabled));
  } catch {
    // Ignore — see savePersistedGame.
  }
}
