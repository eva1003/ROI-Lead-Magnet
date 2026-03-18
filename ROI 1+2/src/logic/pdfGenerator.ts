/**
 * Native jsPDF one-pager generator — no html2canvas screenshots.
 * Draws text, rectangles, and colors directly on a single A4 page
 * using Planted's brand palette. Keeps file size well under 2 MB.
 *
 * Layout fills the entire A4 page: fixed-height sections (header, footer,
 * estimates table, stakeholder, finance) are computed first, then the
 * remaining vertical space is split between the two flexible rows
 * (ESG Level / Risk and Bereits umgesetzt / Empfehlungen).
 */

import type { SurveyInput, ScorecardOutput } from "../types";
import { TOPIC_LABELS, RECOMMENDATION_LABELS } from "../types";

// ── Brand Colors (RGB) ──────────────────────────────────────────────────────
const C = {
  darkgreen:   [0, 38, 22]   as const,
  darkgreen75: [64, 92, 80]  as const,
  darkgreen50: [128, 146, 138] as const,
  darkgreen25: [191, 201, 197] as const,
  darkgreen10: [229, 233, 232] as const,
  lilac:       [218, 196, 255] as const,
  lilac20:     [248, 243, 255] as const,
  lime:        [152, 225, 162] as const,
  lime10:      [248, 255, 239] as const,
  coral:       [255, 175, 148] as const,
  coral10:     [255, 247, 244] as const,
  red:         [193, 18, 31]  as const,
  redPale:     [255, 234, 236] as const,
  white:       [255, 255, 255] as const,
  grey100:     [245, 245, 245] as const,
  grey500:     [119, 119, 119] as const,
};

type RGB = readonly [number, number, number];

