# Agendamento Profissional

Esta implementacao prepara o projeto para substituir o Calendly por um fluxo nativo com:

- `Next.js App Router`
- `Supabase Postgres`
- `Google Calendar`
- deploy no `Netlify`

## Arquitetura

### Frontend

- Rota principal de agendamento: [web/app/agendar/page.tsx](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/web/app/agendar/page.tsx)
- Experiencia interativa: [web/components/booking/BookingExperience.tsx](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/web/components/booking/BookingExperience.tsx)

### Backend

- Disponibilidade: [web/app/api/availability/route.ts](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/web/app/api/availability/route.ts)
- Criacao de agendamento: [web/app/api/appointments/route.ts](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/web/app/api/appointments/route.ts)

### Integracoes

- Supabase service role: [web/lib/supabase-admin.ts](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/web/lib/supabase-admin.ts)
- Google Calendar: [web/lib/google-calendar.ts](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/web/lib/google-calendar.ts)

### Banco

- Migracao inicial: [supabase/migrations/20260403_booking_core.sql](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/supabase/migrations/20260403_booking_core.sql)

## Regras atuais

- Escopo inicial: `1 barbeiro / 1 agenda principal`
- Fuso operacional padrao: `America/Sao_Paulo`
- Intervalo de slots: `15 minutos`
- Conflitos entre agendamentos confirmados sao bloqueados no banco com `exclusion constraint`
- A disponibilidade cruza:
  - servico e duracao
  - horario de funcionamento
  - bloqueios manuais
  - agendamentos ja existentes
  - eventos ocupados no Google Calendar

## Variaveis de ambiente

Use [web/.env.example](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/web/.env.example) como base.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `BOOKING_TIMEZONE`

## Proximo setup

1. Criar o projeto no Supabase.
2. Executar a migracao SQL inicial.
3. Dar acesso da service account ao calendario do Google.
4. Cadastrar as variaveis no Netlify.
5. Fazer redeploy.

## Observacoes

- Se o Supabase ainda nao estiver configurado, o frontend usa um catalogo fallback de servicos e horario para a interface continuar funcional.
- A criacao real do agendamento exige `SUPABASE_SERVICE_ROLE_KEY`.
- Se o Google Calendar falhar, o agendamento fica salvo com status `pending_sync` para revisao operacional.
