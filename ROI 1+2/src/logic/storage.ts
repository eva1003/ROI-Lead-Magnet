/**
 * sessionStorage persistence helpers.
 * Key bumped to v2 due to SectionC type change (stakeholders: StakeholderEntry[]).
 */

import type { AppState } from "../types";

const STORAGE_KEY = "planted_esg_assessment_v2";

export function loadState(): AppState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

export function saveState(state: AppState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or private browsing – silently ignore
  }
}

export function clearState(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
