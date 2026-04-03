# Netlify

Este projeto esta preparado para deploy no Netlify a partir do app em `web/`.

## Como ficou configurado

Arquivo de configuracao: [netlify.toml](/C:/Users/joato/Downloads/Pedro%20Lucas%20Barber/netlify.toml)

Configuracao aplicada:

- Base directory: `web`
- Build command: `npm run build`
- Publish directory: `.next`
- Node.js: `20`

## Como conectar no Netlify

1. Acesse o painel do Netlify e escolha **Add new project**.
2. Conecte o repositrio `jonathanatss/pedro-lucas-barber`.
3. Se o Netlify detectar monorepo, selecione o app em `web`.
4. Se precisar configurar manualmente, use:
   - Base directory: `web`
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Confirme que a branch de producao sera `main`.
6. Salve e rode o primeiro deploy.

## Observacoes

- A home do app em Next.js atualmente redireciona para `/legacy/index.html`, entao o deploy preserva a landing completa enquanto a migracao por secoes continua.
- O projeto ainda nao usa variaveis de ambiente obrigatorias para build.
- Se no futuro entrarmos com servicos externos, analytics ou APIs privadas, vale cadastrar as chaves em **Site configuration > Environment variables** no Netlify.

## Referencias

- Netlify Docs: Next.js on Netlify
- Netlify Docs: Monorepos
