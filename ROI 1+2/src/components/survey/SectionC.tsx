/**
 * SectionC – Lieferant*innen-Check
 *
 * Drei Pfade:
 *  Ja  → linkedBusinessCount + scopeUnknown + avgRevenueSharePct + [requirementsMet wenn !scopeUnknown] + [Stakeholder-Autocomplete wenn scopeUnknown]
 *  Nein / Nicht sicher → Stakeholder-Autocomplete direkt
 *
 * Stakeholder-Einträge nutzen AutocompleteInput + MatchConfirmDialog.
 */

import { useState } from "react";
import type { SectionC, StakeholderEntry } from "../../types";
import { MAX_STAKEHOLDERS } from "../../types";
import { findBestCompanyMatch } from "../../data/companyIndex";
import type { CompanyRecord } from "../../data/companyIndex";
import { AutocompleteInput } from "./AutocompleteInput";
import type { AutocompleteSelection } from "./AutocompleteInput";
import { MatchConfirmDialog } from "./MatchConfirmDialog";
import type { ConfirmDialogResult } from "./MatchConfirmDialog";
import { Tooltip } from "../Tooltip";

interface Props {
  data: SectionC;
  onChange: (data: SectionC) => void;
  errors: Partial<Record<string, string>>;
}

let idCounter = 0;
const newId = () => `sh-${++idCounter}-${Date.now()}`;

function makeEntry(): StakeholderEntry {
  return {
    id: newId(),
    inputValue: "",
    selectedCompanyId: null,
    selectedName: null,
    matchConfidence: 0,
    matchState: "pending",
    flags: { inSBTi: false, inCDP: false, inCSRD: false },
  };
}

function flagsFromRecord(company: CompanyRecord) {
  return {
    inSBTi: company.sources.sbti,
    inCDP: company.sources.cdp,
    inCSRD: company.sources.csrd,
  };
}

