# Setup Asaas

Este projeto agora tem um MVP de cobrança recorrente com Asaas Checkout.

## O que foi implementado

- Página de planos: [web/app/clube/page.tsx](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/web/app/clube/page.tsx)
- Sucesso do checkout: [web/app/clube/sucesso/page.tsx](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/web/app/clube/sucesso/page.tsx)
- Criação de checkout recorrente: [web/app/api/asaas/checkout/route.ts](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/web/app/api/asaas/checkout/route.ts)
- Webhook do Asaas: [web/app/api/asaas/webhook/route.ts](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/web/app/api/asaas/webhook/route.ts)
- Migration do banco: [supabase/migrations/20260424_asaas_memberships.sql](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/supabase/migrations/20260424_asaas_memberships.sql)

## Como funciona

1. Cliente abre `/clube`.
2. Escolhe um plano mensal.
3. Preenche nome, e-mail, WhatsApp e CPF.
4. O site chama `POST /api/asaas/checkout`.
5. O backend cria um checkout recorrente no Asaas.
6. O cliente é redirecionado para o checkout seguro do Asaas.
7. O Asaas envia webhooks para `POST /api/asaas/webhook`.
8. O Supabase atualiza o status da assinatura.

## Variáveis no Netlify

Cadastre em `Site configuration > Environment variables`:

- `ASAAS_API_KEY`
  - chave da API do Asaas
- `ASAAS_ENVIRONMENT`
  - use `sandbox` para testes
  - use `production` em produção
- `ASAAS_WEBHOOK_TOKEN`
  - token forte configurado no webhook do Asaas
  - precisa ter entre 32 e 255 caracteres
- `NEXT_PUBLIC_SITE_URL`
  - URL pública do site
  - exemplo: `https://pedro-lucas-barber.netlify.app`

As variáveis do Supabase continuam obrigatórias:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Como configurar no Asaas

1. Acesse o painel do Asaas.
2. Gere uma API key em `Integrações > Chaves de API`.
3. Em Sandbox, use a API key do Sandbox e `ASAAS_ENVIRONMENT=sandbox`.
4. Em produção, use a API key de produção e `ASAAS_ENVIRONMENT=production`.
5. Crie um webhook em `Integrações > Webhooks`.
6. URL do webhook:

```text
https://SEU-DOMINIO/api/asaas/webhook
```

7. Configure o mesmo token em:

```text
ASAAS_WEBHOOK_TOKEN
```

8. Selecione os eventos:

- `CHECKOUT_CREATED`
- `CHECKOUT_CANCELED`
- `CHECKOUT_EXPIRED`
- `CHECKOUT_PAID`
- `SUBSCRIPTION_CREATED`
- `SUBSCRIPTION_UPDATED`
- `SUBSCRIPTION_INACTIVATED`
- `SUBSCRIPTION_DELETED`
- `PAYMENT_CONFIRMED`
- `PAYMENT_RECEIVED`
- `PAYMENT_OVERDUE`
- `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`
- `PAYMENT_REPROVED_BY_RISK_ANALYSIS`
- `PAYMENT_DELETED`
- `PAYMENT_REFUNDED`

## Como rodar a migration

No Supabase SQL Editor, execute:

```text
supabase/migrations/20260424_asaas_memberships.sql
```

Ela cria:

- `subscription_plans`
- `memberships`
- `asaas_webhook_events`

Também insere planos iniciais:

- `Corte Mensal`
- `Barba Mensal`
- `Clube Completo`

## Referências oficiais

- Asaas Checkout recorrente: https://docs.asaas.com/docs/checkout-com-assinatura-recorrente
- Link do checkout: https://docs.asaas.com/docs/link-do-checkout-e-redirecionamento-do-cliente
- Autenticação: https://docs.asaas.com/docs/authentication-2
- Webhooks: https://docs.asaas.com/docs/create-new-webhook-via-web-application
- Eventos de pagamento: https://docs.asaas.com/docs/payment-events
- Eventos de assinatura: https://docs.asaas.com/docs/subscription-events
- Eventos de checkout: https://docs.asaas.com/docs/checkout-events
