# Controle de Importação

Sistema web para gerenciar múltiplos contêineres de importação: produtos, pagamentos e custo por unidade no Brasil.

## Stack
- Node.js + Express
- Prisma + PostgreSQL
- Auth JWT (usuário único: `admin`)
- Frontend HTML/CSS/JS puro em `public/index.html`

## Rodar local

```bash
npm install
# criar .env a partir do .env.example e apontar DATABASE_URL para um Postgres local
npx prisma migrate dev --name init
npm start
```

Abrir http://localhost:3000 — login `admin` / `eilzo5050`.

## Deploy no Railway

1. Crie um projeto em https://railway.app e adicione um serviço **PostgreSQL**.
2. Adicione outro serviço a partir deste repositório (GitHub) ou via `railway up`.
3. No serviço da app, configure as variáveis de ambiente:
   - `DATABASE_URL` → copie do Postgres do Railway (variável `DATABASE_URL`).
   - `JWT_SECRET` → qualquer string longa aleatória.
   - `ADMIN_USER` = `admin`
   - `ADMIN_PASS` = `eilzo5050`
4. O `railway.json` já roda `prisma migrate deploy` e sobe o servidor.
5. Ative o domínio público e acesse.

## Estrutura

- `server.js` — API REST (auth + CRUD).
- `prisma/schema.prisma` — modelo `User`, `Container`, `Produto`, `Lancamento`.
- `public/index.html` — SPA com dashboard e painel de contêiner (Resumo / Produtos / Lançamentos / Custo por produto / Config).

## Notas
- Usuário admin é criado automaticamente na primeira inicialização.
- Custo por unidade no Brasil é **informado manualmente** em cada produto (sem rateio automático).