export function SectionCForm({ data, onChange, errors }: Props) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{ entryId: string; name: string } | null>(null);

  const set = <K extends keyof SectionC>(key: K, value: SectionC[K]) =>
    onChange({ ...data, [key]: value });

  const updateStakeholder = (id: string, update: Partial<StakeholderEntry>) => {
    set(
      "stakeholders",
      data.stakeholders.map((s) => (s.id === id ? { ...s, ...update } : s))
    );
  };

  const addStakeholder = () => {
    if (data.stakeholders.length >= MAX_STAKEHOLDERS) return;
    set("stakeholders", [...data.stakeholders, makeEntry()]);
  };

  const removeStakeholder = (id: string) => {
    set(
      "stakeholders",
      data.stakeholders.filter((s) => s.id !== id)
    );
    if (confirmingId === id) setConfirmingId(null);
  };

  const handleAutocompleteSelect = (
    id: string,
    selection: AutocompleteSelection
  ) => {
    const { inputValue, company } = selection;

    if (company !== null) {
      const isDuplicate = data.stakeholders.some(
        (s) => s.id !== id && s.selectedCompanyId === company.id
      );
      if (isDuplicate) {
        setDuplicateWarning({ entryId: id, name: company.name });
        return;
      }
      setDuplicateWarning(null);
      // User explicitly picked a company from dropdown
      updateStakeholder(id, {
        inputValue,
        selectedCompanyId: company.id,
        selectedName: company.name,
        matchConfidence: 1.0,
        matchState: "selected",
        flags: flagsFromRecord(company),
      });
    } else {
      // User clicked "Firma nicht gefunden" – try auto-match
      if (inputValue.trim()) {
        const best = findBestCompanyMatch(inputValue, 0.75);
        if (best) {
          // Possible match → ask for confirmation
          updateStakeholder(id, {
            inputValue,
            selectedCompanyId: null,
            selectedName: null,
            matchConfidence: best.confidence,
            matchState: "needsConfirmation",
            flags: { inSBTi: false, inCDP: false, inCSRD: false },
          });
          setConfirmingId(id);
        } else {
          // No match at all
          updateStakeholder(id, {
            inputValue,
            selectedCompanyId: null,
            selectedName: null,
            matchConfidence: 0,
            matchState: "noMatch",
            flags: { inSBTi: false, inCDP: false, inCSRD: false },
          });
        }
      }
    }
  };

  const handleConfirmResult = (id: string, result: ConfirmDialogResult) => {
    setConfirmingId(null);
    if (result.action === "confirm" && result.company) {
      const isDuplicate = data.stakeholders.some(
        (s) => s.id !== id && s.selectedCompanyId === result.company!.id
      );
      if (isDuplicate) {
        setDuplicateWarning({ entryId: id, name: result.company.name });
        updateStakeholder(id, {
          selectedCompanyId: null,
          selectedName: null,
          matchConfidence: 0,
          matchState: "pending",
          flags: { inSBTi: false, inCDP: false, inCSRD: false },
        });
        return;
      }
      setDuplicateWarning(null);
      updateStakeholder(id, {
        selectedCompanyId: result.company.id,
        selectedName: result.company.name,
        matchConfidence: 1.0,
        matchState: "selected",
        flags: flagsFromRecord(result.company),
      });
    } else if (result.action === "noMatch") {
      updateStakeholder(id, {
        selectedCompanyId: null,
        selectedName: null,
        matchConfidence: 0,
        matchState: "noMatch",
        flags: { inSBTi: false, inCDP: false, inCSRD: false },
      });
    } else {
      // keepSearching → back to pending
      updateStakeholder(id, {
        selectedCompanyId: null,
        selectedName: null,
        matchConfidence: 0,
        matchState: "pending",
        flags: { inSBTi: false, inCDP: false, inCSRD: false },
      });
    }
  };

  const resetToEditing = (id: string) => {
    updateStakeholder(id, {
      selectedCompanyId: null,
      selectedName: null,
      matchConfidence: 0,
      matchState: "pending",
    });
  };

  const stakeholderSection = (
    <div className="stakeholder-names-section">
      <h3>
        Wichtigste Stakeholder (Unternehmensnamen)
        <Tooltip text="Tragen Sie die Namen Ihrer wichtigsten Kunden, Investoren oder Lieferanten ein. Planted gleicht diese mit SBTi (14.000+), CDP (812) und CSRD-Listen (715 Unternehmen) ab." />
      </h3>
      <p className="hint">
        Geben Sie bis zu {MAX_STAKEHOLDERS} Unternehmensnamen ein. Die
        Zuordnung zu ESG-Registern erfolgt automatisch beim Tippen.
      </p>

      <div className="stakeholder-list">
        {data.stakeholders.map((entry, i) => (
          <div key={entry.id} className="stakeholder-entry">
            <span className="stakeholder-index">{i + 1}.</span>

            {/* Confirm dialog overlay */}
            {confirmingId === entry.id && (
              <MatchConfirmDialog
                inputValue={entry.inputValue}
                onResult={(result) => handleConfirmResult(entry.id, result)}
              />
            )}

            {/* Resolved state */}
            {(entry.matchState === "selected" ||
              entry.matchState === "autoMatchedHigh" ||
              entry.matchState === "noMatch") ? (
              <div className="stakeholder-resolved">
                <span
                  className={
                    entry.matchState === "noMatch"
                      ? "stakeholder-resolved-name stakeholder-no-match"
                      : "stakeholder-resolved-name"
                  }
                >
                  {entry.matchState === "noMatch"
                    ? entry.inputValue || "—"
                    : entry.selectedName || entry.inputValue}
                  {entry.matchState === "noMatch" && (
                    <span className="stakeholder-not-found-tag">
                      {" "}(nicht gefunden)
                    </span>
                  )}
                </span>
                <span className="autocomplete-option-badges">
                  {entry.flags.inSBTi && (
                    <span className="source-badge source-badge--sbti">SBTi</span>
                  )}
                  {entry.flags.inCDP && (
                    <span className="source-badge source-badge--cdp">CDP</span>
                  )}
                  {entry.flags.inCSRD && (
                    <span className="source-badge source-badge--csrd">CSRD</span>
                  )}
                </span>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => resetToEditing(entry.id)}
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  className="btn-icon btn-remove"
                  onClick={() => removeStakeholder(entry.id)}
                  aria-label="Entfernen"
                >
                  ×
                </button>
              </div>
            ) : (
              /* Pending / needsConfirmation → show input */
              <div className="stakeholder-input-row">
                <AutocompleteInput
                  id={`stakeholder-${entry.id}`}
                  value={entry.inputValue}
                  onSelect={(sel) =>
                    handleAutocompleteSelect(entry.id, sel)
                  }
                  onInputChange={(text) => {
                    updateStakeholder(entry.id, { inputValue: text });
                    if (duplicateWarning?.entryId === entry.id)
                      setDuplicateWarning(null);
                  }}
                  placeholder={`Unternehmen ${i + 1} …`}
                  disabled={entry.matchState === "needsConfirmation"}
                />
                {duplicateWarning?.entryId === entry.id && (
                  <span className="error-msg">
                    „{duplicateWarning.name}" wurde bereits hinzugefügt.
                  </span>
                )}
                <button
                  type="button"
                  className="btn-icon btn-remove"
                  onClick={() => removeStakeholder(entry.id)}
                  aria-label="Entfernen"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {data.stakeholders.length < MAX_STAKEHOLDERS ? (
        <button
          type="button"
          className="btn-secondary"
          onClick={addStakeholder}
        >
          + Stakeholder hinzufügen
        </button>
      ) : (
        <p className="hint">
          Maximum von {MAX_STAKEHOLDERS} Stakeholdern erreicht.
        </p>
      )}

      {errors.stakeholders && (
        <span className="error-msg">{errors.stakeholders}</span>
      )}
    </div>
  );

  return (
    <div className="section">
      <h2 className="section-title">Lieferant*innen-Check</h2>

      {/* Question 1: Haben Sie ESG-geknüpfte Geschäftsbeziehungen? */}
      <div className="field">
        <label>
          Haben Sie bereits Geschäftsbeziehungen, die an Ihre
          Nachhaltigkeitsperformance geknüpft sind?{" "}
          <span className="required">*</span>
          <Tooltip text="Gemeint sind Kunden, Investoren oder Lieferanten, die konkrete ESG-Anforderungen an Sie stellen – z. B. einen ausgefüllten EcoVadis-Fragebogen, einen Corporate Carbon Footprint oder CDP-Reporting." />
        </label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="sustainabilityLinkedBusiness"
              checked={data.sustainabilityLinkedBusiness === true}
              onChange={() => set("sustainabilityLinkedBusiness", true)}
            />
            Ja
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="sustainabilityLinkedBusiness"
              checked={data.sustainabilityLinkedBusiness === false}
              onChange={() =>
                onChange({
                  ...data,
                  sustainabilityLinkedBusiness: false,
                  linkedBusinessCount: null,
                  requirementsMet: null,
                  scopeUnknown: false,
                  avgRevenueSharePct: null,
                })
              }
            />
            Nein
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="sustainabilityLinkedBusiness"
              checked={data.sustainabilityLinkedBusiness === "nicht_sicher"}
              onChange={() =>
                onChange({
                  ...data,
                  sustainabilityLinkedBusiness: "nicht_sicher",
                  linkedBusinessCount: null,
                  requirementsMet: null,
                  scopeUnknown: false,
                  avgRevenueSharePct: null,
                })
              }
            />
            Nicht sicher
          </label>
        </div>
        {errors.sustainabilityLinkedBusiness && (
          <span className="error-msg">
            {errors.sustainabilityLinkedBusiness}
          </span>
        )}
      </div>

      {/* ─── Ja-Pfad ──────────────────────────────────────────────────────────── */}
      {data.sustainabilityLinkedBusiness === true && (
        <div className="nested-section">
          {/* Anzahl betroffener Beziehungen */}
          <div className="field">
            <label>
              Wie viele Geschäftsbeziehungen sind betroffen?
              <Tooltip text="Zählen Sie bestehende und bevorstehende Kundenbeziehungen, bei denen ESG-Anforderungen gestellt werden oder werden könnten." />
            </label>
            <input
              type="number"
              min={1}
              step={1}
              className={`input-number${errors.linkedBusinessCount ? " error" : ""}`}
              value={data.linkedBusinessCount ?? ""}
              onChange={(e) =>
                set(
                  "linkedBusinessCount",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              placeholder="z. B. 3"
            />
            {errors.linkedBusinessCount && (
              <span className="error-msg">{errors.linkedBusinessCount}</span>
            )}
          </div>

          {/* Scope unbekannt */}
          <div className="field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={data.scopeUnknown}
                onChange={(e) =>
                  onChange({
                    ...data,
                    scopeUnknown: e.target.checked,
                    requirementsMet: e.target.checked
                      ? null
                      : data.requirementsMet,
                  })
                }
              />
              Umfang nicht vollständig bekannt
              <Tooltip text="Aktivieren, wenn Sie nicht genau wissen, welche Ihrer Geschäftspartner ESG-Anforderungen stellen – um diese dann über die Stakeholder-Suche zu identifizieren." />
            </label>
          </div>

          {/* Durchschnittlicher Umsatzanteil */}
          <div className="field">
            <label>
              Durchschnittlicher Umsatzanteil dieser Beziehungen{" "}
              <span className="required">*</span>
              <Tooltip text="Wie viel Prozent Ihres Umsatzes entfällt durchschnittlich auf diese ESG-geknüpften Geschäftsbeziehungen? Eingabe 0–100." />
            </label>
            <div className="input-with-unit">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                className={`input-number${errors.avgRevenueSharePct ? " error" : ""}`}
                value={data.avgRevenueSharePct ?? ""}
                onChange={(e) =>
                  set(
                    "avgRevenueSharePct",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                placeholder="z. B. 30"
              />
              <span className="unit-label">%</span>
            </div>
            {errors.avgRevenueSharePct && (
              <span className="error-msg">{errors.avgRevenueSharePct}</span>
            )}
          </div>

          {/* Anforderungen erfüllbar? (nur wenn Scope bekannt) */}
          {!data.scopeUnknown && (
            <div className="field">
              <label>
                Können Sie die Anforderungen bislang erfüllen?{" "}
                <span className="required">*</span>
                <Tooltip text="Können Sie aktuell alle geforderten Nachhaltigkeitsnachweise liefern (z. B. CO₂-Daten, Zertifikate, Fragebögen)?" />
              </label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="requirementsMet"
                    checked={data.requirementsMet === true}
                    onChange={() => set("requirementsMet", true)}
                  />
                  Ja
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="requirementsMet"
                    checked={data.requirementsMet === false}
                    onChange={() => set("requirementsMet", false)}
                  />
                  Nein
                </label>
              </div>
              {errors.requirementsMet && (
                <span className="error-msg">{errors.requirementsMet}</span>
              )}
            </div>
          )}

          {/* Stakeholder-Autocomplete nur wenn scopeUnknown */}
          {data.scopeUnknown && stakeholderSection}
        </div>
      )}

      {/* ─── Nein / Nicht sicher Pfad ─────────────────────────────────────────── */}
      {(data.sustainabilityLinkedBusiness === false ||
        data.sustainabilityLinkedBusiness === "nicht_sicher") &&
        stakeholderSection}
    </div>
  );
}
