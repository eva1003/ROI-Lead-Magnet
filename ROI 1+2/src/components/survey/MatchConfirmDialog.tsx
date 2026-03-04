/**
 * MatchConfirmDialog – zeigt unsichere Stakeholder-Zuordnungen zur manuellen Bestätigung.
 *
 * Erscheint wenn matchState === "needsConfirmation".
 * Zeigt: Eingabe-Name vs. Top-5-Kandidaten mit Source-Badges.
 * Aktionen: Kandidat bestätigen | "Firma nicht gefunden" | "Weiter suchen" (Dialog schließen).
 */

import type { CompanyRecord } from "../../data/companyIndex";
import { getCompanySuggestions } from "../../data/companyIndex";

export interface ConfirmDialogResult {
  action: "confirm" | "noMatch" | "keepSearching";
  company?: CompanyRecord;
}

interface Props {
  inputValue: string;
  onResult: (result: ConfirmDialogResult) => void;
}

export function MatchConfirmDialog({ inputValue, onResult }: Props) {
  const candidates = getCompanySuggestions(inputValue, 5);

  return (
    <div className="match-confirm-overlay" role="dialog" aria-modal="true">
      <div className="match-confirm-dialog">
        <h3 className="match-confirm-title">Zuordnung bestätigen</h3>
        <p className="match-confirm-desc">
          Für <strong>&ldquo;{inputValue}&rdquo;</strong> wurden ähnliche Einträge
          in den ESG-Registern gefunden. Bitte wählen Sie den passenden Eintrag
          oder geben Sie an, dass die Firma nicht gefunden wurde.
        </p>

        <div className="match-confirm-columns">
          <div className="match-confirm-input-col">
            <span className="match-confirm-col-label">Ihre Eingabe</span>
            <span className="match-confirm-input-value">{inputValue}</span>
          </div>
          <div className="match-confirm-candidates-col">
            <span className="match-confirm-col-label">Kandidaten im Register</span>
            {candidates.length === 0 ? (
              <p className="match-confirm-no-candidates">
                Keine weiteren Kandidaten gefunden.
              </p>
            ) : (
              <ul className="match-confirm-list">
                {candidates.map((c) => (
                  <li key={c.id} className="match-confirm-item">
                    <button
                      type="button"
                      className="match-confirm-candidate-btn"
                      onClick={() => onResult({ action: "confirm", company: c })}
                    >
                      <span className="match-confirm-candidate-name">
                        {c.name}
                      </span>
                      <span className="match-confirm-badges">
                        {c.sources.sbti && (
                          <span className="source-badge source-badge--sbti">
                            SBTi
                          </span>
                        )}
                        {c.sources.cdp && (
                          <span className="source-badge source-badge--cdp">
                            CDP
                          </span>
                        )}
                        {c.sources.csrd && (
                          <span className="source-badge source-badge--csrd">
                            CSRD
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="match-confirm-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onResult({ action: "keepSearching" })}
          >
            ← Weiter suchen
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => onResult({ action: "noMatch" })}
          >
            Firma nicht gefunden
          </button>
        </div>
      </div>
    </div>
  );
}
