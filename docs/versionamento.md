# Fluxo de Versionamento

## Branches
- `main`: estável, pronta para produção.
- `codex/feature-*`: novas funcionalidades.
- `codex/fix-*`: correções de bug.
- `codex/chore-*`: tarefas técnicas (refactor, docs, tooling).

## Como trabalhar
1. Atualize a `main` local:
   - `git checkout main`
   - `git pull origin main`
2. Crie uma branch de trabalho:
   - `git checkout -b codex/feature/nome-curto`
3. Faça commits pequenos e objetivos.
4. Suba a branch:
   - `git push -u origin codex/feature/nome-curto`
5. Abra PR para `main`.

## Padrão de commit (Conventional Commits)
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `refactor:` melhoria interna sem alterar comportamento esperado
- `style:` ajustes visuais/CSS
- `docs:` documentação
- `chore:` manutenção/configuração
- `test:` testes

Exemplos:
- `feat: adiciona seção de depoimentos`
- `fix: corrige link de agendamento no hero`
- `style: melhora responsividade da galeria`

## Checklist mínimo para PR
- Build e página funcionando localmente
- Sem segredos/chaves no código
- Mudança descrita de forma clara
- Prints ou vídeo curto para alterações visuais

## Regra prática
- Evite commits gigantes.
- Prefira PRs pequenos com objetivo único.
- Sempre rebase/sync com `main` antes de abrir PR.
