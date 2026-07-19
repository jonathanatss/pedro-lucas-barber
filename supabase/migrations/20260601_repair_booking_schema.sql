create extension if not exists btree_gist;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  duration_minutes integer not null default 40,
  buffer_before_minutes integer not null default 0,
  buffer_after_minutes integer not null default 0,
  price_label text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists slug text,
  add column if not exists name text,
  add column if not exists description text not null default '',
  add column if not exists duration_minutes integer not null default 40,
  add column if not exists buffer_before_minutes integer not null default 0,
  add column if not exists buffer_after_minutes integer not null default 0,
  add column if not exists price_label text not null default '',
  add column if not exists sort_order integer not null default 0,
  add column if not exists active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.services
set id = gen_random_uuid()
where id is null;

alter table public.services
  alter column id set default gen_random_uuid();

update public.services
set active = false,
    updated_at = now()
where slug is null;

update public.services
set
  description = coalesce(description, ''),
  duration_minutes = coalesce(duration_minutes, 40),
  buffer_before_minutes = coalesce(buffer_before_minutes, 0),
  buffer_after_minutes = coalesce(buffer_after_minutes, 0),
  price_label = coalesce(price_label, ''),
  sort_order = coalesce(sort_order, 0),
  active = coalesce(active, true),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and contype = 'p'
  ) then
    alter table public.services add primary key (id);
  end if;
end $$;

insert into public.services (
  slug,
  name,
  description,
  duration_minutes,
  buffer_before_minutes,
  buffer_after_minutes,
  price_label,
  sort_order,
  active
)
select *
from (
  values
    ('corte-de-cabelo', 'Corte de Cabelo', 'Corte personalizado com acabamento profissional.', 40, 0, 5, 'R$ 35', 1, true),
    ('barba', 'Barba', 'Design, aparagem e hidratacao da barba.', 30, 0, 5, 'R$ 30', 2, true),
    ('combo-completo', 'Combo Completo', 'Corte + barba com todo o cuidado da casa.', 70, 0, 10, 'R$ 60', 3, true),
    ('sobrancelha', 'Sobrancelha', 'Design e alinhamento de sobrancelha.', 10, 0, 5, 'R$ 10', 4, true),
    ('pezinho', 'Pezinho', 'Acabamento da nuca e contorno inferior do corte.', 10, 0, 5, 'R$ 10', 5, true)
) as service_seed (
  slug,
  name,
  description,
  duration_minutes,
  buffer_before_minutes,
  buffer_after_minutes,
  price_label,
  sort_order,
  active
)
where not exists (
  select 1
  from public.services
  where public.services.slug = service_seed.slug
);

create table if not exists public.business_hours (
  weekday integer primary key,
  opens_at text not null,
  closes_at text not null,
  is_closed boolean not null default false
);

alter table public.business_hours
  add column if not exists weekday integer,
  add column if not exists opens_at text not null default '09:00',
  add column if not exists closes_at text not null default '18:00',
  add column if not exists is_closed boolean not null default false;

insert into public.business_hours (weekday, opens_at, closes_at, is_closed)
select *
from (
  values
    (0, '09:00', '18:00', true),
    (1, '09:00', '18:00', false),
    (2, '09:00', '18:00', false),
    (3, '09:00', '18:00', false),
    (4, '09:00', '18:00', false),
    (5, '09:00', '18:00', false),
    (6, '09:00', '18:00', false)
) as hour_seed (weekday, opens_at, closes_at, is_closed)
where not exists (
  select 1
  from public.business_hours
  where public.business_hours.weekday = hour_seed.weekday
);

create table if not exists public.blocked_periods (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.blocked_periods
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists reason text,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid()
);

alter table public.appointments
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists notes text,
  add column if not exists status text not null default 'confirmed',
  add column if not exists service_id uuid,
  add column if not exists service_name_snapshot text,
  add column if not exists service_slug_snapshot text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists timezone text not null default 'America/Sao_Paulo',
  add column if not exists service_duration_minutes integer not null default 40,
  add column if not exists buffer_before_minutes integer not null default 0,
  add column if not exists buffer_after_minutes integer not null default 0,
  add column if not exists google_event_id text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.appointments
set id = gen_random_uuid()
where id is null;

alter table public.appointments
  alter column id set default gen_random_uuid();

update public.appointments
set
  status = coalesce(status, 'confirmed'),
  timezone = coalesce(timezone, 'America/Sao_Paulo'),
  service_duration_minutes = coalesce(service_duration_minutes, 40),
  buffer_before_minutes = coalesce(buffer_before_minutes, 0),
  buffer_after_minutes = coalesce(buffer_after_minutes, 0),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.appointments'::regclass
      and contype = 'p'
  ) then
    alter table public.appointments add primary key (id);
  end if;
end $$;

alter table public.appointments
  drop constraint if exists appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (status in ('confirmed', 'pending_sync', 'cancelled'));

alter table public.appointments
  drop constraint if exists appointments_starts_before_ends;

alter table public.appointments
  add constraint appointments_starts_before_ends
  check (starts_at is null or ends_at is null or starts_at < ends_at);

alter table public.appointments
  drop constraint if exists appointments_no_overlap;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (
    status in ('confirmed', 'pending_sync')
    and starts_at is not null
    and ends_at is not null
  );

notify pgrst, 'reload schema';