// ── Planted wordmark SVG (white) — embedded from Designvorlagen ─────────────
const LOGO_SVG = `<svg width="262" height="60" viewBox="0 0 262 60" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M58.8201 0.27356H47.4208V59.3617H58.8201V0.27356Z" fill="white"/>
<path d="M36.5688 2.55319C33.6505 1.00304 30.094 0.182373 26.1726 0.182373H0V59.2705H12.0376V37.8419H26.1726C30.094 37.8419 33.5594 37.0213 36.5688 35.3799C39.5781 33.7386 41.858 31.459 43.4995 28.6322C45.141 25.8055 45.9617 22.5228 45.9617 18.9666C45.9617 15.228 45.141 11.9453 43.4995 9.11854C41.858 6.29179 39.5781 4.10334 36.5688 2.55319ZM32.5562 23.3435C31.8267 24.5289 30.8235 25.5319 29.4556 26.1702C28.0877 26.8085 26.4462 27.1733 24.5312 27.1733H12.0376V10.8511H24.5312C27.3582 10.8511 29.638 11.5805 31.2795 13.1307C32.921 14.5897 33.7417 16.5957 33.7417 19.0578C33.6505 20.6991 33.2858 22.0669 32.5562 23.3435Z" fill="white"/>
<path d="M138.25 16.687C135.788 15.4104 133.052 14.7721 129.951 14.7721C126.942 14.7721 124.206 15.4104 121.744 16.7782C120.102 17.69 118.643 18.7842 117.458 20.0608C117.093 20.4256 116.911 20.608 116.819 20.5168C116.728 20.4256 116.637 20.4256 116.637 19.6961V15.4104H105.238V59.3618H116.637V40.0305C116.637 36.839 117.002 34.1034 117.822 31.8238C118.643 29.6353 119.829 27.9028 121.288 26.7174C122.838 25.532 124.662 24.9849 126.851 24.9849C129.222 24.9849 131.137 25.7143 132.505 27.2645C133.964 28.8146 134.693 30.7295 134.693 33.1915V59.4529H146.001V30.8207C146.001 27.6292 145.363 24.8025 143.995 22.4317C142.627 19.8785 140.712 17.9636 138.25 16.687Z" fill="white"/>
<path d="M206.645 17.7812C203.454 15.7751 199.532 14.6809 194.972 14.6809C190.413 14.6809 186.491 15.7751 183.208 17.8724C179.926 19.9697 177.463 22.7964 175.913 26.1703C174.271 29.5441 173.542 33.2827 173.542 37.2949C173.542 41.3071 174.454 45.0457 176.095 48.4195C177.828 51.8846 180.381 54.6201 183.664 56.8086C186.947 58.9058 190.96 60.0001 195.52 60.0001C199.167 60.0001 202.45 59.3618 205.369 58.2675C208.287 57.0821 210.658 55.3496 212.573 53.07C214.488 50.7903 215.674 48.0548 216.129 44.9545L216.221 44.4074H205.004L204.913 44.7721C204.457 46.5046 203.454 47.8724 201.812 48.8754C200.171 49.8785 198.255 50.4256 195.884 50.4256C192.419 50.4256 189.683 49.2402 187.768 46.9605C186.309 45.3192 185.397 43.1308 185.032 40.5776H216.221V40.1216C216.312 38.845 216.403 37.5685 216.403 36.2919C216.403 32.6444 215.582 29.1794 214.032 25.8967C212.299 22.5229 209.837 19.7873 206.645 17.7812ZM194.972 23.7083C196.796 23.7083 198.438 24.073 199.715 24.8025C200.991 25.532 201.994 26.535 202.724 27.8116C203.362 28.997 203.818 30.2736 204.001 31.7326H185.215C185.397 31.0031 185.58 30.3648 185.762 29.9089C186.583 27.9028 187.768 26.3526 189.318 25.3496C190.96 24.1642 192.784 23.7083 194.972 23.7083Z" fill="white"/>
<path d="M99.6749 49.3314C99.3101 48.8754 99.1277 48.0548 99.1277 46.9605V31.8238C99.1277 28.3587 98.307 25.3496 96.7567 22.7964C95.2064 20.2432 92.9266 18.2371 90.0996 16.7782C87.2725 15.4104 83.8984 14.6809 80.0682 14.6809C76.4205 14.6809 73.2287 15.3192 70.4929 16.5046C67.757 17.7812 65.5684 19.5137 63.9269 21.8846C62.2854 24.1642 61.2823 26.9909 60.9175 30.0912L60.8263 30.6384H71.8608V30.1824C72.0432 28.1763 72.8639 26.535 74.323 25.4408C75.7821 24.2554 77.6972 23.7083 80.0682 23.7083C82.3481 23.7083 84.2631 24.2554 85.7222 25.2584C87.0901 26.2615 87.8197 27.5381 87.8197 28.997C87.8197 29.8177 87.5461 30.456 87.0901 30.9119C86.543 31.459 85.8134 31.7326 84.8103 31.915L76.2381 33.1004C71.4048 33.7387 67.5747 35.1976 64.93 37.5685C62.2854 39.9393 60.9175 43.1308 60.9175 46.9605C60.9175 49.4226 61.5559 51.7022 62.9238 53.6171C64.2917 55.6232 66.1156 57.1733 68.4866 58.1763C70.7664 59.2706 73.5023 59.8177 76.4205 59.8177C79.7034 59.8177 82.5305 59.2706 84.9927 58.0852C86.6342 57.2645 88.0021 56.3526 89.0052 55.1672C89.1876 54.9849 89.37 54.8937 89.5524 54.8937C89.7348 54.8937 89.9172 55.076 89.9172 55.2584C90.3731 56.3526 91.1027 57.2645 92.1058 57.994C93.6561 59.0882 95.5712 59.6353 97.9422 59.6353C99.4925 59.6353 101.225 59.4529 102.958 59.0882L103.323 58.997V49.5137L102.775 49.6049C101.225 50.152 100.222 50.0608 99.6749 49.3314ZM88.0021 39.5745V40.304C88.0021 43.4955 87.0901 46.1399 85.2663 48.146C83.4424 50.152 80.9802 51.1551 77.7884 51.1551C76.0557 51.1551 74.5966 50.6992 73.5023 49.8785C72.4079 49.0578 71.952 47.9636 71.952 46.5958C71.952 45.1368 72.4079 43.9514 73.4111 43.0396C74.4142 42.1277 75.8733 41.4894 77.8796 41.2159L88.0021 39.5745Z" fill="white"/>
<path d="M174.91 24.9848V15.3192H172.174H166.794C165.426 15.3192 164.97 15.1368 164.879 14.1337C164.879 13.9514 164.879 13.6778 164.879 13.4043V2.73557V0.911858V0.638306H153.935H153.388V0.911858V13.4043C153.388 15.1368 153.115 15.3192 151.473 15.3192H146.093V24.9848H153.388V45.228C153.388 49.9696 154.847 53.7082 157.674 56.1702C160.501 58.6322 164.331 59.9088 169.073 59.9088C171.08 59.9088 172.904 59.7265 174.454 59.2705L174.819 59.1793V49.1489L174.271 49.3313C173.633 49.5137 172.995 49.6049 172.356 49.6961C171.718 49.7872 170.989 49.8784 170.35 49.8784C168.709 49.8784 167.341 49.3313 166.338 48.3283C165.335 47.3252 164.787 45.8663 164.787 44.0426V24.8936H174.91V24.9848Z" fill="white"/>
<path d="M250.692 0C250.692 4.28571 250.692 11.3982 250.692 15.6839V18.8754C250.692 19.1489 250.418 19.2401 250.236 19.0578C249.324 18.0547 248.047 17.1429 246.497 16.4134C244.217 15.3191 241.664 14.772 238.837 14.772C238.746 14.772 238.746 14.772 238.654 14.772C234.459 14.772 230.721 15.6839 227.62 17.5988C224.519 19.5137 222.057 22.1581 220.324 25.5319C218.683 28.9058 217.771 32.9179 217.771 37.2948C217.771 41.6717 218.592 45.6839 220.233 49.0578C221.875 52.5228 224.337 55.1672 227.529 57.0821C230.721 58.997 234.459 59.9088 238.746 59.9088C241.481 59.9088 244.035 59.3617 246.406 58.2675C247.956 57.538 249.233 56.6261 250.145 55.6231C250.327 55.4407 250.601 55.5319 250.601 55.8055V59.2705H262V0H250.692ZM249.962 44.0426C249.05 45.9575 247.774 47.4164 246.132 48.4195C244.491 49.4225 242.576 49.9696 240.387 49.9696C238.198 49.9696 236.283 49.4225 234.642 48.4195C233 47.4164 231.724 45.8663 230.812 43.9514C229.9 42.0365 229.444 39.7568 229.444 37.2037C229.444 34.6505 229.9 32.462 230.812 30.5471C231.724 28.6322 233 27.1733 234.642 26.1702C236.283 25.1672 238.198 24.6201 240.387 24.6201C242.576 24.6201 244.491 25.1672 246.132 26.1702C247.774 27.1733 249.05 28.6322 249.962 30.5471C250.874 32.462 251.33 34.7416 251.33 37.2037C251.33 39.848 250.874 42.1277 249.962 44.0426Z" fill="white"/>
</svg>`;

