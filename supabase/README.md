# Supabase — Iter OS

Este diretório versiona, pela primeira vez, o histórico real de schema do
projeto Supabase do Iter OS (projeto `Iter OS`, ref `scchivyltudzbjbsveva`,
org `woygpanhwdgpkikyzxrt`), além de fixtures de teste e scripts de apoio.
Faz parte da Fase 0 (preparação segura) do roadmap de estabilização.

## Estrutura

```
supabase/
  config.toml                        # aponta o seed de dev para seed-test-fixtures.sql
  migrations/                        # histórico real, extraído de supabase_migrations.schema_migrations
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
2. `20260727161812_seed_iteros_initial_data` — seed inicial (usuário admin real, dashboard cards, app_settings).
3. `20260727161907_fix_app_settings_slogans` — ajuste de texto.
4. `20260804135226_fix_delete_behavior_on_fks` — comportamento de FK em exclusões.
5. `20260804221222_enable_realtime_on_all_tables` — Realtime nas 11 tabelas base.
6. `20260806013959_add_client_billing_type` — colunas `billing_type`/`commission_percentage`.
7. `20260811142647_add_delivery_control` — tabelas de Controle de Entregas.

**Redação de segredo (importante):** a migration #2, tal como aplicada em
produção, insere a senha real em texto plano do usuário administrador
verdadeiro (`daniel@itermidia.com.br`). O arquivo versionado neste repositório
substitui esse valor por `__REDACTED_SET_MANUALLY__` — **nunca** o valor real.
Isso é necessário porque este repositório agora é compartilhado (inclusive com
o Codex, conectado à mesma branch). Quem precisar recriar o schema do zero
localmente deve definir a senha desse usuário manualmente depois de rodar as
migrations. Isso não é uma perda de funcionalidade: `users.password` em texto
plano é a vulnerabilidade crítica nº 1 já reportada e será eliminada na
migração para Supabase Auth (Fase 1+), então nenhuma automação deveria
depender desse valor de qualquer forma.

## Fixtures de teste (`seed-test-fixtures.sql`)

Todos os dados são fictícios, prefixados com `seed_`: 3 usuários
(`seed_admin`, `seed_operacional_restrito`, `seed_financeiro` — um por
papel/nível de acesso relevante), 2 clientes (`Cliente Teste A`, `Cliente
Teste B`), e ao menos uma linha em cada tabela protegida (projetos, tarefas,
eventos de calendário, lançamentos financeiros, leads, itens de conteúdo,
arquivos, itens de plano de entrega e unidades de entrega). Servem para
exercitar RLS e permissões por papel sem tocar em dado real.

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

Nele foram aplicadas, em ordem, as 7 migrations acima e, na sequência, todo o
`seed-test-fixtures.sql` — com uma única e deliberada divergência: **a
migration #2 foi aplicada sem o `insert` do usuário administrador real**
(nome e e-mail de `daniel@itermidia.com.br`), mantendo apenas os inserts de
`dashboard_cards`/`app_settings` (dados de configuração, não pessoais). Isso
segue a instrução explícita de que nenhum dado real de produção — nem mesmo
nome/e-mail — deveria existir no staging. O usuário admin usado para testar
no staging é o `seed_admin` fictício.

Validação pós-aplicação: `list_tables` confirma as mesmas 13 tabelas da
produção, todas com RLS habilitada, com as contagens de linha esperadas dos
fixtures (nenhuma tabela vazia inesperadamente, nenhuma linha a mais).
`get_advisors` (security) retornou `{"lints":[]}`, igual à produção.
Produção não foi tocada em nenhum momento deste processo.

Esse projeto staging é o ambiente a usar a partir da Fase 1 para testar
schema, RLS e a migração para Supabase Auth com segurança, sem risco à
produção.

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

Cria identidades reais em `auth.users` para os 3 usuários fictícios e as
vincula via `public.users.auth_user_id`. Essa coluna **não existe** no schema
atual — só é criada na Fase 1, quando a migração para Supabase Auth começa.
Rodar este script hoje falharia de propósito na etapa de vínculo. Está aqui
apenas como próximo passo já desenhado e documentado.

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
