-- Conteúdo 2.0 — Etapa 1: fundação de dados.
--
-- Escopo desta migration (aprovado com alterações sobre o Plano Técnico —
-- Conteúdo 2.0): apenas `content_items`. Nenhuma tabela nova é criada
-- (content_status_history foi descartada por decisão explícita: a
-- rastreabilidade desta fase fica nos metadados específicos abaixo, não em
-- um log genérico). Nenhuma RLS/policy muda — as 4 policies existentes de
-- content_items operam por linha e já cobrem as colunas novas.
--
-- `status` e `channels` usam text + CHECK em vez de tipos enum do Postgres:
-- alterar um CHECK é uma migration simples (ALTER TABLE ... DROP/ADD
-- CONSTRAINT), enquanto enum do Postgres não permite remover/renomear
-- valores sem recriar o tipo. Dado que workflow e canais devem ganhar
-- valores no futuro (decisão explícita do usuário), text+CHECK é a escolha
-- proporcional aqui — sem introduzir abstração além do necessário.
--
-- 0 linhas reais em content_items em produção no momento desta migration
-- (confirmado antes de aplicar) — por isso a troca do enum de status e a
-- remoção de internal_approval/client_approval não envolvem perda de dado.

-- 1) Colunas novas (todas nullable, aditivas).
alter table public.content_items
  add column reference_month text,
  add column channels text[],
  add column objective text,
  add column hook text,
  add column main_content text,
  add column cta text,
  add column executor_id text references public.users(id),
  add column creative_reviewer_id text references public.users(id),
  add column slides jsonb,
  add column scheduled_at timestamptz,
  add column actual_publish_date date,
  add column sent_for_approval_at timestamptz,
  add column approved_at timestamptz,
  add column adjustment_note text,
  add column blocked_reason text,
  add column blocked_note text,
  add column blocked_at timestamptz,
  add column updated_at timestamptz not null default now();

comment on column public.content_items.reference_month is 'Mês de referência editorial, formato YYYY-MM (mesma convenção de delivery_units.month).';
comment on column public.content_items.channels is 'Canais desta peça — ver CHECK content_items_channels_check para os valores aceitos.';
comment on column public.content_items.slides is 'Array ordenado de slides ({id, text}); populado só quando format = carrossel.';
comment on column public.content_items.scheduled_at is 'Quando o status mudou para programado — não é uma data-alvo, é o carimbo do evento.';

-- 2) Renomeações (seguras: 0 linhas reais em produção neste momento).
alter table public.content_items rename column due_date to internal_due_date;
alter table public.content_items rename column responsible_id to editorial_responsible_id;
alter table public.content_items rename column publish_date to planned_publish_date;

-- 3) Troca do enum de status (7 → 11 valores). Sem tipo enum de banco: era
-- já text puro, sem CHECK. Como há 0 linhas reais, não é preciso backfill/
-- mapeamento de valores — se esta migration algum dia rodar com dado real
-- pré-existente, um passo de mapeamento explícito vira obrigatório antes do
-- DROP COLUMN abaixo.
alter table public.content_items add column status_v2 text not null default 'planejado';
alter table public.content_items drop column status;
alter table public.content_items rename column status_v2 to status;

alter table public.content_items add constraint content_items_status_check check (
  status in (
    'planejado', 'briefing_pronto', 'em_producao', 'revisao_criativa',
    'aguardando_aprovacao', 'em_ajustes', 'aprovado', 'programado', 'publicado',
    'bloqueado', 'cancelado'
  )
);

-- 4) Canais permitidos (mesmo raciocínio do status: CHECK, não enum).
alter table public.content_items add constraint content_items_channels_check check (
  channels is null or channels <@ array['instagram', 'linkedin', 'tiktok', 'youtube', 'kwai']::text[]
);

-- 5) Remoção dos dois booleanos de aprovação — o status passa a ser a única
-- fonte de verdade do workflow (decisão explícita: "não queremos dois
-- booleanos tentando competir com o workflow").
alter table public.content_items drop column internal_approval;
alter table public.content_items drop column client_approval;

-- 6) Antecedência: não impedir em toda situação, só a inversão sem sentido
-- (entrega interna depois da publicação prevista). Nullable-safe — um
-- conteúdo sem as duas datas preenchidas ainda não é restringido por isto.
alter table public.content_items add constraint content_items_due_before_publish_check check (
  internal_due_date is null or planned_publish_date is null or internal_due_date <= planned_publish_date
);

-- project_id: preservado tecnicamente, sem nenhuma alteração nesta
-- migration (decisão explícita — sai só da experiência nova, não do banco).
