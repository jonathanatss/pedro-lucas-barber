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

alter table public.business_hours
  add column if not exists updated_at timestamptz not null default now();

alter table public.blocked_periods
  add column if not exists updated_at timestamptz not null default now();

notify pgrst, 'reload schema';
