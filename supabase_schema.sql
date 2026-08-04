-- One row per user, holding their current flight-plan settings (mirrors
-- the same shape already saved to localStorage in src/lib/persistence.ts).
create table if not exists public.flight_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.flight_plans enable row level security;

create policy "select own plan" on public.flight_plans
  for select using (auth.uid() = user_id);
create policy "insert own plan" on public.flight_plans
  for insert with check (auth.uid() = user_id);
create policy "update own plan" on public.flight_plans
  for update using (auth.uid() = user_id);

-- One row per completed flight (takeoff to landing), with the GPS
-- breadcrumb trail as a JSON array of {lat, lon, timestamp}.
create table if not exists public.flight_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  aircraft_id text,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  distance_nm numeric,
  points jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.flight_tracks enable row level security;

create policy "select own tracks" on public.flight_tracks
  for select using (auth.uid() = user_id);
create policy "insert own tracks" on public.flight_tracks
  for insert with check (auth.uid() = user_id);
create policy "delete own tracks" on public.flight_tracks
  for delete using (auth.uid() = user_id);

create index if not exists flight_tracks_user_started_idx
  on public.flight_tracks (user_id, started_at desc);
