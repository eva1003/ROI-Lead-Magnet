import type {
  ScorecardOutput,
  SurveyInput,
  ExportPayload,
} from "../../types";
import { TOPIC_LABELS, RECOMMENDATION_LABELS } from "../../types";
import plantedLogo from "../../assets/planted-logo-lilac.svg";
import { FeatureEstimatesSection } from "./FeatureEstimatesSection";

interface Props {
  input: SurveyInput;
  output: ScorecardOutput;
  onRestart: () => void;
}

function riskColor(level: "Niedrig" | "Mittel" | "Hoch") {
  if (level === "Niedrig") return "risk-low";
  if (level === "Mittel") return "risk-medium";
  return "risk-high";
}

function supplierRisk(inSBTi: boolean, inCDP: boolean, inCSRD: boolean): { label: string; cls: string } {
  const count = [inSBTi, inCDP, inCSRD].filter(Boolean).length;
  if (count === 0) return { label: "Kein Risiko", cls: "" };
  if (count === 1) return { label: "Niedrig", cls: "risk-badge risk-badge-niedrig" };
  if (count === 2) return { label: "Mittel", cls: "risk-badge risk-badge-mittel" };
  return { label: "Hoch", cls: "risk-badge risk-badge-hoch" };
}

function maturityColor(level: string) {
  if (level === "Fortgeschritten") return "maturity-advanced";
  if (level === "Mittel") return "maturity-medium";
  return "maturity-beginner";
}

