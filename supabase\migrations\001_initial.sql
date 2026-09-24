create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Demo User',
  preferences jsonb not null default '[]'::jsonb,
  dislikes jsonb not null default '[]'::jsonb,
  allergies jsonb not null default '[]'::jsonb,
  dietary_constraints jsonb not null default '[]'::jsonb,
  default_servings integer not null default 1 check (default_servings between 1 and 12),
  default_prep_time integer not null default 30,
  planning_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  name text not null,
  canonical_name text not null,
  category text,
  management_mode text not null check (management_mode in ('tracked_quantity', 'freshness_only', 'approximate_stock')),
  storage_location text,
  quantity numeric,
  unit text,
  stock_percentage numeric check (stock_percentage between 0 and 100),
  production_date date,
  purchase_date date,
  expiry_date date,
  freshness_score numeric check (freshness_score between 0 and 100),
  freshness_status text not null default 'uncertain',
  freshness_confidence text not null default 'low',
  freshness_source text,
  image_reference text,
  created_source text not null default 'manual',
  last_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  inventory_item_id uuid references inventory_items(id) on delete cascade,
  event_type text not null check (event_type in ('purchase', 'consume', 'estimated_consume', 'manual_correction', 'discard', 'restock')),
  amount numeric,
  unit text,
  source_recipe_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  recipe_name text not null,
  servings integer,
  estimated_prep_minutes integer,
  prompt_version text,
  model text,
  input jsonb not null default '{}'::jsonb,
  retrieved_context jsonb not null default '[]'::jsonb,
  raw_output jsonb,
  validated_output jsonb,
  validation_errors jsonb not null default '[]'::jsonb,
  status text not null default 'generated',
  created_at timestamptz not null default now()
);

create table if not exists meal_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete set null,
  recipe_name text not null,
  servings integer,
  actual_ingredient_adjustments jsonb not null default '{}'::jsonb,
  user_rating integer check (user_rating between 1 and 5),
  feedback_reason text,
  made_at timestamptz not null default now()
);

create table if not exists food_knowledge (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  category text,
  storage_location text,
  typical_storage_min_days integer,
  typical_storage_max_days integer,
  visual_state_rules jsonb not null default '{}'::jsonb,
  warning_signs text,
  storage_notes text,
  source_title text,
  source_url text,
  updated_at timestamptz not null default now()
);

create table if not exists freshness_rules (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  management_mode text,
  use_soon_threshold numeric not null default 40,
  low_confidence_threshold numeric not null default 55,
  rules jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists system_config (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

create index if not exists inventory_profile_idx on inventory_items(profile_id);
create index if not exists inventory_canonical_idx on inventory_items(canonical_name);
create index if not exists inventory_events_item_idx on inventory_events(inventory_item_id);
