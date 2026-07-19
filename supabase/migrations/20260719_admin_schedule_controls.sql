create extension if not exists btree_gist;

create table if not exists public.business_hours (
  weekday integer primary key check (weekday between 0 and 6),
  opens_at text not null default '09:00',
  closes_at text not null default '18:00',
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_hours
  add column if not exists weekday integer;

create unique index if not exists business_hours_weekday_unique_idx
  on public.business_hours (weekday);

create table if not exists public.blocked_periods (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table if not exists public.business_day_overrides (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  opens_at text not null default '09:00',
  closes_at text not null default '18:00',
  is_closed boolean not null default false,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    is_closed
    or (
      opens_at ~ '^\d{2}:\d{2}$'
      and closes_at ~ '^\d{2}:\d{2}$'
      and opens_at < closes_at
    )
  )
);

create index if not exists business_day_overrides_date_idx
  on public.business_day_overrides (date);

create unique index if not exists business_day_overrides_date_unique_idx
  on public.business_day_overrides (date);

alter table public.business_hours
  add column if not exists updated_at timestamptz not null default now();

alter table public.blocked_periods
  add column if not exists updated_at timestamptz not null default now();

notify pgrst, 'reload schema';
