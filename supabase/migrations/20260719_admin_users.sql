create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  role text not null check (role in ('barber', 'support')),
  password_hash text not null,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  session_version integer not null default 1 check (session_version > 0),
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_username_format_check
    check (username = lower(username) and username ~ '^[a-z0-9._-]{2,40}$')
);

alter table public.admin_users enable row level security;

comment on table public.admin_users is
  'Administrative panel credentials. Accessible only through the server service role.';

notify pgrst, 'reload schema';
