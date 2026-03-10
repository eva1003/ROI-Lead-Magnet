import type { SectionA, EmployeeRange, CompanyType, Industry, RevenueCurrency } from "../../types";
import { INDUSTRIES, ENABLE_REVENUE } from "../../types";
import { Tooltip } from "../Tooltip";

interface Props {
  data: SectionA;
  onChange: (data: SectionA) => void;
  errors: Partial<Record<keyof SectionA, string>>;
}

const EMPLOYEE_RANGES: EmployeeRange[] = [
  "1-99", "100-249", "250-500", "501-1.000",
  "1.000-5.000", "5.000-10.000", ">10.000",
];
const COMPANY_TYPES: CompanyType[] = ["Produktion", "Dienstleistung", "Handel"];
const CURRENCIES: { value: RevenueCurrency; label: string }[] = [
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
];

export function SectionAForm({ data, onChange, errors }: Props) {
  const set = <K extends keyof SectionA>(key: K, value: SectionA[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="section">
      <h2 className="section-title">Allgemeine Angaben</h2>

      <div className="field">
        <label>
          Unternehmensname <span className="required">*</span>
          <Tooltip text="Der Name Ihres Unternehmens wird für den personalisierten Scorecard-Report verwendet." />
        </label>
        <input
          type="text"
          value={data.companyName}
          onChange={(e) => set("companyName", e.target.value)}
          placeholder="z. B. Muster GmbH"
          className={errors.companyName ? "error" : ""}
        />
        {errors.companyName && <span className="error-msg">{errors.companyName}</span>}
      </div>

      <div className="field">
        <label>
          E-Mail-Adresse <span className="required">*</span>
          <Tooltip text="Wir senden Ihnen auf Wunsch den vollständigen ROI-Report zu. Ihre Daten werden nicht weitergegeben." />
        </label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="vorname.nachname@unternehmen.de"
          className={errors.email ? "error" : ""}
        />
        {errors.email && <span className="error-msg">{errors.email}</span>}
      </div>

      <div className="field">
        <label>
          Mitarbeitenden-Anzahl <span className="required">*</span>
          <Tooltip text="Die Unternehmensgröße beeinflusst den geschätzten Aufwand für ESG-Maßnahmen (z. B. Stunden für CSRD-Berichterstattung)." />
        </label>
        <select
          value={data.employeeRange}
          onChange={(e) => set("employeeRange", e.target.value as EmployeeRange)}
          className={errors.employeeRange ? "error" : ""}
        >
          <option value="">Bitte wählen …</option>
          {EMPLOYEE_RANGES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {errors.employeeRange && (
          <span className="error-msg">{errors.employeeRange}</span>
        )}
      </div>

      <div className="field">
        <label>
          Unternehmenstyp <span className="required">*</span>
          <Tooltip text="Produktion, Dienstleistung oder Handel – der Typ bestimmt, welche ESG-Themen besonders relevant sind und wie viel Aufwand diese erzeugen." />
        </label>
        <select
          value={data.companyType}
          onChange={(e) => set("companyType", e.target.value as CompanyType)}
          className={errors.companyType ? "error" : ""}
        >
          <option value="">Bitte wählen …</option>
          {COMPANY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {errors.companyType && (
          <span className="error-msg">{errors.companyType}</span>
        )}
      </div>

      <div className="field">
        <label>
          Branche <span className="required">*</span>
          <Tooltip text="Ihre Branche bestimmt regulatorische Anforderungen (z. B. CSRD-Betroffenheit) und branchenspezifische Empfehlungen." />
        </label>
        <select
          value={data.industry}
          onChange={(e) => set("industry", e.target.value as Industry)}
          className={errors.industry ? "error" : ""}
        >
          <option value="">Bitte wählen …</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
        {errors.industry && <span className="error-msg">{errors.industry}</span>}
      </div>

      {ENABLE_REVENUE && (
        <div className="field">
          <label>
            Jahresumsatz <span className="optional">(optional)</span>
            <Tooltip text="Der Umsatz hilft, die finanzielle Relevanz von ESG-Risiken und mögliche CSRD-Pflicht besser einzuschätzen." />
          </label>
          <div className="input-prefix-row">
            <select
              value={data.revenueCurrency}
              onChange={(e) =>
                set("revenueCurrency", e.target.value as RevenueCurrency)
              }
            >
              <option value="">–</option>
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              step={1000000}
              value={data.revenue}
              onChange={(e) => set("revenue", e.target.value)}
              placeholder="z. B. 10000000"
            />
          </div>
          <span className="hint">
            Nur Zahlen. Wird gespeichert, fließt nicht in Berechnungen ein.
          </span>
        </div>
      )}

      <div className="field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.consentGiven}
            onChange={(e) => set("consentGiven", e.target.checked)}
          />
          Ich stimme der{" "}
          <a
            href="https://www.planted.green/datenschutz"
            target="_blank"
            rel="noopener noreferrer"
          >
            Datenschutzerklärung
          </a>{" "}
          von Planted zu. <span className="required">*</span>
        </label>
        {errors.consentGiven && (
          <span className="error-msg">{errors.consentGiven}</span>
        )}
      </div>
    </div>
  );
}
