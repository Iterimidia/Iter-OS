-- Fase 4 (correção pós-revisão Codex): delivery_units precisa de uma chave
-- determinística por posição dentro do mês pra a reconciliação de entregas
-- do mês ser idempotente no servidor. Sem isso, duas reconciliações
-- concorrentes/repetidas (duas abas, dois cliques, um retry) podiam criar
-- mais unidades do que o `monthly_quantity` contratado — cada tentativa
-- só olhava a contagem local antes de inserir, então uma corrida entre
-- duas chamadas conseguia passar da checagem "quantas já existem" ao
-- mesmo tempo e cada uma inserir sua própria unidade extra.
--
-- Não mexe em RLS/Auth — é só uma constraint de integridade de dado do
-- domínio de Entregas.

alter table public.delivery_units add column unit_index integer;

-- Backfill: numera as unidades já existentes por ordem de criação dentro
-- de cada (plan_item_id, month) — não muda nenhum dado visível na tela,
-- só define a posição de cada uma.
with numbered as (
  select id, row_number() over (partition by plan_item_id, month order by created_at, id) as rn
  from public.delivery_units
)
update public.delivery_units du
set unit_index = numbered.rn
from numbered
where du.id = numbered.id;

alter table public.delivery_units alter column unit_index set not null;

-- A chave que torna o upsert idempotente: duas tentativas de criar "a
-- unidade Nº 2 do plano X em 2026-09" conflitam aqui e a segunda vira
-- no-op (ON CONFLICT DO NOTHING no client), em vez de duas linhas.
alter table public.delivery_units
  add constraint delivery_units_plan_item_month_index_key unique (plan_item_id, month, unit_index);
