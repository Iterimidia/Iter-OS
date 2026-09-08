-- Fase 9: fundação operacional pós-V1 — campos e mecanismos que as fases
-- seguintes do roadmap (Tela Hoje, Client Hub, Calendário Editorial etc.)
-- vão referenciar. Nenhuma alteração em RLS/Auth já existente.

-- Executor: distinto do Responsável. Nulo = "mesmo que o responsável" (o
-- frontend decide o default; não travamos isso via DEFAULT no banco porque
-- o valor de responsible_id pode mudar depois de criado).
alter table public.tasks add column if not exists executor_id text references public.users(id);
alter table public.projects add column if not exists executor_id text references public.users(id);
alter table public.content_items add column if not exists executor_id text references public.users(id);

-- Bloqueio estruturado: atributo anexado a qualquer status (não um status
-- próprio) — uma tarefa "em_andamento" pode estar bloqueada sem perder o
-- status real. Categoria fixa por enquanto (lista do briefing operacional);
-- vira configurável só se a operação real pedir.
alter table public.tasks add column if not exists blocked_reason text;
alter table public.tasks add column if not exists blocked_note text;
alter table public.tasks add column if not exists blocked_at date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_blocked_reason_check') then
    alter table public.tasks add constraint tasks_blocked_reason_check check (
      blocked_reason is null or blocked_reason in (
        'aguardando_cliente', 'aguardando_aprovacao', 'aguardando_material', 'dependencia_interna',
        'problema_tecnico', 'fora_de_escopo', 'conflito_de_informacao', 'indisponibilidade_equipe'
      )
    );
  end if;
end $$;

-- Estágio macro do cliente: enum simplificado (6 valores) em vez do fluxo
-- completo de 20+ passos do briefing — refina depois sem quebrar nada,
-- porque é só um enum. next_action é texto livre por enquanto.
alter table public.clients add column if not exists stage text;
alter table public.clients add column if not exists next_action text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clients_stage_check') then
    alter table public.clients add constraint clients_stage_check check (
      stage is null or stage in ('lead', 'comercial', 'onboarding', 'ativo', 'pausado', 'encerrado')
    );
  end if;
end $$;

-- Histórico genérico: gravado pelos helpers centralizados de mutação do
-- frontend (createRow/updateRow/removeRow em store.ts), cobre as 12
-- coleções de uma vez, sem duplicar lógica por tela. actor_id nunca é
-- enviado pelo client — vem sempre de auth.uid() (default + check), então
-- não pode ser forjado num insert.
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  client_id text references public.clients(id) on delete set null,
  actor_id uuid not null default auth.uid(),
  event_type text not null check (event_type in ('created', 'updated', 'deleted')),
  from_value jsonb,
  to_value jsonb,
  message text,
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'activity_log' and policyname = 'activity_log_select') then
    create policy "activity_log_select" on public.activity_log
      for select using (client_id is null or public.iteros_can_access_client(client_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'activity_log' and policyname = 'activity_log_insert') then
    create policy "activity_log_insert" on public.activity_log
      for insert with check (actor_id = auth.uid() and (client_id is null or public.iteros_can_access_client(client_id)));
  end if;
end $$;

grant select, insert on public.activity_log to authenticated;
revoke all on public.activity_log from anon;

create index if not exists activity_log_client_id_idx on public.activity_log (client_id, created_at desc);
create index if not exists activity_log_entity_idx on public.activity_log (entity_type, entity_id, created_at desc);
