-- Les déclarations terrain sont en attente jusqu'à une vérification explicite.
-- Aucune déclaration ou auto-validation du scanner ne doit alimenter les métriques du modèle.
ALTER TABLE public.agricultural_field_surveys
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by text;

CREATE INDEX IF NOT EXISTS agricultural_field_surveys_verified_metrics_idx
  ON public.agricultural_field_surveys (user_id, verification_status, visit_date DESC);
