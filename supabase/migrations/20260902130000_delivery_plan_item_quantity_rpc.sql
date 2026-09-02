-- Fase 4 (correção pós-revisão Codex, 4ª rodada): protege monthly_quantity
-- e a reconciliação de delivery_units contra uma corrida entre abas que o
-- Zustand sozinho não consegue impedir:
--
--   quantidade atual = 5; aba A tenta reduzir pra 3 e aba B ainda está
--   reconciliando as unidades da quantidade 5, ao mesmo tempo -- cada uma
--   valida contra o que enxerga localmente (que pode já estar
--   desatualizado no meio da janela entre ler e escrever), e o banco pode
--   terminar com monthly_quantity=3 mas 5 unidades.
--
-- A correção move as duas operações que disputam o mesmo item contratado
-- pra dentro de funções que travam a MESMA linha (SELECT ... FOR UPDATE em
-- delivery_plan_items) antes de decidir qualquer coisa: enquanto uma está
-- em voo, a outra espera a transação da primeira terminar e só então lê o
-- monthly_quantity/conta as unidades -- sempre o valor mais recente já
-- commitado, nunca um valor capturado antes da disputa. Isso não depende
-- do client pra garantir integridade: duas abas/sessões, sem nenhuma
-- coordenação entre si, ficam seguras porque é o PRÓPRIO POSTGRES quem
-- serializa.
--
-- Não edita a migration 20260901190000 (já aplicada no staging; seu
-- histórico não é reescrito) -- esta é uma migration nova que soma funções
-- por cima do que já existe. Ambas as funções são SECURITY INVOKER (não
-- DEFINER): rodam com o papel de quem chama, então a RLS de
-- delivery_plan_items/delivery_units já em vigor continua valendo
-- exatamente como valia quando o client fazia update()/insert() direto --
-- nenhuma permissão nova é concedida, só a MESMA operação passa a
-- acontecer dentro de uma transação que trava a linha certa.

-- Pré-condição não destrutiva: as duas funções abaixo dependem da
-- constraint UNIQUE(plan_item_id, month, unit_index) que a migration
-- 20260901190000 cria (é o que torna o INSERT ... ON CONFLICT DO NOTHING
-- da reconciliação idempotente). Se por algum motivo o staging não tiver
-- essa constraint (ambiente incoerente/fora de ordem), falha aqui de forma
-- clara em vez de instalar funções que dependeriam de uma garantia
-- inexistente.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'delivery_units_plan_item_month_index_key'
      and conrelid = 'public.delivery_units'::regclass
  ) then
    raise exception 'Pré-condição ausente: a constraint UNIQUE delivery_units_plan_item_month_index_key (migration 20260901190000_delivery_units_idempotent_reconciliation) precisa existir antes desta migration. Aplique-a primeiro.';
  end if;
end $$;

-- RPC 1: altera monthly_quantity com trava atômica.
--
-- Trava a linha do item contratado (FOR UPDATE) antes de decidir qualquer
-- coisa. Numa REDUÇÃO, reconta as delivery_units do MÊS CORRENTE dentro da
-- mesma transação (nunca confia num valor que o client tenha lido antes)
-- -- se já existem mais unidades do que a nova quantidade, recusa (RAISE
-- EXCEPTION, nada é escrito) em vez de aceitar uma redução que deixaria
-- unidades "sobrando" sem aviso. Não apaga nenhuma unidade em nenhum caso
-- -- o que fazer com o excedente é uma decisão humana explícita, fora
-- desta função.
create or replace function public.update_delivery_plan_item_quantity(p_plan_item_id text, p_new_quantity integer)
returns public.delivery_plan_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.delivery_plan_items;
  v_month text := to_char(current_date, 'YYYY-MM');
  v_existing_units integer;
begin
  if p_new_quantity is null or p_new_quantity < 1 then
    raise exception 'monthly_quantity inválida: %. Precisa ser um inteiro maior ou igual a 1.', p_new_quantity using errcode = '22023';
  end if;

  select * into v_row
  from public.delivery_plan_items
  where id = p_plan_item_id
  for update;

  if not found then
    raise exception 'Item contratado % não encontrado (ou sem permissão de acesso).', p_plan_item_id using errcode = 'P0002';
  end if;

  if p_new_quantity < v_row.monthly_quantity then
    select count(*) into v_existing_units
    from public.delivery_units
    where plan_item_id = p_plan_item_id and month = v_month;

    if v_existing_units > p_new_quantity then
      raise exception 'Não é possível reduzir a quantidade mensal para %: já existem % entrega(s) registrada(s) para o mês corrente (%). Ajuste ou remova manualmente as entregas existentes antes de reduzir a quantidade.', p_new_quantity, v_existing_units, v_month using errcode = '23514';
    end if;
  end if;

  update public.delivery_plan_items
  set monthly_quantity = p_new_quantity
  where id = p_plan_item_id
  returning * into v_row;

  return v_row;
end;
$$;

-- RPC 2: reconcilia delivery_units do mês dado, travando a MESMA linha do
-- item contratado -- serializa contra a RPC acima (e contra outra chamada
-- concorrente desta mesma função pro mesmo item). Lê monthly_quantity
-- DENTRO da transação (depois de travar), então nunca cria unit_index
-- acima da quantidade vigente no momento em que a trava foi conseguida. A
-- UNIQUE já existente (migration 20260901190000) mais o ON CONFLICT DO
-- NOTHING seguem garantindo que chamar isso de novo (mesma aba, outra
-- aba, retry) nunca duplica nada. Nunca apaga unidades.
create or replace function public.reconcile_delivery_units(p_plan_item_id text, p_month text)
returns setof public.delivery_units
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.delivery_plan_items;
begin
  select * into v_row
  from public.delivery_plan_items
  where id = p_plan_item_id
  for update;

  if not found then
    raise exception 'Item contratado % não encontrado (ou sem permissão de acesso).', p_plan_item_id using errcode = 'P0002';
  end if;

  insert into public.delivery_units (id, plan_item_id, client_id, month, unit_index, status, created_at)
  select
    'dunit_' || left(replace(gen_random_uuid()::text, '-', ''), 16),
    v_row.id,
    v_row.client_id,
    p_month,
    gs.unit_index,
    'pendente',
    current_date
  from generate_series(1, v_row.monthly_quantity) as gs(unit_index)
  on conflict (plan_item_id, month, unit_index) do nothing;

  return query
  select *
  from public.delivery_units
  where plan_item_id = p_plan_item_id and month = p_month
  order by unit_index;
end;
$$;

-- Mesmo padrão de superfície mínima já usado pros demais helpers iteros_*
-- (migration 20260827155500): revoga de PUBLIC (que inclui `anon`) e
-- concede só pra `authenticated`. SECURITY INVOKER já significa que, sem
-- RLS passando pro papel de quem chama, nenhuma das duas consegue
-- ler/escrever nada mesmo assim -- mas reduzir a superfície de RPC
-- exposta é a mesma boa prática já adotada nas demais funções.
revoke execute on function public.update_delivery_plan_item_quantity(text, integer) from public;
revoke execute on function public.reconcile_delivery_units(text, text) from public;
grant execute on function public.update_delivery_plan_item_quantity(text, integer) to authenticated;
grant execute on function public.reconcile_delivery_units(text, text) to authenticated;
