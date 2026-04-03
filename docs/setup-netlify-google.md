# Netlify e Google Cloud

Este guia concentra exatamente o que precisa ser cadastrado para o agendamento profissional funcionar.

## Variáveis no Netlify

No painel do Netlify:

1. Abra o site.
2. Entre em `Site configuration`.
3. Abra `Environment variables`.
4. Cadastre estas chaves:

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
  - valor: `Project URL` do Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - valor: `anon public key` do Supabase
- `SUPABASE_SERVICE_ROLE_KEY`
  - valor: `service_role secret` do Supabase

### Google Calendar

- `GOOGLE_CALENDAR_ID`
  - valor: id do calendário que vai receber os agendamentos
  - exemplo: `pedrolucasbarbearia@gmail.com` ou o id do calendário compartilhado
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - valor: e-mail da service account criada no Google Cloud
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
  - valor: chave privada da service account
  - no Netlify, cole a chave completa mantendo as quebras de linha

### Operação

- `BOOKING_TIMEZONE`
  - valor recomendado: `America/Sao_Paulo`

## Como criar a service account no Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/).
2. Crie ou selecione um projeto.
3. Ative a `Google Calendar API`.
4. Abra `IAM & Admin > Service Accounts`.
5. Clique em `Create service account`.
6. Dê um nome como `pedro-lucas-booking`.
7. Finalize a criação.
8. Entre na service account criada.
9. Abra a aba `Keys`.
10. Clique em `Add key > Create new key > JSON`.
11. Baixe o arquivo JSON.

Do JSON, você vai usar:

- `client_email` -> `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` -> `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

## Como ligar a service account ao calendário

1. Abra o Google Calendar com a conta que possui a agenda operacional.
2. Entre em `Configurações e compartilhamento` do calendário desejado.
3. Em `Compartilhar com pessoas e grupos`, adicione o `client_email` da service account.
4. Dê permissão de `Fazer alterações em eventos`.
5. Copie o `Calendar ID` desse calendário e use em `GOOGLE_CALENDAR_ID`.

## Depois de cadastrar tudo

1. Salve as variáveis no Netlify.
2. Rode `Clear cache and deploy site`.
3. Teste:
   - abrir `/agendar`
   - consultar disponibilidade
   - criar um agendamento
   - verificar se o evento entrou no Google Calendar

## Referência rápida dos valores

- Supabase `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
- Supabase `anon public key` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase `service_role secret` -> `SUPABASE_SERVICE_ROLE_KEY`
- Google service account `client_email` -> `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- Google service account `private_key` -> `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- Google Calendar `Calendar ID` -> `GOOGLE_CALENDAR_ID`