function formatEur(n: number | null) {
  if (n === null || n === undefined) return "–";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function Scorecard({ input, output, onRestart }: Props) {
  const { sectionA, sectionC, sectionD } = input;
  const {
    maturityLevel,
    maturityWarning,
    alreadyImplemented,
    recommendedFeatures,
    recommendationReasons,
    riskScore,
    stakeholderExposure,
  } = output;

  const handleExport = () => {
    // Build wide-friendly per_feature_estimates for tabular export
    const perFeatureFlat: Record<string, string | number | boolean> = {};
    output.featureEstimates.slice(0, 10).forEach((est, i) => {
      const n = i + 1;
      perFeatureFlat[`feature_estimate_${n}_key`] = est.key;
      perFeatureFlat[`feature_estimate_${n}_base_hours`] = est.noEstimateAvailable ? "" : est.baseHours;
      perFeatureFlat[`feature_estimate_${n}_hours_with_planted`] = est.noEstimateAvailable ? "" : est.hoursWithPlanted;
      perFeatureFlat[`feature_estimate_${n}_saved_hours`] = est.noEstimateAvailable ? "" : est.savedHours;
      perFeatureFlat[`feature_estimate_${n}_saved_money_eur`] = est.noEstimateAvailable ? "" : est.savedMoneyEUR;
    });

    const payload: ExportPayload & { per_feature_estimates: typeof perFeatureFlat } = {
      timestamp: new Date().toISOString(),
      inputs: input,
      outputs: output,
      per_feature_estimates: perFeatureFlat,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planted-esg-assessment-${sectionA.companyName.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maturityDescriptions: Record<string, string> = {
    Fortgeschritten:
      "Ihr Unternehmen verfügt über ein ausgereiftes ESG-Programm mit CCF, PCF, VSME, ESG-KPIs und Strategierahmen.",
    Mittel:
      "Ihr Unternehmen hat solide ESG-Grundlagen – ausgewählte Vertiefungen sind der nächste Schritt.",
    Einsteiger:
      "Ihr Unternehmen steht am Anfang des ESG-Wegs. Planted begleitet Sie strukturiert vom ersten Schritt.",
    "Kein ESG Setup":
      "Es sind noch keine aktiven ESG-Maßnahmen erfasst. Ein strukturierter Einstieg ist empfehlenswert.",
  };

  // Derive display values for the stakeholder exposure block
  const exp = stakeholderExposure;
  const showDetailedExposure = sectionC.sustainabilityLinkedBusiness === true && !sectionC.scopeUnknown;

  return (
    <div className="scorecard">
      {/* Header */}
      <div className="scorecard-header">
        <img src={plantedLogo} alt="planted." className="scorecard-logo-img" />
        <div className="scorecard-company">
          <h1>{sectionA.companyName}</h1>
          <div className="scorecard-meta">
            <span className="tag">{sectionA.industry || "–"}</span>
            <span className="tag">{sectionA.companyType || "–"}</span>
            <span className="tag">{sectionA.employeeRange || "–"} MA</span>
          </div>
        </div>
        <div className="scorecard-actions">
          <button className="btn-secondary" onClick={onRestart}>
            Neu starten
          </button>
          <button className="btn-primary" onClick={handleExport}>
            Export JSON
          </button>
        </div>
      </div>

      <div className="scorecard-grid">
        {/* Maturity Level */}
        <div className={`score-block maturity ${maturityColor(maturityLevel)}`}>
          <div className="block-label">ESG Maturity</div>
          <div className="block-value">{maturityLevel}</div>
          <div className="block-description">
            {maturityDescriptions[maturityLevel] ?? ""}
          </div>
          {maturityWarning && (
            <div className="block-warning">⚠ {maturityWarning}</div>
          )}
        </div>

        {/* Risk Level */}
        <div className={`score-block risk ${riskColor(riskScore.level)}`}>
          <div className="block-label">Stakeholder-Risiko</div>
          <div className="block-value">{riskScore.level}</div>
          <div className="block-score">Score: {riskScore.score}/100</div>
          <ul className="block-drivers">
            {riskScore.drivers.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>

        {/* Already Implemented */}
        <div className="score-block">
          <div className="block-label">Bereits umgesetzt</div>
          {alreadyImplemented.length > 0 ? (
            <ul className="feature-list implemented">
              {alreadyImplemented.map((k) => (
                <li key={k}>
                  <span className="badge badge-done">✓</span> {TOPIC_LABELS[k]}
                </li>
              ))}
            </ul>
          ) : (
            <p className="block-empty">Noch keine Themen als aktiv markiert.</p>
          )}
        </div>

        {/* Recommendations */}
        <div className="score-block">
          <div className="block-label">Empfehlungen von Planted</div>
          {recommendedFeatures.length > 0 ? (
            <ul className="feature-list recommended">
              {recommendedFeatures.map((k) => (
                <li key={k}>
                  <span className="badge badge-rec">→</span>{" "}
                  <strong>{RECOMMENDATION_LABELS[k]}</strong>
                  {recommendationReasons[k] && (
                    <span className="rec-reason">
                      {" "}
                      – {recommendationReasons[k]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="block-empty">Keine zusätzlichen Empfehlungen.</p>
          )}
        </div>

        {/* Feature Estimates */}
        {output.featureEstimates.length > 0 && (
          <FeatureEstimatesSection estimates={output.featureEstimates} />
        )}

        {/* Stakeholder Exposure */}
        <div className="score-block stakeholder-block">
          <div className="block-label">Stakeholder-Exposure</div>

          {showDetailedExposure ? (
            /* Ja-Pfad mit bekanntem Scope */
            <div className="exposure-detail">
              <div className="kpi-row">
                <span className="kpi-label">Betroffene Beziehungen</span>
                <span className="kpi-value">
                  {sectionC.linkedBusinessCount ?? "–"}
                </span>
              </div>
              {sectionC.avgRevenueSharePct !== null && (
                <div className="kpi-row">
                  <span className="kpi-label">Ø Umsatzanteil</span>
                  <span className="kpi-value">
                    {sectionC.avgRevenueSharePct} %
                  </span>
                </div>
              )}
              <div className="kpi-row">
                <span className="kpi-label">Anforderungen erfüllbar</span>
                <span
                  className={`kpi-value ${sectionC.requirementsMet ? "green" : "red"}`}
                >
                  {sectionC.requirementsMet === true
                    ? "Ja"
                    : sectionC.requirementsMet === false
                      ? "Nein"
                      : "–"}
                </span>
              </div>
            </div>
          ) : (
            /* Nein-Pfad oder scopeUnknown → Register-Matches */
            <div className="exposure-detail">
              <div className="kpi-row">
                <span className="kpi-label">Stakeholder eingegeben</span>
                <span className="kpi-value">
                  {exp.totalStakeholdersProvided}
                </span>
              </div>
              <div className="kpi-row">
                <span className="kpi-label">
                  Davon mit ESG-Verpflichtungen
                  {sectionC.sustainabilityLinkedBusiness !== true && (
                    <span className="kpi-hint"> (indikativ)</span>
                  )}
                </span>
                <span className="kpi-value">{exp.matchesTotalCount}</span>
              </div>
              {exp.matchesTotalCount > 0 && (
                <div className="exposure-badges-row">
                  {exp.sbtiMatchesCount > 0 && (
                    <span className="source-badge source-badge--sbti">
                      SBTi: {exp.sbtiMatchesCount}
                    </span>
                  )}
                  {exp.cdpMatchesCount > 0 && (
                    <span className="source-badge source-badge--cdp">
                      CDP: {exp.cdpMatchesCount}
                    </span>
                  )}
                  {exp.csrdMatchesCount > 0 && (
                    <span className="source-badge source-badge--csrd">
                      CSRD: {exp.csrdMatchesCount}
                    </span>
                  )}
                </div>
              )}
              {exp.checkResults.length > 0 && (
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Stakeholder</th>
                      <th>SBTi</th>
                      <th>CDP</th>
                      <th>CSRD</th>
                      <th>Risiko</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exp.checkResults.map((r) => {
                      const risk = supplierRisk(r.inSBTi, r.inCDP, r.inCSRD);
                      return (
                        <tr key={r.nameOriginal}>
                          <td>
                            {r.correctedName ? (
                              <>
                                {r.nameOriginal}{" "}
                                <span className="db-correction">
                                  → {r.correctedName}
                                </span>
                              </>
                            ) : (
                              r.nameOriginal
                            )}
                          </td>
                          <td className={r.inSBTi ? "hit" : "miss"}>
                            {r.inSBTi ? "✓" : "–"}
                          </td>
                          <td className={r.inCDP ? "hit" : "miss"}>
                            {r.inCDP ? "✓" : "–"}
                          </td>
                          <td className={r.inCSRD ? "hit" : "miss"}>
                            {r.inCSRD ? "✓" : "–"}
                          </td>
                          <td>
                            <span className={risk.cls}>{risk.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {exp.checkResults.length === 0 && (
                <div className="alert-flag">
                  Keine Stakeholder-Namen eingegeben – Signalprüfung nicht möglich.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Finance Block */}
        {sectionD.esgLinkedLoansOrInvestments === true && (
          <div className="score-block finance-block">
            <div className="block-label">Finance-Exposure</div>
            <div className="kpi-row">
              <span className="kpi-label">Betroffenes Volumen</span>
              <span className="kpi-value">
                {formatEur(sectionD.affectedVolumeEur)}
              </span>
            </div>
            {sectionD.interestDeltaPct !== null && (
              <div className="kpi-row">
                <span className="kpi-label">Zinspunkte-Risiko</span>
                <span className="kpi-value">
                  {sectionD.interestDeltaPct}%
                </span>
              </div>
            )}
            {sectionD.penaltiesEur !== null && (
              <div className="kpi-row">
                <span className="kpi-label">Strafzahlungsrisiko</span>
                <span className="kpi-value">
                  {formatEur(sectionD.penaltiesEur)}
                </span>
              </div>
            )}
            <div className="kpi-row">
              <span className="kpi-label">ESG-Anforderungen erfüllbar</span>
              <span
                className={`kpi-value ${sectionD.financeRequirementsMet ? "green" : "red"}`}
              >
                {sectionD.financeRequirementsMet === true
                  ? "Ja"
                  : sectionD.financeRequirementsMet === false
                    ? "Nein"
                    : "–"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="cta-block">
        <h2>Sie wollen ein genaues ROI-Screening?</h2>
        <p>
          Buchen Sie jetzt einen kostenlosen Termin mit unserem ESG-Team und
          erhalten Sie eine individuelle Analyse Ihres ROI-Potenzials mit
          Planted.
        </p>
        <a href="https://planted.green/kontakt/gespraech-vereinbaren" className="btn-cta" target="_blank" rel="noopener noreferrer">
          → Termin buchen
        </a>
      </div>

      <div className="scorecard-footer">
        <p>
          Erstellt am{" "}
          {new Date().toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}{" "}
          · Planted ESG Assessment Tool
        </p>
        <p className="footer-disclaimer">
          Stakeholder-Prüfung basiert auf öffentlich zugänglichen Datenbanken
          (SBTi, CDP, CSRD). Keine rechtsverbindliche Beratung.
        </p>
      </div>
    </div>
  );
}
