create extension if not exists btree_gist;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  duration_minutes integer not null check (duration_minutes > 0),
  buffer_before_minutes integer not null default 0 check (buffer_before_minutes >= 0),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes >= 0),
  price_label text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_hours (
  weekday integer primary key check (weekday between 0 and 6),
  opens_at text not null,
  closes_at text not null,
  is_closed boolean not null default false
);

create table if not exists public.blocked_periods (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  notes text,
  status text not null default 'confirmed' check (status in ('confirmed', 'pending_sync', 'cancelled')),
  service_id uuid references public.services(id) on delete set null,
  service_name_snapshot text not null,
  service_slug_snapshot text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Sao_Paulo',
  service_duration_minutes integer not null,
  buffer_before_minutes integer not null default 0,
  buffer_after_minutes integer not null default 0,
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

alter table public.appointments
  drop constraint if exists appointments_no_overlap;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    tstzrange(
      starts_at - make_interval(mins => buffer_before_minutes),
      ends_at,
      '[)'
    ) with &&
  )
  where (status in ('confirmed', 'pending_sync'));

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
values
  ('corte-de-cabelo', 'Corte de Cabelo', 'Corte personalizado com acabamento impecável, lavagem e finalização profissional.', 40, 0, 5, 'R$ 35', 1, true),
  ('barba', 'Barba', 'Design, aparagem e hidratação da barba com navalha quente e produtos premium.', 30, 0, 5, 'R$ 30', 2, true),
  ('combo-completo', 'Combo Completo', 'Corte + barba com todo o cuidado que você merece. O combo mais pedido da casa.', 70, 0, 10, 'R$ 60', 3, true),
  ('sobrancelha', 'Sobrancelha', 'Design e alinhamento de sobrancelha com navalha para um acabamento preciso.', 10, 0, 5, 'R$ 10', 4, true),
  ('pezinho', 'Pezinho', 'Acabamento da nuca e contorno inferior do corte para um resultado mais limpo e definido.', 10, 0, 5, 'R$ 10', 5, true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  duration_minutes = excluded.duration_minutes,
  buffer_before_minutes = excluded.buffer_before_minutes,
  buffer_after_minutes = excluded.buffer_after_minutes,
  price_label = excluded.price_label,
  sort_order = excluded.sort_order,
  active = excluded.active;

insert into public.business_hours (weekday, opens_at, closes_at, is_closed)
values
  (0, '09:00', '18:00', true),
  (1, '09:00', '18:00', false),
  (2, '09:00', '18:00', false),
  (3, '09:00', '18:00', false),
  (4, '09:00', '18:00', false),
  (5, '09:00', '18:00', false),
  (6, '09:00', '18:00', false)
on conflict (weekday) do update
set
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  is_closed = excluded.is_closed;
