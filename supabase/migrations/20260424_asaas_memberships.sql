create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  price_cents integer not null check (price_cents > 0),
  currency text not null default 'BRL',
  cycle text not null default 'MONTHLY' check (
    cycle in (
      'WEEKLY',
      'BIWEEKLY',
      'MONTHLY',
      'BIMONTHLY',
      'QUARTERLY',
      'SEMIANNUALLY',
      'YEARLY'
    )
  ),
  benefits text[] not null default '{}',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  external_reference text not null unique,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  plan_slug_snapshot text not null,
  plan_name_snapshot text not null,
  plan_price_cents_snapshot integer not null,
  plan_cycle_snapshot text not null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  customer_cpf_cnpj text,
  status text not null default 'checkout_created' check (
    status in (
      'checkout_created',
      'checkout_paid',
      'active',
      'past_due',
      'payment_failed',
      'expired',
      'canceled',
      'deleted'
    )
  ),
  asaas_checkout_id text,
  asaas_checkout_url text,
  asaas_customer_id text,
  asaas_subscription_id text,
  last_payment_id text,
  last_payment_status text,
  next_due_date date,
  raw_checkout jsonb,
  raw_subscription jsonb,
  raw_payment jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memberships_plan_id_idx
  on public.memberships(plan_id);

create index if not exists memberships_status_idx
  on public.memberships(status);

create index if not exists memberships_asaas_checkout_id_idx
  on public.memberships(asaas_checkout_id);

create index if not exists memberships_asaas_customer_id_idx
  on public.memberships(asaas_customer_id);

create index if not exists memberships_asaas_subscription_id_idx
  on public.memberships(asaas_subscription_id);

create table if not exists public.asaas_webhook_events (
  id uuid primary key default gen_random_uuid(),
  asaas_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

insert into public.subscription_plans (
  slug,
  name,
  description,
  price_cents,
  cycle,
  benefits,
  sort_order,
  active
)
values
  (
    'corte-mensal',
    'Corte Mensal',
    'Um corte por mês com agendamento online e benefício exclusivo para cliente recorrente.',
    6990,
    'MONTHLY',
    array['1 corte por mês', 'Agendamento online', 'Prioridade em encaixes'],
    1,
    true
  ),
  (
    'barba-mensal',
    'Barba Mensal',
    'Manutenção mensal da barba com cobrança automática no cartão.',
    5990,
    'MONTHLY',
    array['1 barba por mês', 'Produtos profissionais', 'Agendamento online'],
    2,
    true
  ),
  (
    'combo-clube',
    'Clube Completo',
    'Plano mensal para manter corte e barba em dia com experiência completa.',
    9990,
    'MONTHLY',
    array['1 combo corte + barba por mês', 'Prioridade na agenda', 'Atendimento completo'],
    3,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents,
  cycle = excluded.cycle,
  benefits = excluded.benefits,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();
