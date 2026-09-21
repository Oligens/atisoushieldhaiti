create extension if not exists pgcrypto;

create table if not exists public.agricultural_cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  crop text not null default 'Non renseigné',
  location text not null default 'Non renseigné',
  latitude double precision,
  longitude double precision,
  predicted_disease text not null,
  confidence integer not null default 0 check (confidence between 0 and 100),
  validation_label text check (validation_label in ('confirmed','rejected','uncertain')),
  validated_at timestamptz,
  field_outcome text,
  weather jsonb,
  image_reference text
);

create table if not exists public.weather_observations (
  id uuid primary key default gen_random_uuid(),
  observed_at timestamptz not null default now(),
  latitude double precision not null,
  longitude double precision not null,
  temperature double precision not null,
  humidity double precision not null,
  wind_speed double precision not null,
  rainfall_mm double precision default 0,
  source text not null default 'AtisouShield'
);

create index if not exists agricultural_cases_created_at_idx on public.agricultural_cases(created_at desc);
create index if not exists agricultural_cases_location_idx on public.agricultural_cases(location);
create index if not exists agricultural_cases_crop_idx on public.agricultural_cases(crop);
create index if not exists agricultural_cases_disease_idx on public.agricultural_cases(predicted_disease);
create index if not exists weather_observations_observed_at_idx on public.weather_observations(observed_at desc);

alter table public.agricultural_cases enable row level security;
alter table public.weather_observations enable row level security;

drop policy if exists "authenticated can read agricultural cases" on public.agricultural_cases;
create policy "authenticated can read agricultural cases" on public.agricultural_cases for select to authenticated using (true);
drop policy if exists "authenticated can insert agricultural cases" on public.agricultural_cases;
create policy "authenticated can insert agricultural cases" on public.agricultural_cases for insert to authenticated with check (true);
drop policy if exists "authenticated can update agricultural cases" on public.agricultural_cases;
create policy "authenticated can update agricultural cases" on public.agricultural_cases for update to authenticated using (true) with check (true);

drop policy if exists "authenticated can read weather observations" on public.weather_observations;
create policy "authenticated can read weather observations" on public.weather_observations for select to authenticated using (true);
drop policy if exists "authenticated can insert weather observations" on public.weather_observations;
create policy "authenticated can insert weather observations" on public.weather_observations for insert to authenticated with check (true);