// ── Convert SVG to PNG data URL for embedding in PDF ────────────────────────
async function loadLogoDataUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([LOGO_SVG], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = 262 * scale;
      canvas.height = 60 * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, 262, 60);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── A4 dimensions in mm ─────────────────────────────────────────────────────
const PW = 210;
const PH = 297;
const ML = 10;
const CW = PW - 2 * ML;
const GAP = 2.5;
const COL_W = (CW - GAP) / 2;

// ── Standard font sizes — unified across all sections ───────────────────────
const FS = {
  label: 6,        // section labels (uppercase)
  body: 7,         // body text / list items
  bodySmall: 5.5,  // table rows
  kpi: 7.5,        // KPI values
  heading: 15,     // big values (maturity level, risk level)
  desc: 6,         // descriptions
  tiny: 4.5,       // footer disclaimer
} as const;

function formatEur(n: number | null): string {
  if (n === null || n === undefined) return "\u2013";
  return new Intl.NumberFormat("de-DE", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(n);
}

// ── Main export ─────────────────────────────────────────────────────────────

export async function generateScorecardPdf(
  input: SurveyInput,
  output: ScorecardOutput,
): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const logoDataUrl = await loadLogoDataUrl();

  const { sectionA, sectionC, sectionD } = input;
  const {
    maturityLevel, maturityWarning, alreadyImplemented,
    recommendedFeatures, recommendationReasons, recommendationSources,
    riskScore, stakeholderExposure: exp, featureEstimates,
  } = output;

  // ── Drawing helpers ─────────────────────────────────────────────────────
  const fill = (color: RGB, x: number, y: number, w: number, h: number, r = 0) => {
    doc.setFillColor(color[0], color[1], color[2]);
    if (r > 0) {
      doc.roundedRect(x, y, w, h, r, r, "F");
    } else {
      doc.rect(x, y, w, h, "F");
    }
  };

  const border = (x: number, y: number, w: number, h: number, r = 2) => {
    doc.setDrawColor(C.darkgreen10[0], C.darkgreen10[1], C.darkgreen10[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, r, r, "S");
  };

  const txt = (
    str: string, x: number, y: number,
    opts: { size?: number; bold?: boolean; color?: RGB; maxWidth?: number } = {},
  ) => {
    const { size = FS.body, bold = false, color = C.darkgreen, maxWidth } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    if (maxWidth) {
      doc.text(str, x, y, { maxWidth });
    } else {
      doc.text(str, x, y);
    }
  };

  const txtRight = (str: string, xR: number, y: number, opts: { size?: number; bold?: boolean; color?: RGB } = {}) => {
    const { size = FS.body, bold = false, color = C.darkgreen } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(str, xR, y, { align: "right" });
  };

  const sectionLabel = (str: string, x: number, y: number) => {
    txt(str.toUpperCase(), x, y, { size: FS.label, bold: true, color: C.darkgreen50 });
  };

  const textH = (str: string, size: number, maxW: number): number => {
    doc.setFontSize(size);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(str, maxW);
    return lines.length * size * 0.3528 * 1.25;
  };

  // ── Pre-compute content-driven heights ──────────────────────────────────
  const headerH = 18;
  const footerH = 10;
  const postHeaderGap = 3;

  // Estimates table height
  const estimatesWithData = featureEstimates.filter(e => !e.noEstimateAvailable);
  const estRowH = 4.5;
  const estH = estimatesWithData.length > 0
    ? 10 + 5 + estimatesWithData.length * estRowH + 3 + 5 + 3
    : 0;

  // Stakeholder block height
  const showDetailedExposure = sectionC.sustainabilityLinkedBusiness === true && !sectionC.scopeUnknown;
  const stakeholderRowCount = Math.min(exp.checkResults.length, 6);
  let stakeholderH: number;
  if (showDetailedExposure) {
    stakeholderH = 18;
  } else {
    stakeholderH = 15 + (exp.matchesTotalCount > 0 ? 5 : 0) + (stakeholderRowCount > 0 ? 5 + stakeholderRowCount * 3.5 : 0);
  }

  // Finance block height — ensure red note fits inside
  const showFinance = sectionD.esgLinkedLoansOrInvestments === true;
  const hasFinanceNote = sectionD.financeRequirementsMet === false;
  const finH = showFinance ? (hasFinanceNote ? 32 : 18) : 0;

  // Count GAPs
  let gapCount = 2;
  if (estH > 0) gapCount++;
  gapCount++;
  if (showFinance) gapCount++;

  const fixedH = headerH + postHeaderGap + estH + stakeholderH + finH + footerH + gapCount * GAP;
  const flexTotal = PH - fixedH;
  // Split flex space: 22% row1 (ESG/Risk compact), 78% row2 (Umgesetzt/Empfehlungen)
  const row1H = Math.max(22, Math.floor(flexTotal * 0.22));
  const row2H = Math.max(40, flexTotal - row1H);

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER BAR — logo left, company info center
  // ═══════════════════════════════════════════════════════════════════════════
  fill(C.darkgreen, 0, 0, PW, headerH);

  // Planted wordmark logo (white) — top left
  const logoH = 8;
  const logoW = logoH * (262 / 60); // preserve aspect ratio
  const logoY = (headerH - logoH) / 2;
  doc.addImage(logoDataUrl, "PNG", ML + 1, logoY, logoW, logoH);

  // Company info — right of logo
  const companyX = ML + logoW + 8;
  txt(sectionA.companyName || "\u2013", companyX, 8, { size: 9, bold: true, color: C.white });
  const meta = [sectionA.industry, sectionA.companyType, sectionA.employeeRange ? `${sectionA.employeeRange} MA` : ""].filter(Boolean).join("  \u00B7  ");
  txt(meta, companyX, 13, { size: FS.body, color: C.darkgreen25 });

  let y = headerH + postHeaderGap;

  // ═══════════════════════════════════════════════════════════════════════════
  // ROW 1: ESG Level | Stakeholder-Risiko
  // ═══════════════════════════════════════════════════════════════════════════
  const maturityBg: Record<string, RGB> = {
    Fortgeschritten: C.lime10, Mittel: C.lilac20, Einsteiger: C.coral10, "Kein ESG Setup": C.grey100,
  };
  fill(maturityBg[maturityLevel] ?? C.grey100, ML, y, COL_W, row1H, 2);
  sectionLabel("ESG Level", ML + 4, y + 4.5);
  txt(maturityLevel, ML + 4, y + 11, { size: FS.heading, bold: true });
  txt(maturityWarning ?? "", ML + 4, y + 17, { size: FS.desc, color: maturityWarning ? C.red : C.darkgreen75, maxWidth: COL_W - 8 });

  // Stakeholder-Risiko
  const riskX = ML + COL_W + GAP;
  const totalReqMatches = exp.sbtiMatchesCount + exp.cdpMatchesCount + exp.csrdMatchesCount;
  const maxReq = exp.totalStakeholdersProvided * 3;
  const stakeholderRiskLevel: "Niedrig" | "Mittel" | "Hoch" =
    maxReq === 0 ? riskScore.level
    : totalReqMatches / maxReq > 0.15 ? "Hoch"
    : totalReqMatches / maxReq > 0.10 ? "Mittel"
    : "Niedrig";

  const riskBg: Record<string, RGB> = { Niedrig: C.lime10, Mittel: C.coral10, Hoch: C.redPale };
  const riskClr: Record<string, RGB> = { Niedrig: C.darkgreen75, Mittel: C.coral, Hoch: C.red };

  fill(riskBg[stakeholderRiskLevel] ?? C.grey100, riskX, y, COL_W, row1H, 2);
  sectionLabel("Stakeholder-Risiko", riskX + 4, y + 4.5);
  txt(stakeholderRiskLevel, riskX + 4, y + 11, { size: FS.heading, bold: true, color: riskClr[stakeholderRiskLevel] });

  let dY = y + 17;
  for (const d of riskScore.drivers.slice(0, 2)) {
    txt("\u00B7 " + d, riskX + 4, dY, { size: FS.tiny, color: C.darkgreen75, maxWidth: COL_W - 8 });
    dY += textH(d, FS.tiny, COL_W - 8) + 0.3;
  }

  y += row1H + GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // ROW 2: Bereits umgesetzt | Empfehlungen von Planted
  // ═══════════════════════════════════════════════════════════════════════════
  const itemSpacing = 6;

  // — Bereits umgesetzt (same visual style as Empfehlungen) —
  fill(C.white, ML, y, COL_W, row2H, 2);
  border(ML, y, COL_W, row2H);
  sectionLabel("Bereits umgesetzt", ML + 4, y + 6);
  let implY = y + 13;
  if (alreadyImplemented.length > 0) {
    for (const k of alreadyImplemented) {
      if (implY > y + row2H - 4) break;
      txt("\u2022  " + TOPIC_LABELS[k], ML + 5, implY, { size: FS.body, bold: true, color: C.darkgreen });
      implY += itemSpacing;
    }
  } else {
    txt("Noch keine Themen als aktiv markiert.", ML + 5, implY, { size: FS.body, color: C.grey500 });
  }

  // — Empfehlungen von Planted —
  const recX = ML + COL_W + GAP;
  fill(C.white, recX, y, COL_W, row2H, 2);
  border(recX, y, COL_W, row2H);
  sectionLabel("Empfehlungen von Planted", recX + 4, y + 6);

  let recY = y + 13;
  if (recommendedFeatures.length > 0) {
    for (const k of recommendedFeatures) {
      if (recY > y + row2H - 12) break;
      const src = recommendationSources[k] ?? "system";
      const lilacActive = src === "system" || src === "system_and_interest";
      const limeActive = src === "interest" || src === "system_and_interest";

      const dotY = recY - 1;
      const lilacC = lilacActive ? C.lilac : C.darkgreen10;
      doc.setFillColor(lilacC[0], lilacC[1], lilacC[2]);
      doc.circle(recX + 5.5, dotY, 1.3, "F");
      const limeC = limeActive ? C.lime : C.darkgreen10;
      doc.setFillColor(limeC[0], limeC[1], limeC[2]);
      doc.circle(recX + 8, dotY, 1.3, "F");

      txt(RECOMMENDATION_LABELS[k], recX + 11, recY, { size: FS.body, bold: true, color: C.darkgreen });
      const reason = recommendationReasons[k];
      if (reason) {
        txt(reason, recX + 11, recY + 4, { size: 5, color: C.darkgreen50, maxWidth: COL_W - 16 });
        recY += 9;
      } else {
        recY += itemSpacing;
      }
    }

    // Legend at bottom of box
    const legY = y + row2H - 4;
    doc.setFillColor(C.lilac[0], C.lilac[1], C.lilac[2]);
    doc.circle(recX + 5, legY - 0.5, 1, "F");
    txt("Erkannte Anforderungen", recX + 7.5, legY, { size: FS.tiny, color: C.darkgreen50 });
    doc.setFillColor(C.lime[0], C.lime[1], C.lime[2]);
    doc.circle(recX + COL_W / 2, legY - 0.5, 1, "F");
    txt("Ihr angegebenes Interesse", recX + COL_W / 2 + 2.5, legY, { size: FS.tiny, color: C.darkgreen50 });
  } else {
    txt("Keine zusätzlichen Empfehlungen.", recX + 5, recY, { size: FS.body, color: C.grey500 });
  }

  y += row2H + GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // ROW 3: Zeit- und Ersparnisaussicht (full-width table)
  // ═══════════════════════════════════════════════════════════════════════════
  if (estimatesWithData.length > 0) {
    const totals = estimatesWithData.reduce(
      (acc, e) => ({
        baseHours: acc.baseHours + e.baseHours,
        hoursWithPlanted: acc.hoursWithPlanted + e.hoursWithPlanted,
        savedHours: acc.savedHours + e.savedHours,
        savedMoneyEUR: acc.savedMoneyEUR + e.savedMoneyEUR,
      }),
      { baseHours: 0, hoursWithPlanted: 0, savedHours: 0, savedMoneyEUR: 0 },
    );

    fill(C.white, ML, y, CW, estH, 2);
    border(ML, y, CW, estH);
    sectionLabel("Zeit- und Ersparnisaussicht", ML + 4, y + 5);

    const tL = ML + 4;
    const c2 = ML + CW * 0.38;
    const c3 = ML + CW * 0.54;
    const c4 = ML + CW * 0.70;
    const c5 = ML + CW - 4;

    let tY = y + 11;
    txt("ESG-Thema", tL, tY, { size: FS.bodySmall, bold: true, color: C.darkgreen50 });
    txt("Ohne Planted", c2, tY, { size: FS.bodySmall, bold: true, color: C.darkgreen50 });
    txt("Mit Planted", c3, tY, { size: FS.bodySmall, bold: true, color: C.darkgreen50 });
    txt("Zeitersparnis", c4, tY, { size: FS.bodySmall, bold: true, color: C.darkgreen50 });
    txtRight("Sie sparen", c5, tY, { size: FS.bodySmall, bold: true, color: C.darkgreen50 });

    tY += 5;
    doc.setDrawColor(C.darkgreen10[0], C.darkgreen10[1], C.darkgreen10[2]);
    doc.setLineWidth(0.15);
    doc.line(tL, tY - 1.5, ML + CW - 4, tY - 1.5);

    for (const e of estimatesWithData) {
      txt(e.label, tL, tY, { size: FS.bodySmall, color: C.darkgreen });
      txt(`${e.baseHours} Std.`, c2, tY, { size: FS.bodySmall, color: C.darkgreen75 });
      txt(`${e.hoursWithPlanted} Std.`, c3, tY, { size: FS.bodySmall, color: C.darkgreen75 });
      txt(`${e.savedHours} Std.`, c4, tY, { size: FS.bodySmall, color: C.darkgreen75 });
      txtRight(formatEur(e.savedMoneyEUR), c5, tY, { size: FS.bodySmall, color: C.darkgreen });
      tY += estRowH;
    }

    tY += 1.5;
    doc.setDrawColor(C.darkgreen50[0], C.darkgreen50[1], C.darkgreen50[2]);
    doc.setLineWidth(0.3);
    doc.line(tL, tY - 1, ML + CW - 4, tY - 1);

    txt("Gesamt", tL, tY + 1, { size: FS.body, bold: true, color: C.darkgreen });
    txt(`${totals.baseHours} Std.`, c2, tY + 1, { size: FS.body, bold: true, color: C.darkgreen75 });
    txt(`${totals.hoursWithPlanted} Std.`, c3, tY + 1, { size: FS.body, bold: true, color: C.darkgreen75 });
    txt(`${totals.savedHours} Std.`, c4, tY + 1, { size: FS.body, bold: true, color: C.darkgreen75 });
    txtRight(formatEur(totals.savedMoneyEUR), c5, tY + 1, { size: FS.body, bold: true, color: C.darkgreen });

    y += estH + GAP;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROW 4: Stakeholder Risiko (full width)
  // ═══════════════════════════════════════════════════════════════════════════
  fill(C.white, ML, y, CW, stakeholderH, 2);
  border(ML, y, CW, stakeholderH);
  sectionLabel("Stakeholder Risiko", ML + 4, y + 5);

  let sY = y + 11;
  if (showDetailedExposure) {
    txt("Betroffene Beziehungen:", ML + 4, sY, { size: FS.body, color: C.darkgreen50 });
    txt(String(sectionC.linkedBusinessCount ?? "\u2013"), ML + 55, sY, { size: FS.body, bold: true });
    if (sectionC.avgRevenueSharePct !== null) {
      txt("\u00D8 Umsatzanteil:", ML + 70, sY, { size: FS.body, color: C.darkgreen50 });
      txt(`${sectionC.avgRevenueSharePct} %`, ML + 100, sY, { size: FS.body, bold: true });
    }
    txt("Anforderung derzeit erf\u00FCllt:", ML + 120, sY, { size: FS.body, color: C.darkgreen50 });
    const reqVal = sectionC.requirementsMet === true ? "Ja" : sectionC.requirementsMet === false ? "Nein" : "\u2013";
    const reqClr = reqVal === "Nein" ? C.red : reqVal === "Ja" ? C.darkgreen75 : C.darkgreen;
    txt(reqVal, ML + CW - 8, sY, { size: FS.kpi, bold: true, color: reqClr });
  } else {
    txt(`Stakeholder eingegeben: ${exp.totalStakeholdersProvided}`, ML + 4, sY, { size: FS.body, color: C.darkgreen75 });
    txt(`Davon mit ESG-Verpflichtungen: ${exp.matchesTotalCount}`, ML + 60, sY, { size: FS.body, color: C.darkgreen75 });

    if (exp.matchesTotalCount > 0) {
      sY += 4.5;
      let bx = ML + 4;
      const badges: { label: string; count: number; color: RGB }[] = [];
      if (exp.sbtiMatchesCount > 0) badges.push({ label: "SBTi", count: exp.sbtiMatchesCount, color: C.lime });
      if (exp.cdpMatchesCount > 0) badges.push({ label: "CDP", count: exp.cdpMatchesCount, color: C.lilac });
      if (exp.csrdMatchesCount > 0) badges.push({ label: "CSRD", count: exp.csrdMatchesCount, color: C.coral });
      for (const b of badges) {
        const bLabel = `${b.label}: ${b.count}`;
        doc.setFontSize(FS.bodySmall);
        const bw = doc.getTextWidth(bLabel) + 4;
        fill(b.color, bx, sY - 2.5, bw, 4, 1);
        txt(bLabel, bx + 2, sY, { size: FS.bodySmall, bold: true, color: C.darkgreen });
        bx += bw + 2;
      }
      sY += 4;
    } else {
      sY += 4;
    }

    if (exp.checkResults.length > 0) {
      const cols = [ML + 4, ML + CW * 0.45, ML + CW * 0.55, ML + CW * 0.65, ML + CW * 0.78];
      txt("Stakeholder", cols[0], sY, { size: 5, bold: true, color: C.darkgreen50 });
      txt("SBTi", cols[1], sY, { size: 5, bold: true, color: C.darkgreen50 });
      txt("CDP", cols[2], sY, { size: 5, bold: true, color: C.darkgreen50 });
      txt("CSRD", cols[3], sY, { size: 5, bold: true, color: C.darkgreen50 });
      txt("Risiko", cols[4], sY, { size: 5, bold: true, color: C.darkgreen50 });
      sY += 3;

      for (const r of exp.checkResults.slice(0, 6)) {
        const displayName = r.correctedName ?? r.nameOriginal;
        txt(displayName.substring(0, 45), cols[0], sY, { size: 5, color: C.darkgreen75 });
        txt(r.inSBTi ? "\u2713" : "\u2013", cols[1], sY, { size: 5, color: r.inSBTi ? C.darkgreen75 : C.grey500 });
        txt(r.inCDP ? "\u2713" : "\u2013", cols[2], sY, { size: 5, color: r.inCDP ? C.darkgreen75 : C.grey500 });
        txt(r.inCSRD ? "\u2713" : "\u2013", cols[3], sY, { size: 5, color: r.inCSRD ? C.darkgreen75 : C.grey500 });
        const cnt = [r.inSBTi, r.inCDP, r.inCSRD].filter(Boolean).length;
        const riskLabel = cnt === 0 ? "\u2013" : cnt === 1 ? "Niedrig" : cnt === 2 ? "Mittel" : "Hoch";
        const riskC = cnt >= 2 ? C.red : cnt === 1 ? C.coral : C.grey500;
        txt(riskLabel, cols[4], sY, { size: 5, color: riskC });
        sY += 3.5;
      }
    }
  }

  y += stakeholderH + GAP;

  // ═══════════════════════════════════════════════════════════════════════════
  // ROW 5: Zusätzliches finanzielles Risiko (full width)
  // ═══════════════════════════════════════════════════════════════════════════
  if (showFinance) {
    fill(C.white, ML, y, CW, finH, 2);
    border(ML, y, CW, finH);
    sectionLabel("Zusätzliches finanzielles Risiko", ML + 4, y + 5);

    // KPIs spread horizontally
    const fY = y + 13;
    const finEntries: { label: string; value: string; color: RGB }[] = [
      { label: "Betroffenes Volumen", value: formatEur(sectionD.affectedVolumeEur), color: C.darkgreen },
    ];
    if (sectionD.interestDeltaPct !== null) {
      finEntries.push({ label: "Zinspunkte-Risiko", value: `${sectionD.interestDeltaPct}%`, color: C.darkgreen });
    }
    if (sectionD.penaltiesEur !== null) {
      finEntries.push({ label: "Strafzahlungsrisiko", value: formatEur(sectionD.penaltiesEur), color: C.darkgreen });
    }
    const reqMet = sectionD.financeRequirementsMet;
    const reqVal = reqMet === true ? "Ja" : reqMet === false ? "Nein*" : "\u2013";
    const reqColor: RGB = reqMet === true ? C.darkgreen75 : reqMet === false ? C.red : C.darkgreen;
    finEntries.push({ label: "ESG-Anforderungen derzeit erf\u00FCllt", value: reqVal, color: reqColor });

    const colSpan = CW / finEntries.length;
    for (let i = 0; i < finEntries.length; i++) {
      const e = finEntries[i];
      const fX = ML + 4 + i * colSpan;
      txt(e.label, fX, fY, { size: FS.bodySmall, color: C.darkgreen50 });
      txt(e.value, fX, fY + 4.5, { size: 7, bold: true, color: e.color });
    }

    // Red info box footnote — INSIDE the bordered box with proper margins
    if (hasFinanceNote) {
      const noteY = fY + 10;
      const noteW = CW - 8;
      const noteH = 5.5;
      fill(C.redPale, ML + 4, noteY, noteW, noteH, 1.5);
      txt(
        "* Durch die Empfehlungen von Planted k\u00F6nnen die ESG-Anforderungen erf\u00FCllt werden.",
        ML + 7, noteY + 3.5,
        { size: FS.tiny, color: C.red },
      );
    }

    y += finH + GAP;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  const dateStr = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  fill(C.darkgreen10, 0, PH - footerH, PW, footerH);
  txt(
    `Erstellt am ${dateStr}  \u00B7  Planted ESG Assessment Tool`,
    ML + 1, PH - footerH + 4,
    { size: FS.desc, color: C.darkgreen50 },
  );
  txt(
    "Stakeholder-Pr\u00FCfung basiert auf \u00F6ffentlich zug\u00E4nglichen Datenbanken (SBTi, CDP, CSRD). Keine rechtsverbindliche Beratung.",
    ML + 1, PH - footerH + 7.5,
    { size: FS.tiny, color: C.darkgreen50 },
  );

  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}
