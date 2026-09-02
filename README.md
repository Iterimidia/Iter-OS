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

## Testes

```bash
npm test          # Vitest — unitários/integração, mocka o Supabase, roda em segundos
npm run test:watch
npm run test:e2e  # Playwright — contra o Iter OS Staging real, exige credenciais (ver .env.e2e.example)
```

- **Unitários/integração** (`src/**/*.test.ts(x)`): `src/lib/permissions.ts` (regras de acesso), `src/data/store.ts` (integridade de mutations, reconciliação de Delivery Units), `src/features/auth/useAuth.ts` e `src/app/guards.tsx` (login, sessão, bloqueio de conta inativa/sem perfil). Nunca tocam rede real — `@/lib/supabaseClient` é mockado (`src/test/supabaseMock.ts`).
- **E2E** (`e2e/*.spec.ts`): fluxos completos em navegador contra o staging real. Precisa de `E2E_BASE_URL` + credenciais dos perfis de teste fictícios (`E2E_ADMIN_*`, `E2E_FINANCEIRO_*`, `E2E_INATIVO_*`) como variáveis de ambiente — nunca commitadas. Roda fora do CI de toda PR (ver `.github/workflows/e2e.yml`, disparo manual).

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
