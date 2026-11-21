-- Atisou Shield Haiti: collecte unifiée de la recherche agricole
-- À exécuter sur la branche Neon utilisée par le déploiement Preview avant les tests.

CREATE TABLE IF NOT EXISTS public.agricultural_research_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  source text NOT NULL CHECK (source IN ('ai_assistant', 'location_analysis', 'plant_scan')),
  event_type text NOT NULL,
  prompt text,
  ai_response text,
  crop text,
  location text,
  latitude double precision,
  longitude double precision,
  weather jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agricultural_research_events_user_created_idx
  ON public.agricultural_research_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agricultural_research_events_source_idx
  ON public.agricultural_research_events (source, created_at DESC);

CREATE TABLE IF NOT EXISTS public.agricultural_field_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  linked_case_id uuid REFERENCES public.agricultural_cases(id) ON DELETE SET NULL,
  crop text NOT NULL,
  symptoms text[] NOT NULL DEFAULT '{}',
  field_diagnosis text,
  assessment text NOT NULL CHECK (assessment IN ('confirmed', 'rejected', 'uncertain', 'observation_only')),
  observer_name text NOT NULL,
  observer_role text NOT NULL,
  observer_organization text,
  visit_date timestamptz NOT NULL,
  location text NOT NULL,
  latitude double precision,
  longitude double precision,
  treatment_applied text,
  treatment_date timestamptz,
  follow_up_date timestamptz,
  follow_up_result text,
  expert_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agricultural_field_surveys_user_created_idx
  ON public.agricultural_field_surveys (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agricultural_field_surveys_case_idx
  ON public.agricultural_field_surveys (linked_case_id);
CREATE INDEX IF NOT EXISTS agricultural_field_surveys_location_idx
  ON public.agricultural_field_surveys (location);
