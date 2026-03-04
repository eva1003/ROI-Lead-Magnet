#!/usr/bin/env node
/**
 * Parses raw CSV files from Datenbank/ and generates TypeScript database modules.
 * Run: node scripts/generate-databases.mjs
 *
 * Sources:
 *   Datenbank/CDP companies.csv    → src/data/cdpDatabase.ts
 *   Datenbank/CSRD Unternehmen.csv → src/data/csrdDatabase.ts
 *
 * SBTi (src/data/sbtiDatabase.ts) is already up-to-date and is not regenerated.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "Datenbank");
const OUT_DIR = path.join(ROOT, "src", "data");

// ─── CDP companies ────────────────────────────────────────────────────────────
// Format: "Company name;Country / Area;;;"
// Column 0 = company name (first row = header)

const cdpRaw = fs.readFileSync(path.join(DATA_DIR, "CDP companies.csv"), "utf8");
const cdpLines = cdpRaw.replace(/^\uFEFF/, "").split(/\r?\n/);
const cdpCompanies = cdpLines
  .slice(1) // skip header
  .map((line) => line.split(";")[0].trim())
  .filter((name) => name.length > 0);

// ─── CSRD Unternehmen ─────────────────────────────────────────────────────────
// Format: "verified;id;company_name"
// Column 2 = company name (first row = header)

const csrdRaw = fs.readFileSync(path.join(DATA_DIR, "CSRD Unternehmen.csv"), "utf8");
const csrdLines = csrdRaw.replace(/^\uFEFF/, "").split(/\r?\n/);
const csrdCompanies = csrdLines
  .slice(1) // skip header
  .map((line) => {
    const cols = line.split(";");
    return (cols[2] ?? "").trim();
  })
  .filter((name) => name.length > 0);

// ─── Write files ──────────────────────────────────────────────────────────────

function writeTS(filePath, header, arrayName, items) {
  const lines = [
    header,
    `export const ${arrayName}: string[] = [`,
    ...items.map((n) => `  ${JSON.stringify(n)},`),
    `];`,
    "",
  ];
  fs.writeFileSync(filePath, lines.join("\n"));
}

writeTS(
  path.join(OUT_DIR, "cdpDatabase.ts"),
  `// AUTO-GENERATED from Datenbank/CDP companies.csv\n// DO NOT EDIT MANUALLY — run: node scripts/generate-databases.mjs\n`,
  "CDP_COMPANIES",
  cdpCompanies
);
console.log(`✓ cdpDatabase.ts  — ${cdpCompanies.length} companies`);

writeTS(
  path.join(OUT_DIR, "csrdDatabase.ts"),
  `// AUTO-GENERATED from Datenbank/CSRD Unternehmen.csv\n// Companies reporting under CSRD\n// DO NOT EDIT MANUALLY — run: node scripts/generate-databases.mjs\n`,
  "CSRD_COMPANIES",
  csrdCompanies
);
console.log(`✓ csrdDatabase.ts — ${csrdCompanies.length} companies`);
