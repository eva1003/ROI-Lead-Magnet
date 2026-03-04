import type { SectionB, TopicKey, TopicStatus } from "../../types";
import { ALL_TOPICS, TOPIC_LABELS, TOPIC_TOOLTIPS } from "../../types";
import { Tooltip } from "../Tooltip";

interface Props {
  data: SectionB;
  onChange: (data: SectionB) => void;
  errors: Partial<Record<string, string>>;
}

// Reihenfolge: Machen wir schon | Wollen wir machen | Nicht sicher | Nicht wichtig
const STATUS_OPTIONS: { value: TopicStatus; label: string }[] = [
  { value: "machen_wir_schon", label: "Machen wir schon" },
  { value: "wollen_wir_machen", label: "Wollen wir machen" },
  { value: "nicht_sicher", label: "Nicht sicher" },
  { value: "nicht_wichtig", label: "Nicht wichtig" },
];

export function SectionBForm({ data, onChange, errors }: Props) {
  const setTopic = (key: TopicKey, status: TopicStatus) =>
    onChange({
      ...data,
      topics: { ...data.topics, [key]: status },
    });

  const setActiveInESG = (active: boolean) => {
    if (!active) {
      // Wenn "Nein": "Machen wir schon"-Werte zurücksetzen
      const updatedTopics = { ...data.topics };
      for (const key of ALL_TOPICS) {
        if (updatedTopics[key] === "machen_wir_schon") {
          updatedTopics[key] = "";
        }
      }
      onChange({ ...data, activeInESG: false, topics: updatedTopics });
    } else {
      onChange({ ...data, activeInESG: true });
    }
  };

  const setUseExternalConsulting = (use: boolean) => {
    onChange({
      ...data,
      useExternalConsulting: use,
      consultingHoursPerYear: use ? data.consultingHoursPerYear : null,
    });
  };

  const showTopics = data.activeInESG === true || data.activeInESG === false;
  const isNein = data.activeInESG === false;

  return (
    <div className="section">
      <h2 className="section-title">ESG-Einführungen</h2>

      <div className="field">
        <label>
          Sind Sie bereits im ESG-Bereich tätig?{" "}
          <span className="required">*</span>
          <Tooltip text="Gibt an, ob Ihr Unternehmen aktuell ESG-Themen aktiv bearbeitet – z. B. einen CO₂-Fußabdruck ermittelt, einen Nachhaltigkeitsbericht erstellt oder auf Stakeholder-Fragebögen antwortet." />
        </label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="activeInESG"
              checked={data.activeInESG === true}
              onChange={() => setActiveInESG(true)}
            />
            Ja
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="activeInESG"
              checked={data.activeInESG === false}
              onChange={() => setActiveInESG(false)}
            />
            Nein
          </label>
        </div>
        {errors.activeInESG && (
          <span className="error-msg">{errors.activeInESG}</span>
        )}
      </div>

      <div className="field">
        <label>
          Nutzen Sie zusätzlich eine externe ESG-Beratung?{" "}
          <span className="required">*</span>
          <Tooltip text="Gibt an, ob Ihr Unternehmen externe Berater*innen für ESG-Themen engagiert (z. B. Nachhaltigkeitsberatungen, Wirtschaftsprüfer, Agenturen). Die Stunden fließen in die ROI-Berechnung ein." />
        </label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="useExternalConsulting"
              checked={data.useExternalConsulting === true}
              onChange={() => setUseExternalConsulting(true)}
            />
            Ja
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="useExternalConsulting"
              checked={data.useExternalConsulting === false}
              onChange={() => setUseExternalConsulting(false)}
            />
            Nein
          </label>
        </div>
        {errors.useExternalConsulting && (
          <span className="error-msg">{errors.useExternalConsulting}</span>
        )}
      </div>

      {data.useExternalConsulting === true && (
        <div className="field">
          <label htmlFor="consultingHoursPerYear">
            Wie viele Beratungsstunden pro Jahr nutzen Sie bereits?{" "}
            <span className="required">*</span>
          </label>
          <input
            id="consultingHoursPerYear"
            type="number"
            min={0}
            step={1}
            className="input-number"
            value={data.consultingHoursPerYear ?? ""}
            onChange={(e) =>
              onChange({
                ...data,
                consultingHoursPerYear:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            placeholder="z. B. 40"
          />
          {errors.consultingHoursPerYear && (
            <span className="error-msg">{errors.consultingHoursPerYear}</span>
          )}
        </div>
      )}

      {showTopics && (
        <div className="field">
          <label>
            ESG-Themen und Status{" "}
            {isNein && (
              <span className="hint-inline">
                (als Planungsgrundlage ausfüllen)
              </span>
            )}
          </label>
          {isNein && (
            <p className="hint" style={{ marginBottom: ".75rem" }}>
              Da Sie noch nicht im ESG-Bereich tätig sind, steht „Machen wir schon" nicht zur Verfügung.
            </p>
          )}
          <div className="topic-matrix">
            <div className="topic-matrix-header">
              <span className="topic-name-col">Thema</span>
              {STATUS_OPTIONS.map((s) => (
                <span key={s.value} className="topic-status-col">
                  {s.label}
                </span>
              ))}
            </div>
            {ALL_TOPICS.map((key) => (
              <div key={key} className="topic-row">
                <span className="topic-name-col">
                  {TOPIC_LABELS[key]}
                  <Tooltip text={TOPIC_TOOLTIPS[key]} />
                </span>
                {STATUS_OPTIONS.map((s) => {
                  const isDisabled = isNein && s.value === "machen_wir_schon";
                  return (
                    <label
                      key={s.value}
                      className={`topic-status-col radio-center${isDisabled ? " disabled" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`topic-${key}`}
                        checked={data.topics[key] === s.value}
                        onChange={() => !isDisabled && setTopic(key, s.value)}
                        disabled={isDisabled}
                      />
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="topic-matrix-hint">
            Nicht ausgefüllte Zeilen werden als „Nicht wichtig" gewertet.
          </p>
          {errors.topics && <span className="error-msg">{errors.topics}</span>}
        </div>
      )}
    </div>
  );
}
