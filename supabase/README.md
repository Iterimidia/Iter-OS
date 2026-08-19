# Supabase — Iter OS

Este diretório versiona, pela primeira vez, o histórico real de schema do
projeto Supabase do Iter OS (projeto `Iter OS`, ref `scchivyltudzbjbsveva`,
org `woygpanhwdgpkikyzxrt`), além de fixtures de teste e scripts de apoio.
Faz parte da Fase 0 (preparação segura) do roadmap de estabilização.

## Estrutura

```
supabase/
  config.toml                        # aponta o seed de dev para seed-test-fixtures.sql
  migrations/                        # histórico real, extraído de supabase_migrations.schema_migrations — sem PII
  production-only/                   # registro histórico anonimizado; nenhum script lê esta pasta
  seed-test-fixtures.sql             # dados 100% fictícios para dev/QA (usuários, clientes, etc.)
  scripts/
    backup-export.mjs                # export manual de backup (produção), já executado uma vez nesta fase
    seed-auth-test-users.mjs         # Fase 1/2 — NÃO EXECUTAR AINDA (depende de auth_user_id)
```

## Migrations

Os 7 arquivos em `migrations/` são a transcrição exata das migrations que o
Supabase já vinha rastreando internamente (visível via `list_migrations` /
`supabase_migrations.schema_migrations`), na ordem em que foram aplicadas
em produção:

1. `20260727161609_create_iteros_core_schema` — schema inicial das 11 tabelas base + RLS `allow_all`.
2. `20260727161812_seed_iteros_initial_data` — seed inicial (dashboard cards, app_settings). **Não cria mais usuário administrador** — ver nota abaixo.
3. `20260727161907_fix_app_settings_slogans` — ajuste de texto.
4. `20260804135226_fix_delete_behavior_on_fks` — comportamento de FK em exclusões.
5. `20260804221222_enable_realtime_on_all_tables` — Realtime nas 11 tabelas base.
6. `20260806013959_add_client_billing_type` — colunas `billing_type`/`commission_percentage`.
7. `20260811142647_add_delivery_control` — tabelas de Controle de Entregas.

**Sem PII (importante):** a migration #2, tal como aplicada em produção,
inseria também o usuário administrador real (identidade pessoal completa:
nome, e-mail, senha em texto plano). Esse insert foi retirado deste arquivo
e movido para `supabase/production-only/20260727161812_admin_user_bootstrap.sql`
— um registro histórico totalmente anonimizado (todo campo de identidade
substituído por placeholder explícito, ex: `__PRODUCTION_ADMIN_EMAIL_REDACTED__`),
que nenhum script ou bootstrap automatizado lê. Nenhum dado pessoal real —
nome, e-mail ou senha — existe em nenhum arquivo deste diretório. A migration
#2 como está versionada aqui é, hoje, 100% segura para rodar em qualquer
ambiente novo (staging, local, CI) sem gerar nenhuma linha de identidade
real.

## Fixtures de teste (`seed-test-fixtures.sql`)

Todos os dados são fictícios, prefixados com `seed_`: 4 usuários
(`seed_admin`, `seed_operacional_restrito`, `seed_financeiro` — um por
papel/nível de acesso relevante — e `seed_usuario_inativo`, caso negativo
puro de login), 2 clientes (`Cliente Teste A`, `Cliente Teste B` — o segundo
deliberadamente fora do `allowed_client_ids` do usuário restrito, caso
negativo de acesso por cliente), e ao menos uma linha em cada tabela
protegida (projetos, tarefas, eventos de calendário, lançamentos
financeiros, leads, itens de conteúdo, arquivos, itens de plano de entrega e
unidades de entrega). Servem para exercitar RLS e permissões por papel — nos
casos permitidos e negados — sem tocar em dado real.

As senhas desses usuários fictícios (`FIXTURE_SENHA_FAKE_*`) são placeholders
óbvios pelo mesmo motivo da migration #2: a coluna ainda é texto plano e
obrigatória no schema atual.

**Reprodução local:** com a Supabase CLI instalada e o projeto linkado,
`supabase db reset` aplicaria as 7 migrations e, em seguida, o seed
automaticamente (via `[db.seed]` em `config.toml`).

## Ambiente isolado: projeto `Iter OS Staging` (em vez de branches)

O plano original previa um branch de desenvolvimento Supabase isolado. Ao
tentar criar o branch, a API retornou:

```
PaymentRequiredException: Branching is supported only on the Pro plan or above
```

A organização está no plano **Free**, que não inclui branches, e a decisão
(aprovada) foi **não** fazer upgrade para o Pro agora. Em vez disso, criamos
um segundo projeto Supabase, também no plano Free (dentro do limite de 2
projetos gratuitos por organização, sem custo e sem necessidade de cartão):

- **Nome:** `Iter OS Staging`
- **Ref/project_id:** `nbsezkskzizxtffhdeer`
- **Organização:** `woygpanhwdgpkikyzxrt` (mesma da produção)
- **Região:** `sa-east-1` (mesma da produção)
- **Custo:** $0/mês (confirmado via `get_cost` antes da criação)

Nele foram aplicadas, em ordem, as 7 migrations de `migrations/` e, na
sequência, todo o `seed-test-fixtures.sql` — **sem nenhuma divergência
manual**: como a migration #2 já não contém o insert do usuário
administrador real (movido para `production-only/`, ver seção acima), o
conteúdo de `migrations/` é aplicado exatamente como está versionado, sem
precisar pular ou reescrever nada na hora. O usuário admin usado para testar
no staging é o `seed_admin` fictício. Nenhum dado real de produção — nem
nome, nem e-mail, nem qualquer identidade pessoal — existe no staging.

