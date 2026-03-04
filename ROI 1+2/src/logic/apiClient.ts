/**
 * API client for the Planted ESG Assessment backend.
 *
 * Graceful degradation: if the backend is unreachable, all functions
 * resolve silently so the app works in localStorage-only mode.
 */

import type { AppState, ScorecardOutput } from "../types";

const BASE = "/api/assessments";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function safeFetch(
  url: string,
  options: RequestInit
): Promise<Response | null> {
  try {
    const res = await fetch(url, options);
    return res;
  } catch {
    // Network error / backend offline – fail silently
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start a new assessment draft.
 * Returns null if the backend is unavailable.
 */
export async function startAssessment(): Promise<{
  assessmentId: string;
  writeToken: string;
} | null> {
  const res = await safeFetch(`${BASE}/start`, { method: "POST" });
  if (!res || !res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Autosave partial state to the backend.
 * Fires-and-forgets; backend errors are silently ignored.
 */
export async function patchAssessment(
  id: string,
  token: string,
  state: Partial<AppState>,
  progressPct: number,
  validationErrors?: Record<string, string>
): Promise<void> {
  await safeFetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      payload: state,
      progressPct,
      validationErrors: validationErrors ?? null,
      companyName:
        (state.surveyInput?.sectionA?.companyName as string | undefined) ??
        null,
    }),
  });
}

/**
 * Submit the completed assessment with its scorecard output.
 */
export async function submitAssessment(
  id: string,
  token: string,
  outputs: ScorecardOutput,
  state: Partial<AppState>
): Promise<void> {
  await safeFetch(`${BASE}/${id}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ outputs, payload: state }),
  });
}
