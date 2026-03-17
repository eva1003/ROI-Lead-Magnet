import { useState } from "react";
import type { FeatureEstimate } from "../../types";

interface Props {
  estimates: FeatureEstimate[];
}

function formatEur(n: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function FeatureTile({ e }: { e: FeatureEstimate }) {
  return (
    <div className="estimate-tile">
      <div className="estimate-tile__name">{e.label}</div>
      {e.noEstimateAvailable ? (
        <p className="estimate-tile__no-data">
          Für dieses Feature ist noch keine Stundenabschätzung verfügbar.
        </p>
      ) : (
        <div className="estimate-tile__fields">
          <div className="estimate-field">
            <span className="estimate-field__label">Stundenaufwand (ohne Planted)</span>
            <span className="estimate-field__value">{e.baseHours} Std.</span>
          </div>
          <div className="estimate-field">
            <span className="estimate-field__label">Stundenaufwand (mit Planted)</span>
            <span className="estimate-field__value estimate-field__value--reduced">
              {e.hoursWithPlanted} Std.
            </span>
          </div>
          <div className="estimate-field">
            <span className="estimate-field__label">Zeitersparnis</span>
            <span className="estimate-field__value">{e.savedHours} Std.</span>
          </div>
          <div className="estimate-field estimate-field--highlight">
            <span className="estimate-field__label">Sie sparen</span>
            <span className="estimate-field__value estimate-field__value--money">
              {formatEur(e.savedMoneyEUR)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function FeatureEstimatesSection({ estimates }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(estimates.map((e) => e.key))
  );

  if (estimates.length === 0) return null;

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const selectedEstimates = estimates.filter((e) => selected.has(e.key));

  const totals = selectedEstimates.reduce(
    (acc, e) => {
      if (e.noEstimateAvailable) return acc;
      return {
        baseHours: acc.baseHours + e.baseHours,
        hoursWithPlanted: acc.hoursWithPlanted + e.hoursWithPlanted,
        savedHours: acc.savedHours + e.savedHours,
        savedMoneyEUR: acc.savedMoneyEUR + e.savedMoneyEUR,
      };
    },
    { baseHours: 0, hoursWithPlanted: 0, savedHours: 0, savedMoneyEUR: 0 }
  );

  return (
    <div className="score-block feature-estimates-block">
      <div className="block-label">Zeit- und Ersparnisaussicht</div>

      {/* Feature chips */}
      <div className="feature-chips">
        {estimates.map((e) => (
          <button
            key={e.key}
            className={`feature-chip ${selected.has(e.key) ? "feature-chip--active" : ""}`}
            onClick={() => toggle(e.key)}
            type="button"
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="estimate-tiles">
        {/* Gesamt tile — always shown first */}
        <div className="estimate-tile estimate-tile--totals">
          <div className="estimate-tile__name">
            Gesamt{selectedEstimates.length < estimates.length ? " (Auswahl)" : " (alle empfohlenen Features)"}
          </div>
          {selectedEstimates.length === 0 ? (
            <p className="estimate-tile__no-data">Kein Feature ausgewählt.</p>
          ) : (
            <div className="estimate-tile__fields">
              <div className="estimate-field">
                <span className="estimate-field__label">Stundenaufwand (ohne Planted)</span>
                <span className="estimate-field__value">{totals.baseHours} Std.</span>
              </div>
              <div className="estimate-field">
                <span className="estimate-field__label">Stundenaufwand (mit Planted)</span>
                <span className="estimate-field__value estimate-field__value--reduced">
                  {totals.hoursWithPlanted} Std.
                </span>
              </div>
              <div className="estimate-field">
                <span className="estimate-field__label">Zeitersparnis</span>
                <span className="estimate-field__value">{totals.savedHours} Std.</span>
              </div>
              <div className="estimate-field estimate-field--highlight">
                <span className="estimate-field__label">Sie sparen</span>
                <span className="estimate-field__value estimate-field__value--money">
                  {formatEur(totals.savedMoneyEUR)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Per-feature tiles */}
        {selectedEstimates.map((e) => (
          <FeatureTile key={e.key} e={e} />
        ))}
      </div>
    </div>
  );
}