**Reprodutibilidade comprovada:** o schema `public` do staging foi
completamente dropado e reconstruído do zero (`drop schema public cascade`
+ recriação), aplicando só o que está no repositório, sem nenhuma
intervenção manual. Resultado: as mesmas 13 tabelas da produção, todas com
RLS habilitada, contagens de linha batendo exatamente com o esperado do
seed (4 usuários — incluindo o caso negativo `seed_usuario_inativo` — 2
clientes com os dois valores válidos de `billing_type`, etc.). `get_advisors`
(security) retornou `{"lints":[]}`. Produção não foi tocada em nenhum
momento deste processo.

O `Iter OS Staging` é o ambiente onde desenvolvimento e qualquer mudança
administrativa/de schema devem acontecer a partir de agora — produção só
deve ser alterada depois de validado no staging.

## Backup manual e ausência de PITR

A organização está no plano Free, que **não inclui Point-in-Time Recovery
(PITR)**. Isso significa que, hoje, não existe recuperação automática para um
erro de escrita ou exclusão em massa em produção — o único mecanismo de
recuperação é um backup manual recente.

`scripts/backup-export.mjs` foi criado para isso: exporta todas as tabelas
protegidas para JSON, excluindo deliberadamente a coluna `users.password`.
Ele já foi executado uma vez nesta fase (via uma query equivalente, direto
pelas ferramentas de MCP do Supabase, já que o script em si depende de
`SUPABASE_SERVICE_ROLE_KEY`, que não deve ficar exportada neste ambiente).
Resultado do snapshot (estado real de produção em 2026-08-19):

| Tabela | Linhas |
|---|---|
| users (sem password) | 4 |
| clients | 8 |
| financial_entries | 15 |
| delivery_plan_items | 17 |
| delivery_units | 293 |
| dashboard_cards | 27 |
| app_settings | 1 |
| projects, tasks, calendar_events, leads, content_items, files | 0 |

Esse snapshot foi entregue diretamente (fora do git, fora do sandbox
temporário) para armazenamento privado e durável por conta própria — não
ficou salvo neste repositório, já que contém dados reais de
clientes/financeiro.

**Rotina recorrente — deliberadamente adiada, não bloqueia a Fase 0:** o
mecanismo (`backup-export.mjs`) está pronto e funcional, mas configurar sua
execução recorrente (agendamento local, variável de ambiente com a
`service_role key`, destino de armazenamento) fica para depois, por decisão
explícita. Recomendação, quando for montar isso: rodar a partir de uma
máquina com armazenamento persistente (nunca deste sandbox), salvando a
saída em um local com controle de acesso (ex: pasta local sincronizada com
Google Drive/iCloud privado) — nunca no repositório git, já que os dados são
reais.

## `scripts/seed-auth-test-users.mjs` — não executar ainda

Cria identidades reais em `auth.users` para os 4 usuários fictícios e as
vincula via `public.users.auth_user_id`. Essa coluna **não existe** no schema
atual — só é criada na Fase 1, quando a migração para Supabase Auth começa.
O script faz *preflight* antes de criar qualquer usuário: confirma que
`public.users.auth_user_id` existe e que a Admin API responde; como a coluna
ainda não existe, o preflight falha de propósito e o script para antes de
tocar em `auth.users` — nenhuma identidade é criada, mesmo que alguém rode
o script hoje por engano. Também recusa explicitamente o project ref de
produção e só aceita o project ref de staging conhecido. Está aqui apenas
como próximo passo já desenhado, testado (recusa/preflight) e documentado.

## SMTP (envio de e-mail de convite) — status não confirmado

A Fase 1 prevê convidar usuários reais por e-mail (não senhas definidas pelo
admin). Isso depende de SMTP configurado no projeto Supabase (custom SMTP ou
o padrão, com limite baixo de envios). **Não confirmei esse status nesta
fase** — nenhum convite real foi enviado. Antes de iniciar a Fase 1, verificar
manualmente em Project Settings → Auth → SMTP Settings se há um provedor
configurado; caso contrário, e-mails de convite podem não ser entregues ou
esbarrar no limite baixíssimo do SMTP padrão do Supabase.

## Princípio de teste para as próximas fases

**Nenhum dado privado do Iter OS pode ser carregado antes de a sessão
Supabase Auth estar resolvida e validada.** Ou seja: qualquer tela que hoje
busca dados assim que a store inicializa precisa, a partir da Fase 1/2,
aguardar uma sessão de `auth.getSession()`/`onAuthStateChange` válida e
confirmada contra `public.users` (usuário ativo, papel resolvido) antes de
disparar qualquer `select` em tabelas protegidas. Isso vale tanto para o
carregamento inicial quanto para qualquer subscription Realtime.

## Estado confirmado nesta fase (Fase 0)

- `get_advisors` (security): `{"lints":[]}` — nenhum alerta automático do
  Supabase (não confundir com as vulnerabilidades já conhecidas e reportadas
  separadamente: RLS `allow_all` e `users.password` em texto plano, que são
  decisões de design da Fase 0→1, não lints).
- Nenhuma migration, RLS, dado de produção ou código de login foi alterado
  nesta fase. Todo o trabalho ficou restrito a este diretório `supabase/`.
