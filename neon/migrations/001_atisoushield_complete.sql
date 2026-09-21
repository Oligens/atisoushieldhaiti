-- AtisouShield Haïti — Neon PostgreSQL complet
-- Schéma canonique aligné avec api/research.ts
-- Authentification conservée côté application (localStorage).
-- Aucun mot de passe ni mécanisme d'authentification n'est stocké ici.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- UTILISATEURS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.utilisateurs (
  id TEXT PRIMARY KEY
);

ALTER TABLE public.utilisateurs ADD COLUMN IF NOT EXISTS nom TEXT;
ALTER TABLE public.utilisateurs ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.utilisateurs ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'agriculteur';
ALTER TABLE public.utilisateurs ADD COLUMN IF NOT EXISTS zone TEXT;
ALTER TABLE public.utilisateurs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.utilisateurs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON public.utilisateurs(email);

-- ============================================================
-- ZONES AGRICOLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.zones_agricoles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.zones_agricoles ADD COLUMN IF NOT EXISTS nom TEXT;
ALTER TABLE public.zones_agricoles ADD COLUMN IF NOT EXISTS departement TEXT;
ALTER TABLE public.zones_agricoles ADD COLUMN IF NOT EXISTS commune TEXT;
ALTER TABLE public.zones_agricoles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.zones_agricoles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.zones_agricoles ADD COLUMN IF NOT EXISTS type_culture TEXT;
ALTER TABLE public.zones_agricoles ADD COLUMN IF NOT EXISTS superficie_hectares NUMERIC;
ALTER TABLE public.zones_agricoles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.zones_agricoles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_zones_agricoles_nom ON public.zones_agricoles(nom);
CREATE INDEX IF NOT EXISTS idx_zones_agricoles_departement ON public.zones_agricoles(departement);
CREATE INDEX IF NOT EXISTS idx_zones_agricoles_commune ON public.zones_agricoles(commune);
CREATE INDEX IF NOT EXISTS idx_zones_agricoles_coordinates ON public.zones_agricoles(latitude, longitude);

-- ============================================================
-- ALERTES SANITAIRES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.alertes_sanitaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.alertes_sanitaires ADD COLUMN IF NOT EXISTS zone_id UUID;
ALTER TABLE public.alertes_sanitaires ADD COLUMN IF NOT EXISTS maladie TEXT;
ALTER TABLE public.alertes_sanitaires ADD COLUMN IF NOT EXISTS culture TEXT;
ALTER TABLE public.alertes_sanitaires ADD COLUMN IF NOT EXISTS niveau TEXT;
ALTER TABLE public.alertes_sanitaires ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.alertes_sanitaires ADD COLUMN IF NOT EXISTS date_debut TIMESTAMPTZ;
ALTER TABLE public.alertes_sanitaires ADD COLUMN IF NOT EXISTS date_fin TIMESTAMPTZ;
ALTER TABLE public.alertes_sanitaires ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.alertes_sanitaires ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.alertes_sanitaires ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_alertes_zone ON public.alertes_sanitaires(zone_id);
CREATE INDEX IF NOT EXISTS idx_alertes_active ON public.alertes_sanitaires(active);
CREATE INDEX IF NOT EXISTS idx_alertes_maladie ON public.alertes_sanitaires(maladie);

-- ============================================================
-- HISTORIQUE DES SCANS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.historique_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.historique_scans ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.historique_scans ADD COLUMN IF NOT EXISTS culture TEXT;
ALTER TABLE public.historique_scans ADD COLUMN IF NOT EXISTS maladie_detectee TEXT;
ALTER TABLE public.historique_scans ADD COLUMN IF NOT EXISTS confiance DOUBLE PRECISION;
ALTER TABLE public.historique_scans ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.historique_scans ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.historique_scans ADD COLUMN IF NOT EXISTS localisation TEXT;
ALTER TABLE public.historique_scans ADD COLUMN IF NOT EXISTS image_reference TEXT;
ALTER TABLE public.historique_scans ADD COLUMN IF NOT EXISTS resultat TEXT;
ALTER TABLE public.historique_scans ADD COLUMN IF NOT EXISTS traitement_recommande TEXT;
ALTER TABLE public.historique_scans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.historique_scans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_historique_user ON public.historique_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_historique_created ON public.historique_scans(created_at DESC);

