update public.services
set
  buffer_after_minutes = 0,
  updated_at = now()
where slug in (
  'corte-de-cabelo',
  'barba',
  'combo-completo',
  'sobrancelha',
  'pezinho'
);

insert into public.business_hours (weekday, opens_at, closes_at, is_closed)
values
  (0, '09:00', '19:00', true),
  (1, '09:00', '19:00', false),
  (2, '09:00', '19:00', false),
  (3, '09:00', '19:00', false),
  (4, '09:00', '19:00', false),
  (5, '09:00', '19:00', false),
  (6, '09:00', '19:00', false)
on conflict (weekday) do update
set
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  is_closed = excluded.is_closed,
  updated_at = now();

delete from public.business_day_overrides
where date >= current_date
  and is_closed = false
  and coalesce(reason, '') ilike '%almo%';

notify pgrst, 'reload schema';
