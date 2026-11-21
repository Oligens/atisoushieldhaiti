-- AtisouShield: workflow de recherche IA et validation professionnelle sur le terrain.
-- À exécuter sur Neon avant de déployer les nouvelles routes API.

CREATE TABLE IF NOT EXISTS public.research_ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  question text NOT NULL,
  answer text NOT NULL,
  crop text,
  location text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.field_research_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.agricultural_cases(id) ON DELETE CASCADE,
  user_id text,
  professional_name text NOT NULL,
  professional_qualification text NOT NULL,
  institution text,
  registration_number text,
  visited_at date NOT NULL DEFAULT CURRENT_DATE,
  crop text,
  crop_variety text,
  growth_stage text,
  symptoms text NOT NULL,
  observed_plant_parts text[] NOT NULL DEFAULT '{}',
  severity text NOT NULL CHECK (severity IN ('low','moderate','high','critical')),
  reference_diagnosis text NOT NULL,
  validation_status text NOT NULL CHECK (validation_status IN ('confirmed','rejected','uncertain')),
  treatment_applied text,
  treatment_start_date date,
  followup_date date,
  followup_outcome text,
  field_notes text,
  latitude double precision,
  longitude double precision,
  professional_verified boolean NOT NULL DEFAULT false,
  verified_by text,
  verified_at timestamptz,
  verification_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT field_research_verification_consistency
    CHECK ((professional_verified = false) OR (verified_by IS NOT NULL AND verified_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS research_ai_interactions_user_created_idx
  ON public.research_ai_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS field_research_records_case_created_idx
  ON public.field_research_records(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS field_research_records_user_created_idx
  ON public.field_research_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS field_research_records_verified_idx
  ON public.field_research_records(professional_verified, validation_status, created_at DESC);

-- Important : les rapports de terrain sont en attente de vérification professionnelle
-- jusqu'à validation explicite par un administrateur/organisme habilité.
