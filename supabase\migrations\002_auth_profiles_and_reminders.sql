alter table public.profiles
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade,
  add column if not exists phone text,
  add column if not exists taste_tags jsonb not null default '[]'::jsonb,
  add column if not exists cuisine_tags jsonb not null default '[]'::jsonb,
  add column if not exists taste_notes text not null default '',
  add column if not exists taste_profile_summary text not null default '',
  add column if not exists meal_schedule jsonb not null default '{}'::jsonb,
  add column if not exists appliance_temperatures jsonb not null default '{"fridgeC":4,"freezerC":-18}'::jsonb,
  add column if not exists notification_settings jsonb not null default '{}'::jsonb,
  add column if not exists notification_channel text not null default 'app' check (notification_channel in ('app', 'sms', 'both')),
  add column if not exists sms_consent boolean not null default false,
  add column if not exists onboarding_completed boolean not null default false;

create table if not exists public.planned_meals (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  recipe jsonb not null,
  status text not null default 'planned' check (status in ('planned', 'made', 'skipped')),
  planned_for date not null,
  confirmation_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  planned_meal_id uuid references public.planned_meals(id) on delete cascade,
  phone text not null,
  message text not null,
  channel text not null default 'sms' check (channel in ('sms', 'both')),
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists reminder_jobs_due_idx on public.reminder_jobs (status, due_at);
create index if not exists planned_meals_user_date_idx on public.planned_meals (auth_user_id, planned_for);

alter table public.profiles enable row level security;
alter table public.planned_meals enable row level security;
alter table public.reminder_jobs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = auth_user_id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = auth_user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

drop policy if exists "planned_meals_own" on public.planned_meals;
create policy "planned_meals_own" on public.planned_meals for all using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);
drop policy if exists "reminder_jobs_own" on public.reminder_jobs;
create policy "reminder_jobs_own" on public.reminder_jobs for all using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

-- Apply equivalent ownership policies to inventory/shopping/meal tables after adding auth_user_id to them.
-- Service-role reminder workers bypass RLS and must be protected by CRON_SECRET.
