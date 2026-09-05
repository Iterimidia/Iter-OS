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
--
-- Revisão pós-revisão Codex (3º round): esta migration já rodou no
-- staging antes desta revisão. Toda alteração de schema abaixo foi
-- reescrita pra ser idempotente (IF NOT EXISTS / guards) — reaplicar este
-- arquivo, aqui ou numa promoção futura pra outro ambiente, não falha nem
-- reordena nada que já esteja correto. Isso é o que permite revisar o
-- arquivo em vez de empilhar um novo, já que ele nunca foi promovido pra
-- produção.
--
-- Freio de segurança adicionado: uma promoção futura (produção, ou
-- qualquer ambiente que ainda não tenha passado por uma limpeza manual
-- como a que foi feita no staging) não deve herdar silenciosamente dados
-- de delivery_units já inconsistentes com o monthly_quantity contratado.
-- A migration recusa (RAISE EXCEPTION, sem alterar nada) se encontrar
-- grupos (plan_item_id, month) do MÊS CORRENTE com mais unidades do que o
-- monthly_quantity atual do item — o mês corrente é o único caso em que a
-- comparação é segura sem adivinhar nada: monthly_quantity é "a
-- quantidade contratada agora", então o mês que está em curso agora é o
-- único que necessariamente já deveria bater com ela. Meses passados NÃO
-- são avaliados nem tocados — a quantidade contratada pode legitimamente
-- ter sido diferente no passado, então um mês histórico com mais unidades
-- do que o monthly_quantity ATUAL não é, por si só, um erro. Nenhuma
-- linha é apagada automaticamente em nenhum caso: se o freio disparar, os
-- grupos listados nos WARNINGs precisam ser revisados manualmente antes
-- de reaplicar esta migration.
do $$
declare
  offending record;
  offending_count integer := 0;
begin
  for offending in
    select u.plan_item_id, u.month, count(*) as unit_count, p.monthly_quantity
    from public.delivery_units u
    join public.delivery_plan_items p on p.id = u.plan_item_id
    where u.month = to_char(current_date, 'YYYY-MM')
    group by u.plan_item_id, u.month, p.monthly_quantity
    having count(*) > p.monthly_quantity
  loop
    offending_count := offending_count + 1;
    raise warning 'delivery_units: plan_item_id=% month=% tem % unidade(s), monthly_quantity contratado=%. Revise manualmente antes de reaplicar esta migration.',
      offending.plan_item_id, offending.month, offending.unit_count, offending.monthly_quantity;
  end loop;

  if offending_count > 0 then
    raise exception 'Migration abortada (nenhuma alteração de schema foi aplicada): % grupo(s) de delivery_units do mês corrente (%) têm mais unidades do que o monthly_quantity contratado. Isso é exatamente o sintoma do bug de reconciliação não idempotente que esta migration corrige — resolva manualmente esses grupos específicos (ver WARNINGs acima) antes de reaplicar. Meses passados não são avaliados por esta checagem.',
      offending_count, to_char(current_date, 'YYYY-MM');
  end if;
end $$;

alter table public.delivery_units add column if not exists unit_index integer;

-- Backfill: numera as unidades já existentes por ordem de criação dentro
-- de cada (plan_item_id, month) — não muda nenhum dado visível na tela,
-- só define a posição de cada uma. Restrito a linhas ainda sem
-- unit_index, pra reaplicar este arquivo num ambiente onde ele já rodou
-- (staging) ser um no-op nesta parte, em vez de recalcular à toa.
with numbered as (
  select id, row_number() over (partition by plan_item_id, month order by created_at, id) as rn
  from public.delivery_units
  where unit_index is null
)
update public.delivery_units du
set unit_index = numbered.rn
from numbered
where du.id = numbered.id;

alter table public.delivery_units alter column unit_index set not null;

-- A chave que torna o upsert idempotente: duas tentativas de criar "a
-- unidade Nº 2 do plano X em 2026-09" conflitam aqui e a segunda vira
-- no-op (ON CONFLICT DO NOTHING no client), em vez de duas linhas.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'delivery_units_plan_item_month_index_key') then
    alter table public.delivery_units
      add constraint delivery_units_plan_item_month_index_key unique (plan_item_id, month, unit_index);
  end if;
end $$;
