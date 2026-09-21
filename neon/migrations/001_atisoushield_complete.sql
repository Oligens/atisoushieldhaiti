-- AtisouShield Haïti — Neon PostgreSQL complet
-- Authentification conservée côté application (localStorage). Aucun mot de passe ici.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.utilisateurs (
  id TEXT PRIMARY KEY, nom VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE,
  region VARCHAR(255), pays VARCHAR(100), role VARCHAR(50) NOT NULL DEFAULT 'agriculteur',
  date_inscription TIMESTAMPTZ NOT NULL DEFAULT NOW(), derniere_connexion TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON public.utilisateurs(email);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_pays ON public.utilisateurs(pays);

CREATE TABLE IF NOT EXISTS public.zones_agricoles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom VARCHAR(255) NOT NULL,
  pays VARCHAR(100) NOT NULL, region VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  type_culture VARCHAR(255), superficie_hectares DECIMAL(10,2), date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zones_pays ON public.zones_agricoles(pays);
CREATE INDEX IF NOT EXISTS idx_zones_region ON public.zones_agricoles(region);
CREATE INDEX IF NOT EXISTS idx_zones_coords ON public.zones_agricoles(latitude,longitude);

CREATE TABLE IF NOT EXISTS public.alertes_sanitaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), titre VARCHAR(255) NOT NULL, description TEXT NOT NULL,
  niveau VARCHAR(20) NOT NULL CHECK (niveau IN ('faible','modere','eleve','critique')),
  pays VARCHAR(100) NOT NULL, region VARCHAR(255) NOT NULL,
  zone_id UUID REFERENCES public.zones_agricoles(id) ON DELETE SET NULL,
  maladie_nom VARCHAR(255), pathogene VARCHAR(255), icon VARCHAR(10) DEFAULT '⚠️',
  active BOOLEAN NOT NULL DEFAULT TRUE, date_alerte TIMESTAMPTZ NOT NULL DEFAULT NOW(), date_expiration TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_alertes_pays ON public.alertes_sanitaires(pays);
CREATE INDEX IF NOT EXISTS idx_alertes_region ON public.alertes_sanitaires(region);
CREATE INDEX IF NOT EXISTS idx_alertes_niveau ON public.alertes_sanitaires(niveau);
CREATE INDEX IF NOT EXISTS idx_alertes_active ON public.alertes_sanitaires(active);
CREATE INDEX IF NOT EXISTS idx_alertes_date ON public.alertes_sanitaires(date_alerte DESC);

CREATE TABLE IF NOT EXISTS public.historique_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL, image_url TEXT,
  diagnostic_resultat TEXT NOT NULL, maladie_detectee VARCHAR(255),
  confiance INTEGER CHECK (confiance BETWEEN 0 AND 100), traitements_suggeres TEXT[],
  zone_id UUID REFERENCES public.zones_agricoles(id) ON DELETE SET NULL, date_scan TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scans_user ON public.historique_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_date ON public.historique_scans(date_scan DESC);
CREATE INDEX IF NOT EXISTS idx_scans_maladie ON public.historique_scans(maladie_detectee);
CREATE INDEX IF NOT EXISTS idx_scans_zone ON public.historique_scans(zone_id);

CREATE TABLE IF NOT EXISTS public.meteo_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), zone_id UUID REFERENCES public.zones_agricoles(id) ON DELETE CASCADE,
  user_id TEXT, temperature DECIMAL(6,2) NOT NULL, humidite DECIMAL(5,2) NOT NULL CHECK (humidite BETWEEN 0 AND 100),
  vent DECIMAL(6,2), condition VARCHAR(100), risque_fongique VARCHAR(20), date_mesure TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meteo_zone ON public.meteo_records(zone_id);
CREATE INDEX IF NOT EXISTS idx_meteo_user ON public.meteo_records(user_id);
CREATE INDEX IF NOT EXISTS idx_meteo_date ON public.meteo_records(date_mesure DESC);

