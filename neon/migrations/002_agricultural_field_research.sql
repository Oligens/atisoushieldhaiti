-- AtisouShield Haïti — collecte et validation scientifique sur le terrain
-- À exécuter après 001_atisoushield_complete.sql sur la branche Neon de test,
-- puis à appliquer en production après validation.
BEGIN;

ALTER TABLE public.agricultural_cases
  ADD COLUMN IF NOT EXISTS ai_symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_explanation TEXT,
  ADD COLUMN IF NOT EXISTS ai_affected_area TEXT,
  ADD COLUMN IF NOT EXISTS ai_treatments JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_prevention JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ai_plant_scan';

CREATE TABLE IF NOT EXISTS public.agricultural_field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.agricultural_cases(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  investigator_name TEXT NOT NULL,
  investigator_role TEXT NOT NULL,
  institution TEXT,
  credential_reference TEXT,
  field_visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  department TEXT,
  commune TEXT,
  locality TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  crop TEXT NOT NULL,
  crop_stage TEXT,
  symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
  field_diagnosis TEXT NOT NULL,
  diagnosis_method TEXT NOT NULL,
  diagnostic_status TEXT NOT NULL DEFAULT 'uncertain'
    CHECK (diagnostic_status IN ('confirmed','rejected','uncertain')),
  laboratory_reference TEXT,
  treatment_applied TEXT,
  treatment_product TEXT,
  treatment_active_ingredient TEXT,
  treatment_start_date DATE,
  treatment_end_date DATE,
  treatment_notes TEXT,
  field_outcome TEXT,
  follow_up_date DATE,
  yield_impact TEXT,
  evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','verified','rejected')),
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_reports_case ON public.agricultural_field_reports(case_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_user ON public.agricultural_field_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_date ON public.agricultural_field_reports(field_visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_field_reports_crop ON public.agricultural_field_reports(crop);
CREATE INDEX IF NOT EXISTS idx_field_reports_diagnosis ON public.agricultural_field_reports(field_diagnosis);
CREATE INDEX IF NOT EXISTS idx_field_reports_status ON public.agricultural_field_reports(verification_status, diagnostic_status);
CREATE INDEX IF NOT EXISTS idx_field_reports_geo ON public.agricultural_field_reports(latitude, longitude);

CREATE TABLE IF NOT EXISTS public.agricultural_field_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.agricultural_field_reports(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  follow_up_date DATE NOT NULL DEFAULT CURRENT_DATE,
  symptoms_evolution TEXT,
  disease_progression TEXT,
  treatment_continued TEXT,
  treatment_changed TEXT,
  observed_result TEXT NOT NULL,
  yield_or_loss_observation TEXT,
  evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_followups_report ON public.agricultural_field_followups(report_id, follow_up_date DESC);
CREATE INDEX IF NOT EXISTS idx_field_followups_user ON public.agricultural_field_followups(user_id);

DROP TRIGGER IF EXISTS trg_field_reports_updated_at ON public.agricultural_field_reports;
CREATE TRIGGER trg_field_reports_updated_at
BEFORE UPDATE ON public.agricultural_field_reports
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

COMMIT;
