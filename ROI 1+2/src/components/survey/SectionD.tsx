import type { SectionD } from "../../types";
import { Tooltip } from "../Tooltip";

interface Props {
  data: SectionD;
  onChange: (data: SectionD) => void;
  errors: Partial<Record<string, string>>;
}

export function SectionDForm({ data, onChange, errors }: Props) {
  const set = <K extends keyof SectionD>(key: K, value: SectionD[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="section">
      <h2 className="section-title">Finance-Check</h2>

      <div className="field">
        <label>
          Haben Sie Kredite oder Investitionen, die an ESG-Anforderungen
          geknüpft sind? <span className="required">*</span>
          <Tooltip text="ESG-gebundene Finanzierungen (auch: Sustainability-Linked Loans oder Green Bonds) enthalten Klauseln, die Ihren Zinssatz an die Erfüllung von Nachhaltigkeitszielen koppeln. Bei Nichteinhaltung drohen Zinsaufschläge oder Strafzahlungen." />
        </label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="esgLinkedLoansOrInvestments"
              checked={data.esgLinkedLoansOrInvestments === true}
              onChange={() => set("esgLinkedLoansOrInvestments", true)}
            />
            Ja
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="esgLinkedLoansOrInvestments"
              checked={data.esgLinkedLoansOrInvestments === false}
              onChange={() =>
                onChange({
                  ...data,
                  esgLinkedLoansOrInvestments: false,
                  affectedVolumeEur: null,
                  interestDeltaPct: null,
                  penaltiesEur: null,
                  financeRequirementsMet: null,
                })
              }
            />
            Nein
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="esgLinkedLoansOrInvestments"
              checked={data.esgLinkedLoansOrInvestments === "nicht_sicher"}
              onChange={() =>
                onChange({
                  ...data,
                  esgLinkedLoansOrInvestments: "nicht_sicher",
                  affectedVolumeEur: null,
                  interestDeltaPct: null,
                  penaltiesEur: null,
                  financeRequirementsMet: null,
                })
              }
            />
            Nicht sicher
          </label>
        </div>
        {errors.esgLinkedLoansOrInvestments && (
          <span className="error-msg">{errors.esgLinkedLoansOrInvestments}</span>
        )}
      </div>

      {data.esgLinkedLoansOrInvestments === true && (
        <div className="nested-section">
          <div className="field">
            <label>
              Wie viel Volumen (EUR) ist betroffen?{" "}
              <span className="required">*</span>
            </label>
            <div className="input-suffix">
              <input
                type="number"
                min={0}
                value={data.affectedVolumeEur ?? ""}
                onChange={(e) =>
                  set(
                    "affectedVolumeEur",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                className={errors.affectedVolumeEur ? "error" : ""}
                placeholder="0"
              />
              <span>EUR</span>
            </div>
            {errors.affectedVolumeEur && (
              <span className="error-msg">{errors.affectedVolumeEur}</span>
            )}
          </div>

          <div className="field">
            <label>
              Mögliche Zinspunkte-Entwicklung{" "}
              <span className="optional">(optional)</span>
            </label>
            <div className="input-suffix">
              <input
                type="number"
                min={0}
                step={0.01}
                value={data.interestDeltaPct ?? ""}
                onChange={(e) =>
                  set(
                    "interestDeltaPct",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                placeholder="z. B. 0.5"
              />
              <span>%</span>
            </div>
          </div>

          <div className="field">
            <label>
              Mögliche Strafzahlungen bei Nichteinhaltung{" "}
              <span className="optional">(optional)</span>
            </label>
            <div className="input-suffix">
              <input
                type="number"
                min={0}
                value={data.penaltiesEur ?? ""}
                onChange={(e) =>
                  set(
                    "penaltiesEur",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                placeholder="0"
              />
              <span>EUR</span>
            </div>
          </div>

          <div className="field">
            <label>
              Können Sie die ESG-Anforderungen aktuell erfüllen?{" "}
              <span className="required">*</span>
            </label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="financeRequirementsMet"
                  checked={data.financeRequirementsMet === true}
                  onChange={() => set("financeRequirementsMet", true)}
                />
                Ja
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="financeRequirementsMet"
                  checked={data.financeRequirementsMet === false}
                  onChange={() => set("financeRequirementsMet", false)}
                />
                Nein
              </label>
            </div>
            {errors.financeRequirementsMet && (
              <span className="error-msg">{errors.financeRequirementsMet}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