-- ============================================================
-- DONNÉES MÉTÉOROLOGIQUES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meteo_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.meteo_records ADD COLUMN IF NOT EXISTS zone_id UUID;
ALTER TABLE public.meteo_records ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.meteo_records ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.meteo_records ADD COLUMN IF NOT EXISTS temperature DOUBLE PRECISION;
ALTER TABLE public.meteo_records ADD COLUMN IF NOT EXISTS humidite DOUBLE PRECISION;
ALTER TABLE public.meteo_records ADD COLUMN IF NOT EXISTS precipitation DOUBLE PRECISION;
ALTER TABLE public.meteo_records ADD COLUMN IF NOT EXISTS vitesse_vent DOUBLE PRECISION;
ALTER TABLE public.meteo_records ADD COLUMN IF NOT EXISTS conditions TEXT;
ALTER TABLE public.meteo_records ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.meteo_records ADD COLUMN IF NOT EXISTS observed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.meteo_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_meteo_zone ON public.meteo_records(zone_id);
CREATE INDEX IF NOT EXISTS idx_meteo_date ON public.meteo_records(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_meteo_coordinates ON public.meteo_records(latitude, longitude);

-- ============================================================
-- CORPUS DE CAS AGRICOLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agricultural_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT 'anonymous';
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS crop TEXT DEFAULT 'Non renseigné';
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Non renseigné';
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS predicted_disease TEXT;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION DEFAULT 0;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS validation_label TEXT;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS actual_disease TEXT;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS field_outcome TEXT;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS weather JSONB;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS image_reference TEXT;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_agricultural_cases_user ON public.agricultural_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_agricultural_cases_created ON public.agricultural_cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agricultural_cases_location ON public.agricultural_cases(location);
CREATE INDEX IF NOT EXISTS idx_agricultural_cases_crop ON public.agricultural_cases(crop);
CREATE INDEX IF NOT EXISTS idx_agricultural_cases_predicted ON public.agricultural_cases(predicted_disease);
CREATE INDEX IF NOT EXISTS idx_agricultural_cases_actual ON public.agricultural_cases(actual_disease);
CREATE INDEX IF NOT EXISTS idx_agricultural_cases_validation ON public.agricultural_cases(validation_label);
CREATE INDEX IF NOT EXISTS idx_agricultural_cases_coordinates ON public.agricultural_cases(latitude, longitude);

-- ============================================================
-- OBSERVATIONS MÉTÉO RECHERCHE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.weather_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.weather_observations ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT 'anonymous';
ALTER TABLE public.weather_observations ADD COLUMN IF NOT EXISTS observed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.weather_observations ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.weather_observations ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.weather_observations ADD COLUMN IF NOT EXISTS temperature DOUBLE PRECISION;
ALTER TABLE public.weather_observations ADD COLUMN IF NOT EXISTS humidity DOUBLE PRECISION;
ALTER TABLE public.weather_observations ADD COLUMN IF NOT EXISTS wind_speed DOUBLE PRECISION;
ALTER TABLE public.weather_observations ADD COLUMN IF NOT EXISTS rainfall DOUBLE PRECISION DEFAULT 0;
ALTER TABLE public.weather_observations ADD COLUMN IF NOT EXISTS weather JSONB;
ALTER TABLE public.weather_observations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_weather_observations_user ON public.weather_observations(user_id);
CREATE INDEX IF NOT EXISTS idx_weather_observations_observed ON public.weather_observations(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_weather_observations_coordinates ON public.weather_observations(latitude, longitude);

-- ============================================================
-- FONCTION UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_utilisateurs_updated_at ON public.utilisateurs;
CREATE TRIGGER trg_utilisateurs_updated_at
BEFORE UPDATE ON public.utilisateurs
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_zones_agricoles_updated_at ON public.zones_agricoles;
CREATE TRIGGER trg_zones_agricoles_updated_at
BEFORE UPDATE ON public.zones_agricoles
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_alertes_sanitaires_updated_at ON public.alertes_sanitaires;
CREATE TRIGGER trg_alertes_sanitaires_updated_at
BEFORE UPDATE ON public.alertes_sanitaires
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_historique_scans_updated_at ON public.historique_scans;
CREATE TRIGGER trg_historique_scans_updated_at
BEFORE UPDATE ON public.historique_scans
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_agricultural_cases_updated_at ON public.agricultural_cases;
CREATE TRIGGER trg_agricultural_cases_updated_at
BEFORE UPDATE ON public.agricultural_cases
FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- ============================================================
-- VUES
-- ============================================================

DROP VIEW IF EXISTS public.vue_alertes_actives_detail CASCADE;
CREATE VIEW public.vue_alertes_actives_detail AS
SELECT
  a.id,
  a.maladie,
  a.culture,
  a.niveau,
  a.description,
  a.date_debut,
  a.date_fin,
  a.active,
  z.id AS zone_id,
  z.nom AS zone,
  z.departement,
  z.commune,
  z.latitude,
  z.longitude
FROM public.alertes_sanitaires a
LEFT JOIN public.zones_agricoles z ON z.id = a.zone_id
WHERE a.active = TRUE;

DROP VIEW IF EXISTS public.vue_stats_pays CASCADE;
CREATE VIEW public.vue_stats_pays AS
SELECT
  COUNT(*) AS total_scans,
  COUNT(*) FILTER (WHERE maladie_detectee IS NOT NULL) AS scans_avec_maladie,
  AVG(confiance) AS confiance_moyenne,
  COUNT(DISTINCT culture) AS cultures_differentes,
  COUNT(DISTINCT localisation) AS localisations_differentes
FROM public.historique_scans;

DROP VIEW IF EXISTS public.vue_derniers_scans CASCADE;
CREATE VIEW public.vue_derniers_scans AS
SELECT
  id,
  user_id,
  culture,
  maladie_detectee,
  confiance,
  latitude,
  longitude,
  localisation,
  resultat,
  traitement_recommande,
  created_at
FROM public.historique_scans
ORDER BY created_at DESC;

DROP VIEW IF EXISTS public.vue_zones_alertes CASCADE;
CREATE VIEW public.vue_zones_alertes AS
SELECT
  z.id,
  z.nom,
  z.departement,
  z.commune,
  z.latitude,
  z.longitude,
  COUNT(a.id) AS nombre_alertes
FROM public.zones_agricoles z
LEFT JOIN public.alertes_sanitaires a
  ON a.zone_id = z.id
 AND a.active = TRUE
GROUP BY z.id, z.nom, z.departement, z.commune, z.latitude, z.longitude;

DROP VIEW IF EXISTS public.vue_recherche_cas CASCADE;
CREATE VIEW public.vue_recherche_cas AS
SELECT
  id,
  user_id,
  crop,
  location,
  latitude,
  longitude,
  predicted_disease,
  actual_disease,
  confidence,
  validation_label,
  weather,
  field_outcome,
  image_reference,
  created_at,
  updated_at
FROM public.agricultural_cases;

DROP VIEW IF EXISTS public.vue_cas_valides CASCADE;
CREATE VIEW public.vue_cas_valides AS
SELECT
  id,
  user_id,
  crop,
  location,
  predicted_disease,
  actual_disease,
  confidence,
  validation_label,
  created_at
FROM public.agricultural_cases
WHERE actual_disease IS NOT NULL
  AND validation_label IN ('confirmed', 'rejected');

DROP VIEW IF EXISTS public.vue_stats_validation CASCADE;
CREATE VIEW public.vue_stats_validation AS
SELECT
  COUNT(*) AS total_cases,
  COUNT(*) FILTER (WHERE validation_label = 'confirmed') AS confirmed,
  COUNT(*) FILTER (WHERE validation_label = 'rejected') AS rejected,
  COUNT(*) FILTER (WHERE validation_label = 'uncertain') AS uncertain,
  ROUND(
    (
      100.0 * COUNT(*) FILTER (WHERE validation_label = 'confirmed')
      /
      NULLIF(COUNT(*) FILTER (WHERE validation_label IN ('confirmed','rejected')), 0)
    )::numeric,
    2
  ) AS confirmation_rate,
  AVG(confidence) AS average_confidence
FROM public.agricultural_cases;

DROP VIEW IF EXISTS public.vue_stats_par_culture CASCADE;
CREATE VIEW public.vue_stats_par_culture AS
SELECT
  crop,
  COUNT(*) AS total_cases,
  COUNT(*) FILTER (WHERE validation_label = 'confirmed') AS confirmed,
  COUNT(*) FILTER (WHERE validation_label = 'rejected') AS rejected,
  COUNT(*) FILTER (WHERE validation_label = 'uncertain') AS uncertain,
  AVG(confidence) AS average_confidence
FROM public.agricultural_cases
GROUP BY crop
ORDER BY total_cases DESC;

DROP VIEW IF EXISTS public.vue_stats_par_maladie CASCADE;
CREATE VIEW public.vue_stats_par_maladie AS
SELECT
  predicted_disease,
  COUNT(*) AS total_cases,
  COUNT(*) FILTER (WHERE validation_label = 'confirmed') AS confirmed,
  COUNT(*) FILTER (WHERE validation_label = 'rejected') AS rejected,
  COUNT(*) FILTER (WHERE validation_label = 'uncertain') AS uncertain,
  AVG(confidence) AS average_confidence
FROM public.agricultural_cases
GROUP BY predicted_disease
ORDER BY total_cases DESC;

DROP VIEW IF EXISTS public.vue_stats_par_localisation CASCADE;
CREATE VIEW public.vue_stats_par_localisation AS
SELECT
  location,
  AVG(latitude) AS latitude,
  AVG(longitude) AS longitude,
  COUNT(*) AS total_cases,
  COUNT(*) FILTER (WHERE validation_label = 'confirmed') AS confirmed,
  COUNT(*) FILTER (WHERE validation_label = 'rejected') AS rejected,
  COUNT(*) FILTER (WHERE validation_label = 'uncertain') AS uncertain,
  AVG(confidence) AS average_confidence
FROM public.agricultural_cases
GROUP BY location
ORDER BY total_cases DESC;

-- ============================================================
-- NORMALISATION
-- ============================================================

UPDATE public.agricultural_cases
SET user_id = 'anonymous'
WHERE user_id IS NULL;

UPDATE public.weather_observations
SET user_id = 'anonymous'
WHERE user_id IS NULL;

COMMIT;

-- ============================================================
-- VÉRIFICATIONS
-- ============================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'utilisateurs',
  'zones_agricoles',
  'alertes_sanitaires',
  'historique_scans',
  'meteo_records',
  'agricultural_cases',
  'weather_observations'
)
ORDER BY table_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'zones_agricoles'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'agricultural_cases'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'weather_observations'
ORDER BY ordinal_position;

SELECT 'ATISOUSHIELD NEON SCHEMA OK' AS status, NOW() AS verified_at;
