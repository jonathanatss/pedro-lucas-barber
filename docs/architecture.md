# Arquitetura do Projeto (Fase 1 -> Fase 2)

## Objetivo
Evoluir a landing page estática para uma arquitetura profissional com baixo risco, em duas fases:

1. **Fase 1 (atual):** organizar o código atual (HTML/CSS/JS) para melhorar manutenção.
2. **Fase 2 (próxima):** migrar para Next.js + TypeScript com estrutura por domínio.

## Fase 1 aplicada

### Estrutura criada
- `index.html` (entrada atual da landing)
- `assets/css/main.css` (estilos extraídos do HTML)
- `assets/js/main.js` (scripts extraídos do HTML)
- `content/site-config.json` (dados de negócio centralizados)
- `docs/architecture.md` (este documento)

### Benefícios imediatos
- Separação de responsabilidades (markup, estilo e comportamento).
- Melhor dif para versionamento e revisão.
- Base para reaproveitar conteúdo na migração para framework.

## Fase 2 proposta (Next.js)

### Stack
- Next.js (App Router)
- TypeScript
- ESLint + Prettier
- Testes: Vitest + Playwright

### Estrutura alvo
- `app/` rotas e layout
- `features/` módulos de negócio (agendamento, clube mensal, serviços, avaliações)
- `components/` UI reutilizável
- `lib/` integrações (analytics, WhatsApp, Supabase, Google Calendar, Asaas)
- `content/` dados de conteúdo e copy
- `styles/` tokens globais

### Plano de migração incremental
1. Criar app Next.js em pasta paralela (`web/`) sem interromper a landing atual.
2. Migrar layout base e header/footer.
3. Migrar seções por prioridade: hero -> serviços -> agendamento -> FAQ.
4. Mover conteúdo para objetos tipados (`content/*.ts` ou CMS).
5. Ativar testes e CI.
6. Fazer cutover final de deploy.

## Módulos já iniciados
- `web/app/agendar`: experiência nativa de agendamento.
- `web/app/api/availability`: consulta de horários disponíveis.
- `web/app/api/appointments`: criação de agendamentos.
- `web/app/clube`: planos mensais com checkout recorrente Asaas.
- `web/app/api/asaas`: criação de checkout e recebimento de webhooks.
- `web/lib/booking`: regras de negócio do agendamento.
- `web/lib/asaas`: integração server-side com Asaas.
- `supabase/migrations`: schema versionado do banco.

## Regras de manutenção
- Conteúdo institucional deve ficar fora dos componentes sempre que possível.
- Componentes visuais não devem carregar lógica de integração externa.
- Toda integração externa deve passar por `lib/`.
- Mudanças de contato/horário/preço devem partir de `content/`.
