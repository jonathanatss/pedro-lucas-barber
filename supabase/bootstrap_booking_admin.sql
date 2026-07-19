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

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'duration_min'
  ) then
    alter table public.services alter column duration_min set default 40;

    update public.services
    set duration_min = coalesce(duration_min, duration_minutes, 40)
    where duration_min is null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'price_cents'
  ) then
    alter table public.services alter column price_cents set default 1000;

    update public.services
    set price_cents = coalesce(
      price_cents,
      case slug
        when 'corte-de-cabelo' then 3500
        when 'barba' then 3000
        when 'combo-completo' then 6000
        when 'sobrancelha' then 1000
        when 'pezinho' then 1000
        else 1000
      end
    )
    where price_cents is null;
  end if;
end $$;

update public.services
set id = gen_random_uuid()
where id is null;

alter table public.services
  alter column id set default gen_random_uuid();

update public.services
set active = false,
    updated_at = now()
where slug is null;

delete from public.services duplicated
using public.services kept
where duplicated.slug = kept.slug
  and duplicated.ctid > kept.ctid;

create unique index if not exists services_slug_unique_idx
  on public.services (slug);

create unique index if not exists services_id_unique_idx
  on public.services (id);

update public.services
set
  name = service_seed.name,
  description = service_seed.description,
  duration_minutes = service_seed.duration_minutes,
  buffer_before_minutes = service_seed.buffer_before_minutes,
  buffer_after_minutes = service_seed.buffer_after_minutes,
  price_label = service_seed.price_label,
  sort_order = service_seed.sort_order,
  active = service_seed.active,
  updated_at = now()
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
where public.services.slug = service_seed.slug;

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

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'duration_min'
  ) then
    update public.services
    set duration_min = duration_minutes
    where slug in (
      'corte-de-cabelo',
      'barba',
      'combo-completo',
      'sobrancelha',
      'pezinho'
    );
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'price_cents'
  ) then
    update public.services
    set price_cents = case slug
      when 'corte-de-cabelo' then 3500
      when 'barba' then 3000
      when 'combo-completo' then 6000
      when 'sobrancelha' then 1000
      when 'pezinho' then 1000
      else price_cents
    end
    where slug in (
      'corte-de-cabelo',
      'barba',
      'combo-completo',
      'sobrancelha',
      'pezinho'
    );
  end if;
end $$;

create table if not exists public.business_hours (
  weekday integer primary key check (weekday between 0 and 6),
  opens_at text not null default '09:00',
  closes_at text not null default '18:00',
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_hours
  add column if not exists weekday integer,
  add column if not exists opens_at text not null default '09:00',
  add column if not exists closes_at text not null default '18:00',
  add column if not exists is_closed boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

delete from public.business_hours duplicated
using public.business_hours kept
where duplicated.weekday = kept.weekday
  and duplicated.ctid > kept.ctid;

create unique index if not exists business_hours_weekday_unique_idx
  on public.business_hours (weekday);

update public.business_hours
set
  opens_at = hour_seed.opens_at,
  closes_at = hour_seed.closes_at,
  is_closed = hour_seed.is_closed,
  updated_at = now()
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
where public.business_hours.weekday = hour_seed.weekday;

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

alter table public.blocked_periods
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists reason text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_phone text,
  customer_email text,
  notes text,
  status text not null default 'confirmed',
  service_id uuid,
  service_name_snapshot text,
  service_slug_snapshot text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'America/Sao_Paulo',
  service_duration_minutes integer not null default 40,
  buffer_before_minutes integer not null default 0,
  buffer_after_minutes integer not null default 0,
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appointments
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
set
  status = coalesce(status, 'confirmed'),
  timezone = coalesce(timezone, 'America/Sao_Paulo'),
  service_duration_minutes = coalesce(service_duration_minutes, 40),
  buffer_before_minutes = coalesce(buffer_before_minutes, 0),
  buffer_after_minutes = coalesce(buffer_after_minutes, 0),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

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

delete from public.business_day_overrides duplicated
using public.business_day_overrides kept
where duplicated.date = kept.date
  and duplicated.ctid > kept.ctid;

create index if not exists business_day_overrides_date_idx
  on public.business_day_overrides (date);

create unique index if not exists business_day_overrides_date_unique_idx
  on public.business_day_overrides (date);

notify pgrst, 'reload schema';
