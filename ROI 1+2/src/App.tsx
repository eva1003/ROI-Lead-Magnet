import { useState, useEffect, useCallback, useRef } from "react";
import plantedLogo from "./assets/planted-logo-lilac.svg";
import type {
  AppState,
  SurveyInput,
  SectionA,
  SectionB,
  SectionC,
  SectionD,
} from "./types";
import { ALL_TOPICS } from "./types";
import { SectionAForm } from "./components/survey/SectionA";
import { SectionBForm } from "./components/survey/SectionB";
import { SectionCForm } from "./components/survey/SectionC";
import { SectionDForm } from "./components/survey/SectionD";
import { Scorecard } from "./components/scorecard/Scorecard";
import { computeScorecard, entriesToCheckResults } from "./logic/scoring";
import {
  validateSectionA,
  validateSectionB,
  validateSectionC,
  validateSectionD,
  hasErrors,
} from "./logic/validation";
import { loadState, saveState, clearState } from "./logic/storage";
import {
  startAssessment,
  patchAssessment,
  submitAssessment,
} from "./logic/apiClient";
import { saveLead, submitLead, clearLeadSession } from "./logic/supabaseSync";
import type { FieldErrors } from "./logic/validation";

// ─── Default State ────────────────────────────────────────────────────────────

const defaultTopics = Object.fromEntries(
  ALL_TOPICS.map((k) => [k, ""])
) as Record<(typeof ALL_TOPICS)[number], "">;

const defaultInput: SurveyInput = {
  sectionA: {
    companyName: "",
    email: "",
    employeeRange: "",
    companyType: "",
    industry: "",
    revenue: "",
    revenueCurrency: "",
    consentGiven: false,
  },
  sectionB: {
    activeInESG: null,
    topics: defaultTopics,
    useExternalConsulting: null,
    consultingHoursPerYear: null,
  },
  sectionC: {
    sustainabilityLinkedBusiness: null,
    linkedBusinessCount: null,
    scopeUnknown: false,
    avgRevenueSharePct: null,
    requirementsMet: null,
    stakeholders: [],
  },
  sectionD: {
    esgLinkedLoansOrInvestments: null,
    affectedVolumeEur: null,
    interestDeltaPct: null,
    penaltiesEur: null,
    financeRequirementsMet: null,
  },
};

