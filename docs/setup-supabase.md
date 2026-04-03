# Setup do Supabase

Este projeto já está preparado para usar o Supabase como banco principal do agendamento.

## O que eu já deixei pronto

- Migração inicial: [supabase/migrations/20260403_booking_core.sql](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/supabase/migrations/20260403_booking_core.sql)
- Exemplo de variáveis: [web/.env.example](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/web/.env.example)
- Integração server-side: [web/lib/supabase-admin.ts](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/web/lib/supabase-admin.ts)

## Como criar o projeto

1. Acesse [Supabase](https://supabase.com/dashboard/projects).
2. Clique em `New project`.
3. Defina nome, senha do banco e região.
4. Espere o projeto ficar pronto.

## Como obter as credenciais

No painel do projeto:

1. Abra `Project Settings`.
2. Entre em `Data API`.
3. Copie:
   - `Project URL`
   - `anon public key`
   - `service_role secret`

Esses valores alimentam:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Como executar a migration

### Opção rápida pelo SQL Editor

1. Abra `SQL Editor` no Supabase.
2. Crie uma nova query.
3. Cole o conteúdo de [supabase/migrations/20260403_booking_core.sql](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/supabase/migrations/20260403_booking_core.sql).
4. Execute.

### Resultado esperado

As tabelas abaixo devem existir:

- `services`
- `business_hours`
- `blocked_periods`
- `appointments`

E os serviços iniciais devem ser inseridos:

- Corte de Cabelo
- Barba
- Combo Completo
- Sobrancelha
- Pezinho

## Validação manual

Depois da migration:

1. Abra `Table Editor`.
2. Confirme as tabelas criadas.
3. Verifique se `services` e `business_hours` vieram preenchidas.

## Observação importante

Eu não consegui executar essa migration no seu projeto Supabase daqui porque ainda não tenho acesso às credenciais da sua conta/projeto. A base SQL está pronta e revisada, mas a execução remota depende desse acesso.
