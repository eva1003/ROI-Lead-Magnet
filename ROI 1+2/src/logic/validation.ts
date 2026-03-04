/**
 * Validation functions – pure, no UI dependencies.
 */

import type { SectionA, SectionB, SectionC, SectionD } from "../types";

export type FieldErrors = Record<string, string>;

export function validateSectionA(data: SectionA): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.companyName || data.companyName.trim().length < 2) {
    errors.companyName = "Unternehmensname muss mindestens 2 Zeichen haben.";
  }
  if (!data.email || !data.email.includes("@") || data.email.trim().length < 5) {
    errors.email = "Bitte gültige E-Mail-Adresse eingeben.";
  }
  if (!data.employeeRange) {
    errors.employeeRange = "Bitte Mitarbeitenden-Anzahl auswählen.";
  }
  if (!data.companyType) {
    errors.companyType = "Bitte Unternehmenstyp auswählen.";
  }
  if (!data.industry) {
    errors.industry = "Bitte Branche auswählen.";
  }
  if (!data.consentGiven) {
    errors.consentGiven =
      "Bitte stimmen Sie der Datenschutzerklärung zu, um fortzufahren.";
  }
  return errors;
}

export function validateSectionB(data: SectionB): FieldErrors {
  const errors: FieldErrors = {};
  if (data.activeInESG === null) {
    errors.activeInESG = "Bitte angeben, ob Sie im ESG-Bereich tätig sind.";
  }
  if (data.useExternalConsulting === null) {
    errors.useExternalConsulting =
      "Bitte angeben, ob Sie externe Beratung nutzen.";
  }
  if (
    data.useExternalConsulting === true &&
    (data.consultingHoursPerYear === null || data.consultingHoursPerYear < 0)
  ) {
    errors.consultingHoursPerYear =
      "Bitte Beratungsstunden eingeben (mind. 0).";
  }
  return errors;
}

export function validateSectionC(data: SectionC): FieldErrors {
  const errors: FieldErrors = {};
  if (data.sustainabilityLinkedBusiness === null) {
    errors.sustainabilityLinkedBusiness =
      "Bitte angeben, ob ESG-gekoppelte Geschäftsbeziehungen bestehen.";
  }
  if (data.sustainabilityLinkedBusiness === true) {
    if (data.linkedBusinessCount !== null && data.linkedBusinessCount < 1) {
      errors.linkedBusinessCount =
        "Anzahl der Geschäftsbeziehungen muss mind. 1 sein.";
    }
    if (
      data.avgRevenueSharePct !== null &&
      (data.avgRevenueSharePct < 0 || data.avgRevenueSharePct > 100)
    ) {
      errors.avgRevenueSharePct =
        "Prozentwert muss zwischen 0 und 100 liegen.";
    }
    if (!data.scopeUnknown && data.requirementsMet === null) {
      errors.requirementsMet =
        "Bitte angeben, ob Anforderungen erfüllbar sind.";
    }
  }
  // Block if any stakeholder is in needsConfirmation state
  const hasUnresolved = data.stakeholders.some(
    (s) => s.matchState === "needsConfirmation"
  );
  if (hasUnresolved) {
    errors.stakeholders =
      "Bitte lösen Sie alle unsicheren Stakeholder-Zuordnungen auf.";
  }
  return errors;
}

export function validateSectionD(data: SectionD): FieldErrors {
  const errors: FieldErrors = {};
  if (data.esgLinkedLoansOrInvestments === null) {
    errors.esgLinkedLoansOrInvestments =
      "Bitte angeben, ob ESG-gebundene Finanzierungen bestehen.";
  }
  if (data.esgLinkedLoansOrInvestments === true) {
    if (data.affectedVolumeEur === null || data.affectedVolumeEur < 0) {
      errors.affectedVolumeEur = "Bitte Volumen eingeben (mind. 0 EUR).";
    }
    if (data.financeRequirementsMet === null) {
      errors.financeRequirementsMet =
        "Bitte angeben, ob Finanzierungs-Anforderungen erfüllbar sind.";
    }
  }
  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
