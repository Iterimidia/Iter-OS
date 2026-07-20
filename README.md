# Iter OS

Sistema Operacional Interno da **Iter Mídia** — esqueleto funcional para organizar direção, comercial, clientes, operação, criação, tarefas, calendário e financeiro gerencial em um único lugar.

Este é o v1: arquitetura, navegação, permissões e lógica de negócio reais, com dados mockados em `localStorage` (preparado para trocar por Supabase depois sem reescrever telas).

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (tokens de marca centralizados em `src/lib/theme.ts` e `src/styles/globals.css`)
- Zustand (+ `persist`) como camada de dados
- React Router v6

## Rodando localmente

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # build de produção em dist/
npm run typecheck
```

## Login de demonstração

Qualquer e-mail abaixo, senha **`iter123`** para todos (mock — ver `src/features/auth/useAuth.ts`):

| E-mail | Perfil |
|---|---|
| daniel@itermidia.com.br | Admin (vê as 3 bases) |
| raylhane@itermidia.com.br | Gestão Criativa |
| ester@itermidia.com.br / melissa@itermidia.com.br | Criativo |
| conselho@itermidia.com.br | Conselho |
| pedro@itermidia.com.br | Operacional |
| camila@itermidia.com.br | Financeiro |

A tela de login também lista essas contas com um clique para preencher.

## Estrutura

```
src/
  app/            router, guards de autenticação/permissão
  components/     ui/ layout/ dashboard/ calendar/ cards/ tables/ forms/ reports/ files/
  features/       auth/ base-select/ general/ operational/ creative/ reports/
  data/           mockData.ts (seed) + store.ts (Zustand, localStorage)
  lib/            permissions.ts, calendar.ts, navigation.ts, theme.ts, utils.ts
  types/          tipos de domínio compartilhados
```

## Como o sistema é organizado

Três **bases** (visões) sobre a mesma base de dados — não são apps separados:

- **Base Geral** — megadashboard consolidado, calendário, relatórios exportáveis, configuração de visibilidade.
- **Base Operacional** — direção, comercial, clientes, operação (projetos/tarefas/kanban), financeiro, equipe, arquivos, configurações.
- **Base Criativa** — painel, conteúdo, demandas (kanban), calendário, arquivos, aprovações.

Cada usuário só vê as bases/áreas/cards liberados para seu perfil (`src/lib/permissions.ts` é a única fonte de verdade — nenhuma tela decide visibilidade por conta própria). Admin edita essas regras em **Equipe** (por usuário) e **Visibilidade** (cards do Dashboard Geral por perfil).

Tarefas e peças de conteúdo com prazo aparecem automaticamente no calendário certo (`src/lib/calendar.ts` deriva os eventos a partir das próprias coleções — não há cópia para sincronizar).

## Preparado para depois

- **Supabase**: `src/data/store.ts` isola toda a persistência atrás de actions (`addTask`, `updateClient`, ...); trocar `localStorage` por chamadas Supabase não deveria exigir mudanças nos componentes.
- **Integrações** (Google Calendar, Drive, Gmail, WhatsApp, APIs sociais, IA): placeholders com status em Configurações → Integrações.
