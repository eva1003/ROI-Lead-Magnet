-- Planted ESG Assessment — Supabase Lead Table
-- Dieses SQL im Supabase Dashboard ausführen:
-- Dashboard → SQL Editor → Neuer Query → Ausführen

CREATE TABLE IF NOT EXISTS leads (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT        NOT NULL DEFAULT 'draft',  -- 'draft' | 'submitted'
  session_key     UUID        NOT NULL,    -- in localStorage, schützt Update
  current_step    INTEGER     NOT NULL DEFAULT 0,

  -- Kontaktdaten (extrahiert für CRM-Ansicht)
  company_name    TEXT,
  email           TEXT,
  employee_range  TEXT,
  company_type    TEXT,
  industry        TEXT,
  consent_given   BOOLEAN     NOT NULL DEFAULT FALSE,

  -- Vollständige Assessment-Daten
  payload_json    JSONB,
  outputs_json    JSONB
);

-- Trigger: updated_at automatisch aktualisieren
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index für häufige Abfragen im Admin-Dashboard
CREATE INDEX IF NOT EXISTS idx_leads_status     ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created    ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email      ON leads(email);

-- Row Level Security aktivieren
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Anon darf neue Leads anlegen
CREATE POLICY "anon_insert" ON leads
  FOR INSERT TO anon
  WITH CHECK (true);

-- Anon darf eigene Zeile updaten (App filtert per id + session_key)
CREATE POLICY "anon_update_own" ON leads
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Kein SELECT / DELETE für anon
-- Admin liest direkt via Supabase Dashboard oder Service Role Key
