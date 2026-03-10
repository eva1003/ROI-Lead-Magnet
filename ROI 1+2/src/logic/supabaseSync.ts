/**
 * Supabase lead sync — fire-and-forget functions for saving survey progress.
 *
 * sessionStorage keys (cleared automatically when tab/browser closes):
 *   planted_lead_id          — UUID of the Supabase row
 *   planted_lead_session_key — UUID used as ownership proof for updates
 */

import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabase";
import type { SurveyInput, ScorecardOutput } from "../types";

const LS_LEAD_ID = "planted_lead_id";
const LS_SESSION_KEY = "planted_lead_session_key";

// ─── Session helpers ──────────────────────────────────────────────────────────

function getSession(): { leadId: string; sessionKey: string } | null {
  const leadId = sessionStorage.getItem(LS_LEAD_ID);
  const sessionKey = sessionStorage.getItem(LS_SESSION_KEY);
  if (leadId && sessionKey) return { leadId, sessionKey };
  return null;
}

function setSession(leadId: string, sessionKey: string): void {
  sessionStorage.setItem(LS_LEAD_ID, leadId);
  sessionStorage.setItem(LS_SESSION_KEY, sessionKey);
}

export function clearLeadSession(): void {
  sessionStorage.removeItem(LS_LEAD_ID);
  sessionStorage.removeItem(LS_SESSION_KEY);
}

// ─── Row builder ──────────────────────────────────────────────────────────────

function buildRow(payload: SurveyInput, step: number, sessionKey: string) {
  const { sectionA } = payload;
  return {
    session_key: sessionKey,
    current_step: step,
    company_name: sectionA.companyName || null,
    email: sectionA.email || null,
    employee_range: sectionA.employeeRange || null,
    company_type: sectionA.companyType || null,
    industry: sectionA.industry || null,
    consent_given: sectionA.consentGiven,
    payload_json: payload,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates a new lead row in Supabase and stores the id + sessionKey in sessionStorage.
 * A new browser session = a new lead row (no stale data from previous visitors).
 * Only called once per browser session (when no existing lead is found).
 */
async function initLead(payload: SurveyInput, step: number): Promise<void> {
  const id = crypto.randomUUID(); // generate UUID client-side — no SELECT needed
  const sessionKey = uuidv4();
  const { error } = await supabase
    .from("leads")
    .insert({ id, ...buildRow(payload, step, sessionKey) });

  if (error) {
    console.error("[Supabase] INSERT error:", error.message, error.details);
    return;
  }
  setSession(id, sessionKey);
  console.info("[Supabase] Lead created:", id);
}

// Debounce state for saveLead
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Saves current survey progress to Supabase (debounced, 2s).
 * Creates a new lead row on first call if none exists yet.
 * Only fires if sectionA.email is filled (minimum contact info).
 */
export function saveLead(payload: SurveyInput, step: number): void {
  if (!payload.sectionA.email) return;

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void (async () => {
      const session = getSession();
      if (!session) {
        await initLead(payload, step);
        return;
      }
      const { leadId, sessionKey } = session;
      const { count, error } = await supabase
        .from("leads")
        .update(buildRow(payload, step, sessionKey), { count: "exact" })
        .eq("id", leadId)
        .eq("session_key", sessionKey);

      if (error) {
        console.error("[Supabase] UPDATE error:", error.message);
      } else if (count === 0) {
        // Row not found (RLS or stale session) — create a fresh one
        console.warn("[Supabase] Update matched 0 rows, reinitializing...");
        sessionStorage.removeItem(LS_LEAD_ID);
        sessionStorage.removeItem(LS_SESSION_KEY);
        await initLead(payload, step);
      }
    })();
  }, 2000);
}

/**
 * Marks the lead as submitted and stores the scorecard outputs.
 * Called immediately (no debounce) when the user reaches the scorecard.
 */
export async function submitLead(
  payload: SurveyInput,
  outputs: ScorecardOutput,
): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  const session = getSession();
  if (!session) {
    // Edge case: submit before any autosave fired
    await initLead(payload, 4);
    const newSession = getSession();
    if (!newSession) return;
    const { error: submitErr } = await supabase
      .from("leads")
      .update({ status: "submitted", outputs_json: outputs, current_step: 4 }, { count: "exact" })
      .eq("id", newSession.leadId)
      .eq("session_key", newSession.sessionKey);
    if (submitErr) console.error("[Supabase] SUBMIT error:", submitErr.message);
    return;
  }

  const { leadId, sessionKey } = session;
  const { error, count } = await supabase
    .from("leads")
    .update(
      {
        status: "submitted",
        outputs_json: outputs,
        current_step: 4,
        payload_json: payload,
        company_name: payload.sectionA.companyName || null,
        email: payload.sectionA.email || null,
        employee_range: payload.sectionA.employeeRange || null,
        company_type: payload.sectionA.companyType || null,
        industry: payload.sectionA.industry || null,
        consent_given: payload.sectionA.consentGiven,
      },
      { count: "exact" },
    )
    .eq("id", leadId)
    .eq("session_key", sessionKey);

  if (error) {
    console.error("[Supabase] SUBMIT error:", error.message);
  } else if (count === 0) {
    console.warn("[Supabase] SUBMIT matched 0 rows — lead may not have been saved");
  } else {
    console.info("[Supabase] Lead submitted:", leadId);
  }
}