const defaultAppState: AppState = {
  surveyInput: defaultInput,
  scorecardOutput: null,
  currentStep: 0,
  completedAt: null,
  assessmentId: null,
  writeToken: null,
};

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: "Allgemeine Angaben" },
  { id: 1, label: "ESG-Einführungen" },
  { id: 2, label: "Lieferant*innen-Check" },
  { id: 3, label: "Finance-Check" },
  { id: 4, label: "Ergebnis-Scorecard" },
];

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    return loadState() ?? defaultAppState;
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  // Tracks whether input changed after last scorecard computation
  const [dirtyAfterScorecard, setDirtyAfterScorecard] = useState(false);

  const scorecardComputed = state.completedAt !== null;

  // ─── Autosave: debounced PATCH to backend ────────────────────────────────
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAutosave = useCallback(
    (nextState: AppState) => {
      const { assessmentId, writeToken } = nextState;
      if (!assessmentId || !writeToken) return;
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        void patchAssessment(
          assessmentId,
          writeToken,
          nextState,
          nextState.currentStep * 25
        );
      }, 800);
    },
    []
  );

  // Ensure assessmentId is initialised on first real input
  const ensureAssessmentStarted = useCallback(
    async (nextState: AppState): Promise<AppState> => {
      if (nextState.assessmentId) return nextState;
      const result = await startAssessment();
      if (!result) return nextState; // backend offline – ignore
      return {
        ...nextState,
        assessmentId: result.assessmentId,
        writeToken: result.writeToken,
      };
    },
    []
  );

  // Persist on every change + Supabase autosave
  useEffect(() => {
    saveState(state);
    triggerAutosave(state);
    saveLead(state.surveyInput, state.currentStep);
  }, [state, triggerAutosave]);

  const updateInput = useCallback(
    (partial: Partial<SurveyInput>) => {
      setState((s) => {
        if (s.completedAt !== null) setDirtyAfterScorecard(true);
        const next = { ...s, surveyInput: { ...s.surveyInput, ...partial } };
        // Lazily start assessment on first real input
        if (!next.assessmentId) {
          void ensureAssessmentStarted(next).then((started) => {
            if (started.assessmentId !== next.assessmentId) {
              setState((cur) => ({
                ...cur,
                assessmentId: started.assessmentId,
                writeToken: started.writeToken,
              }));
            }
          });
        }
        return next;
      });
    },
    [ensureAssessmentStarted]
  );

  const setStep = (step: number) =>
    setState((s) => ({ ...s, currentStep: step }));

  const validateStep = (step: number): FieldErrors => {
    const input = state.surveyInput;
    switch (step) {
      case 0:
        return validateSectionA(input.sectionA);
      case 1:
        return validateSectionB(input.sectionB);
      case 2:
        return validateSectionC(input.sectionC);
      case 3:
        return validateSectionD(input.sectionD);
      default:
        return {};
    }
  };

  const computeAndShowScorecard = (targetStep: number) => {
    const checkResults = entriesToCheckResults(
      state.surveyInput.sectionC.stakeholders
    );
    const output = computeScorecard(state.surveyInput, checkResults);
    const completedAt = new Date().toISOString();
    setState((s) => {
      const next = {
        ...s,
        scorecardOutput: output,
        currentStep: targetStep,
        completedAt,
      };
      // Submit to backend (fire-and-forget)
      if (next.assessmentId && next.writeToken) {
        void submitAssessment(
          next.assessmentId,
          next.writeToken,
          output,
          next
        );
      }
      // Submit to Supabase (fire-and-forget)
      void submitLead(next.surveyInput, output);
      return next;
    });
    setDirtyAfterScorecard(false);
  };

  const handleNext = () => {
    const errs = validateStep(state.currentStep);
    setErrors(errs);
    if (hasErrors(errs)) return;

    const nextStep = state.currentStep + 1;
    if (nextStep === 4) {
      computeAndShowScorecard(nextStep);
    } else {
      setStep(nextStep);
    }
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setErrors({});
    setStep(Math.max(0, state.currentStep - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRestart = () => {
    clearState();
    clearLeadSession();
    setErrors({});
    setState(defaultAppState);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStepClick = (step: number) => {
    if (step === state.currentStep) return;
    // After scorecard computed: allow free navigation to any step
    if (scorecardComputed || step < state.currentStep) {
      setErrors({});
      if (step === 4 && dirtyAfterScorecard) {
        computeAndShowScorecard(step);
      } else {
        setStep(step);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const { surveyInput, currentStep, scorecardOutput } = state;

  return (
    <div className="app">
      {/* Progress bar */}
      <nav className="progress-nav" aria-label="Fortschritt">
        <img src={plantedLogo} alt="planted." className="nav-logo" />
        {STEPS.map((s) => (
          <button
            key={s.id}
            className={[
              "progress-step",
              currentStep === s.id ? "active" : "",
              currentStep > s.id ? "done" : "",
              s.id < currentStep || scorecardComputed ? "clickable" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => handleStepClick(s.id)}
            disabled={s.id > currentStep && !scorecardComputed}
            type="button"
          >
            <span className="step-number">{s.id + 1}</span>
            <span className="step-label">{s.label}</span>
          </button>
        ))}
      </nav>

      <main className="main-content">
        {currentStep === 0 && (
          <SectionAForm
            data={surveyInput.sectionA}
            onChange={(sectionA: SectionA) => updateInput({ sectionA })}
            errors={errors}
          />
        )}
        {currentStep === 1 && (
          <SectionBForm
            data={surveyInput.sectionB}
            onChange={(sectionB: SectionB) => updateInput({ sectionB })}
            errors={errors}
          />
        )}
        {currentStep === 2 && (
          <SectionCForm
            data={surveyInput.sectionC}
            onChange={(sectionC: SectionC) => updateInput({ sectionC })}
            errors={errors}
          />
        )}
        {currentStep === 3 && (
          <SectionDForm
            data={surveyInput.sectionD}
            onChange={(sectionD: SectionD) => updateInput({ sectionD })}
            errors={errors}
          />
        )}
        {currentStep === 4 && scorecardOutput && (
          <Scorecard
            input={surveyInput}
            output={scorecardOutput}
            onRestart={handleRestart}
          />
        )}

        {/* Navigation buttons */}
        {currentStep < 4 && (
          <div className="nav-buttons">
            {currentStep > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleBack}
              >
                ← Zurück
              </button>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={handleNext}
            >
              {currentStep === 3 ? "Scorecard anzeigen →" : "Weiter →"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
