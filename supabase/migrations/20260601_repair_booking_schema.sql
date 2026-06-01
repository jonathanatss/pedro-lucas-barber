create extension if not exists btree_gist;

alter table public.services
  add column if not exists buffer_before_minutes integer not null default 0,
  add column if not exists buffer_after_minutes integer not null default 0;

alter table public.appointments
  add column if not exists buffer_before_minutes integer not null default 0,
  add column if not exists buffer_after_minutes integer not null default 0;

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

notify pgrst, 'reload schema';
