alter table public.appointments
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text;

comment on column public.appointments.cancelled_at is
  'Timestamp when an administrative user cancelled the appointment.';

comment on column public.appointments.cancelled_by is
  'Username of the administrative user who cancelled the appointment.';

notify pgrst, 'reload schema';
