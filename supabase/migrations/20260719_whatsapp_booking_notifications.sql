alter table public.appointments
  add column if not exists barber_whatsapp_status text not null default 'not_configured',
  add column if not exists barber_whatsapp_provider text,
  add column if not exists barber_whatsapp_message_id text,
  add column if not exists barber_whatsapp_notified_at timestamptz,
  add column if not exists barber_whatsapp_error text;

update public.appointments
set barber_whatsapp_status = coalesce(barber_whatsapp_status, 'not_configured');

alter table public.appointments
  drop constraint if exists appointments_barber_whatsapp_status_check;

alter table public.appointments
  add constraint appointments_barber_whatsapp_status_check
  check (barber_whatsapp_status in ('not_configured', 'sent', 'failed'));

notify pgrst, 'reload schema';
