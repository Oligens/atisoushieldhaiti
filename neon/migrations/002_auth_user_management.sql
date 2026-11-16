-- AtisouShield Haïti — Authentification, profils, RBAC et audit
-- Migration additive pour Neon PostgreSQL.
-- À exécuter après 001_atisoushield_complete.sql.
-- Les mots de passe et jetons bruts ne sont JAMAIS stockés ici :
-- l'application serveur doit calculer les hash (Argon2id recommandé) avant insertion.
-- Ne pas connecter le navigateur directement à ces tables. Toutes les opérations passent
-- par des routes serveur qui authentifient la session et appliquent les permissions.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- Profil utilisateur (la table utilisateurs existante est conservée)
-- ------------------------------------------------------------
ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS prenom TEXT,
  ADD COLUMN IF NOT EXISTS telephone TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS departement TEXT,
  ADD COLUMN IF NOT EXISTS commune TEXT,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by TEXT,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.utilisateurs
  ADD CONSTRAINT utilisateurs_account_status_check
  CHECK (account_status IN ('pending_verification','active','suspended','disabled'))
  NOT VALID;
ALTER TABLE public.utilisateurs VALIDATE CONSTRAINT utilisateurs_account_status_check;

CREATE UNIQUE INDEX IF NOT EXISTS uq_utilisateurs_email_ci
  ON public.utilisateurs (LOWER(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;

-- ------------------------------------------------------------
-- Identifiants d'authentification : hash Argon2id uniquement
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_credentials (
  user_id TEXT PRIMARY KEY REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  password_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions opaques : seul le SHA-256 du secret de session est conservé.
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  device_label TEXT,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
  ON public.auth_sessions(user_id, expires_at DESC)
  WHERE revoked_at IS NULL;

-- Vérification e-mail et réinitialisation : jeton aléatoire généré côté serveur,
-- hashé avant stockage, usage unique et durée de vie courte.
CREATE TABLE IF NOT EXISTS public.auth_email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_email_verification_user
  ON public.auth_email_verification_tokens(user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.auth_password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  request_ip INET,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user
  ON public.auth_password_reset_tokens(user_id, expires_at DESC);

-- ------------------------------------------------------------
-- Rôles et permissions RBAC
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_roles (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_permissions (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_role_permissions (
  role_code TEXT NOT NULL REFERENCES public.app_roles(code) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES public.app_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY(role_code, permission_code)
);

CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  role_code TEXT NOT NULL REFERENCES public.app_roles(code),
  assigned_by TEXT REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, role_code, assigned_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_active_role
  ON public.user_role_assignments(user_id, role_code)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_user
  ON public.user_role_assignments(user_id) WHERE revoked_at IS NULL;

INSERT INTO public.app_roles(code,label,description) VALUES
 ('administrateur','Administrateur','Gestion globale de la plateforme'),
 ('agriculteur','Agriculteur','Exploitations, cultures et diagnostics'),
 ('technicien','Technicien agricole','Inspections et validations terrain'),
 ('chercheur','Chercheur','Données scientifiques et analyses'),
 ('superviseur','Superviseur','Suivi des opérations et rapports')
ON CONFLICT (code) DO UPDATE SET label=EXCLUDED.label, description=EXCLUDED.description;

INSERT INTO public.app_permissions(code,description) VALUES
 ('profile.read.self','Consulter son profil'),
 ('profile.update.self','Modifier son profil'),
 ('farm.manage.self','Gérer ses exploitations et cultures'),
 ('diagnostic.create','Créer un diagnostic'),
 ('diagnostic.read.self','Consulter ses diagnostics'),
 ('inspection.create','Créer une inspection'),
 ('diagnostic.validate','Valider un diagnostic'),
 ('research.read','Consulter les données scientifiques'),
 ('research.analyze','Effectuer des analyses scientifiques'),
 ('operations.read','Consulter le suivi opérationnel'),
 ('reports.read','Consulter les rapports'),
 ('reports.export','Exporter les rapports'),
 ('users.read','Consulter les utilisateurs'),
 ('users.manage','Créer et modifier les utilisateurs'),
 ('users.suspend','Suspendre ou réactiver un compte'),
 ('roles.manage','Attribuer les rôles et permissions'),
 ('audit.read','Consulter les journaux d’audit'),
 ('sessions.revoke','Révoquer les sessions')
ON CONFLICT (code) DO NOTHING;

-- Matrice des droits par rôle. L'administrateur reçoit tous les droits.
INSERT INTO public.app_role_permissions(role_code,permission_code)
SELECT 'administrateur', code FROM public.app_permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.app_role_permissions(role_code,permission_code) VALUES
 ('agriculteur','profile.read.self'),
 ('agriculteur','profile.update.self'),
 ('agriculteur','farm.manage.self'),
 ('agriculteur','diagnostic.create'),
 ('agriculteur','diagnostic.read.self'),
 ('technicien','profile.read.self'),
 ('technicien','profile.update.self'),
 ('technicien','inspection.create'),
 ('technicien','diagnostic.validate'),
 ('technicien','diagnostic.read.self'),
 ('chercheur','profile.read.self'),
 ('chercheur','profile.update.self'),
 ('chercheur','research.read'),
 ('chercheur','research.analyze'),
 ('superviseur','profile.read.self'),
 ('superviseur','profile.update.self'),
 ('superviseur','operations.read'),
 ('superviseur','reports.read'),
 ('superviseur','reports.export')
ON CONFLICT DO NOTHING;

-- Migration du rôle historique (si renseigné) vers les attributions RBAC.
INSERT INTO public.user_role_assignments(user_id,role_code)
SELECT u.id,
       CASE
         WHEN LOWER(COALESCE(u.role,'')) IN ('admin','administrator','administrateur') THEN 'administrateur'
         WHEN LOWER(COALESCE(u.role,'')) IN ('technician','technicien') THEN 'technicien'
         WHEN LOWER(COALESCE(u.role,'')) IN ('researcher','chercheur') THEN 'chercheur'
         WHEN LOWER(COALESCE(u.role,'')) IN ('supervisor','superviseur') THEN 'superviseur'
         ELSE 'agriculteur'
       END
FROM public.utilisateurs u
WHERE u.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_role_assignments a
    WHERE a.user_id=u.id AND a.revoked_at IS NULL
  )
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- Informations métier propres aux catégories de comptes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profils_agriculteurs (
  user_id TEXT PRIMARY KEY REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  nom_exploitation TEXT,
  superficie_totale_hectares NUMERIC(12,2) CHECK (superficie_totale_hectares IS NULL OR superficie_totale_hectares >= 0),
  types_cultures TEXT[] NOT NULL DEFAULT '{}',
  experience_annees INTEGER CHECK (experience_annees IS NULL OR experience_annees >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profils_techniciens (
  user_id TEXT PRIMARY KEY REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  matricule TEXT UNIQUE,
  organisme TEXT,
  specialites TEXT[] NOT NULL DEFAULT '{}',
  zone_intervention TEXT,
  statut_validation TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut_validation IN ('en_attente','valide','rejete')),
  validated_by TEXT REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profils_chercheurs (
  user_id TEXT PRIMARY KEY REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  institution TEXT,
  domaine_recherche TEXT,
  identifiant_orcid TEXT,
  niveau_acces TEXT NOT NULL DEFAULT 'standard'
    CHECK (niveau_acces IN ('standard','avance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profils_administrateurs (
  user_id TEXT PRIMARY KEY REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  fonction TEXT,
  mfa_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profils_superviseurs (
  user_id TEXT PRIMARY KEY REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  zone_supervision TEXT,
  organisme TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Historique des connexions et journal des opérations sensibles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_login_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  email_attempted TEXT,
  succeeded BOOLEAN NOT NULL,
  failure_reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  session_id UUID REFERENCES public.auth_sessions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_login_history_user_date
  ON public.auth_login_history(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_date
  ON public.auth_login_history(occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id TEXT REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  target_user_id TEXT REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  outcome TEXT NOT NULL DEFAULT 'success'
    CHECK (outcome IN ('success','denied','failure')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_audit_actor_date
  ON public.security_audit_log(actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_target_date
  ON public.security_audit_log(target_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_action_date
  ON public.security_audit_log(action, occurred_at DESC);

-- Le journal est append-only pour les rôles applicatifs ordinaires.
CREATE OR REPLACE FUNCTION public.reject_security_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'security_audit_log is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_security_audit_no_update ON public.security_audit_log;
CREATE TRIGGER trg_security_audit_no_update
BEFORE UPDATE OR DELETE ON public.security_audit_log
FOR EACH ROW EXECUTE FUNCTION public.reject_security_audit_mutation();

-- ------------------------------------------------------------
-- Fonctions de contrôle d'accès (à appeler côté serveur)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id TEXT, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.app_role_permissions arp ON arp.role_code=ura.role_code
    JOIN public.app_permissions ap ON ap.code=arp.permission_code
    JOIN public.utilisateurs u ON u.id=ura.user_id
    WHERE ura.user_id=p_user_id
      AND ura.revoked_at IS NULL
      AND ap.code=p_permission
      AND u.account_status='active'
      AND u.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_active(p_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utilisateurs
    WHERE id=p_user_id AND account_status='active' AND deleted_at IS NULL
      AND (locked_until IS NULL OR locked_until <= NOW())
  );
$$;

-- Révoque toutes les sessions d'un compte lors d'une suspension.
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(
  p_user_id TEXT, p_reason TEXT DEFAULT 'account_suspended'
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.auth_sessions
     SET revoked_at=NOW(), revoke_reason=p_reason
   WHERE user_id=p_user_id AND revoked_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Mise à jour cohérente du statut, journalisée par la route serveur appelante.
CREATE OR REPLACE FUNCTION public.set_user_account_status(
  p_target_user_id TEXT,
  p_status TEXT,
  p_actor_user_id TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_status NOT IN ('active','suspended','disabled','pending_verification') THEN
    RAISE EXCEPTION 'Invalid account status';
  END IF;
  IF NOT public.user_has_permission(p_actor_user_id,'users.suspend') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE public.utilisateurs
     SET account_status=p_status,
         suspended_at=CASE WHEN p_status='suspended' THEN NOW() ELSE NULL END,
         suspended_by=CASE WHEN p_status='suspended' THEN p_actor_user_id ELSE NULL END,
         suspension_reason=CASE WHEN p_status='suspended' THEN p_reason ELSE NULL END,
         updated_at=NOW()
   WHERE id=p_target_user_id AND deleted_at IS NULL;

  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  IF p_status <> 'active' THEN
    PERFORM public.revoke_user_sessions(p_target_user_id, 'account_' || p_status);
  END IF;
END;
$$;

-- Mise à jour automatique des horodatages.
CREATE OR REPLACE FUNCTION public.auth_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at=NOW();
  RETURN NEW;
END;
$$;
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'auth_credentials',
    'profils_agriculteurs',
    'profils_techniciens',
    'profils_chercheurs',
    'profils_superviseurs'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_'||t||'_updated_at', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.auth_set_updated_at()',
      'trg_'||t||'_updated_at', t
    );
  END LOOP;
END $$;

-- Les tables d'authentification ne doivent pas être accessibles directement au rôle
-- applicatif public/anon. Configurez un rôle DB serveur dédié et accordez-lui seulement
-- les opérations nécessaires. Ne mettez jamais DATABASE_URL dans le bundle Vite.
REVOKE ALL ON public.auth_credentials FROM PUBLIC;
REVOKE ALL ON public.auth_sessions FROM PUBLIC;
REVOKE ALL ON public.auth_email_verification_tokens FROM PUBLIC;
REVOKE ALL ON public.auth_password_reset_tokens FROM PUBLIC;
REVOKE ALL ON public.security_audit_log FROM PUBLIC;
REVOKE ALL ON public.auth_login_history FROM PUBLIC;

COMMIT;

-- Contrôles post-migration
SELECT 'ATISOUSHIELD AUTH/RBAC MIGRATION OK' AS status, NOW() AS verified_at;
SELECT code,label FROM public.app_roles ORDER BY code;
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN (
    'auth_credentials','auth_sessions','auth_email_verification_tokens',
    'auth_password_reset_tokens','app_roles','app_permissions',
    'app_role_permissions','user_role_assignments','profils_agriculteurs',
    'profils_techniciens','profils_chercheurs','profils_administrateurs',
    'profils_superviseurs','auth_login_history','security_audit_log'
  )
ORDER BY table_name;