CREATE TABLE IF NOT EXISTS public.agricultural_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL DEFAULT 'anonymous',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), crop TEXT NOT NULL DEFAULT 'Non renseigné',
  location TEXT NOT NULL DEFAULT 'Non renseigné',
  latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
  predicted_disease TEXT NOT NULL, confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  validation_label TEXT CHECK (validation_label IN ('confirmed','rejected','uncertain')),
  actual_disease TEXT, validated_at TIMESTAMPTZ, field_outcome TEXT, weather JSONB, image_reference TEXT
);
CREATE INDEX IF NOT EXISTS agricultural_cases_user_idx ON public.agricultural_cases(user_id);
CREATE INDEX IF NOT EXISTS agricultural_cases_created_at_idx ON public.agricultural_cases(created_at DESC);
CREATE INDEX IF NOT EXISTS agricultural_cases_location_idx ON public.agricultural_cases(location);
CREATE INDEX IF NOT EXISTS agricultural_cases_crop_idx ON public.agricultural_cases(crop);
CREATE INDEX IF NOT EXISTS agricultural_cases_disease_idx ON public.agricultural_cases(predicted_disease);
CREATE INDEX IF NOT EXISTS agricultural_cases_actual_disease_idx ON public.agricultural_cases(actual_disease);

CREATE TABLE IF NOT EXISTS public.weather_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL DEFAULT 'anonymous',
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  temperature DOUBLE PRECISION NOT NULL, humidity DOUBLE PRECISION NOT NULL CHECK (humidity BETWEEN 0 AND 100),
  wind_speed DOUBLE PRECISION NOT NULL, rainfall_mm DOUBLE PRECISION NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'AtisouShield'
);
CREATE INDEX IF NOT EXISTS weather_observations_user_idx ON public.weather_observations(user_id);
CREATE INDEX IF NOT EXISTS weather_observations_observed_at_idx ON public.weather_observations(observed_at DESC);
CREATE INDEX IF NOT EXISTS weather_observations_coords_idx ON public.weather_observations(latitude,longitude);

-- Rend la migration compatible avec une base déjà initialisée.
ALTER TABLE public.historique_scans ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.meteo_records ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT 'anonymous';
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS actual_disease TEXT;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS field_outcome TEXT;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS weather JSONB;
ALTER TABLE public.agricultural_cases ADD COLUMN IF NOT EXISTS image_reference TEXT;
ALTER TABLE public.weather_observations ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT 'anonymous';

CREATE OR REPLACE VIEW public.vue_alertes_actives_detail AS
SELECT a.id,a.titre,a.description,a.niveau,a.pays,a.region,a.icon,a.date_alerte,a.maladie_nom,a.pathogene,
       z.nom AS zone_nom,z.latitude,z.longitude
FROM public.alertes_sanitaires a LEFT JOIN public.zones_agricoles z ON a.zone_id=z.id
WHERE a.active=TRUE ORDER BY a.date_alerte DESC;

CREATE OR REPLACE VIEW public.vue_stats_pays AS
SELECT pays,COUNT(*) AS total_alertes,
 COUNT(*) FILTER (WHERE niveau='critique') AS alertes_critiques,
 COUNT(*) FILTER (WHERE niveau='eleve') AS alertes_elevees,
 COUNT(*) FILTER (WHERE niveau='modere') AS alertes_moderees,
 COUNT(*) FILTER (WHERE niveau='faible') AS alertes_faibles
FROM public.alertes_sanitaires WHERE active=TRUE GROUP BY pays;

CREATE OR REPLACE VIEW public.vue_derniers_scans AS
SELECT user_id,COUNT(*) AS total_scans,MAX(date_scan) AS dernier_scan,COUNT(DISTINCT maladie_detectee) AS maladies_differentes
FROM public.historique_scans GROUP BY user_id;

CREATE OR REPLACE VIEW public.vue_zones_alertes AS
SELECT z.id,z.nom,z.pays,z.region,z.latitude,z.longitude,COUNT(a.id) AS nombre_alertes,MAX(a.date_alerte) AS derniere_alerte
FROM public.zones_agricoles z LEFT JOIN public.alertes_sanitaires a ON z.id=a.zone_id AND a.active=TRUE
GROUP BY z.id,z.nom,z.pays,z.region,z.latitude,z.longitude;

CREATE OR REPLACE VIEW public.vue_recherche_cas AS
SELECT COUNT(*) AS total_cases,
 COUNT(*) FILTER (WHERE validation_label='confirmed') AS confirmed,
 COUNT(*) FILTER (WHERE validation_label='rejected') AS rejected,
 COUNT(*) FILTER (WHERE validation_label='uncertain') AS uncertain,
 COUNT(*) FILTER (WHERE actual_disease IS NOT NULL AND validation_label IN ('confirmed','rejected')) AS evaluated_cases
FROM public.agricultural_cases;

-- L'API Vercel utilise DATABASE_URL/NEON_DATABASE_URL. Ne jamais exposer cette valeur au navigateur.
