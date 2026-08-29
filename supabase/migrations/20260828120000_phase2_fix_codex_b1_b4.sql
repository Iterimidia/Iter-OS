-- Fase 2 (correção pós-revisão Codex): fecha 4 bloqueantes reais encontrados
-- na revisão da RLS aplicada anteriormente. Escopo estritamente estes 4
-- pontos — nenhuma mudança de frontend, nenhuma remoção de `password`,
-- nenhuma normalização de JSONB, nenhuma alteração em produção.

-- ---------------------------------------------------------------------------
-- B3 (preparação): tabelas de referência de bases/áreas padrão por papel —
-- espelham ROLES.defaultBases / defaultAreas em src/lib/permissions.ts, no
-- mesmo padrão já usado por role_default_actions. 'admin' não entra em
-- nenhuma das duas (bypass total nas funções). 'direcao' tem defaultAreas
-- 'all' no frontend — em vez de enumerar todas as áreas aqui, isso é tratado
-- como atalho explícito em iteros_has_area(), igual ao admin.
-- ---------------------------------------------------------------------------
create table public.role_default_bases (
  role text not null,
  base text not null,
  primary key (role, base)
);
alter table public.role_default_bases enable row level security;

insert into public.role_default_bases (role, base) values
  ('direcao','geral'),('direcao','operacional'),('direcao','criativo'),
  ('conselho','geral'),
  ('gestao_criativa','criativo'),('gestao_criativa','geral'),
  ('criativo','criativo'),
  ('operacional','operacional'),
  ('financeiro','operacional'),('financeiro','geral');

create policy "rdb_select" on public.role_default_bases
  for select using (public.iteros_profile_id() is not null);
create policy "rdb_admin_write" on public.role_default_bases
  for all using (public.iteros_is_admin()) with check (public.iteros_is_admin());
grant select, insert, update, delete on public.role_default_bases to authenticated;

create table public.role_default_areas (
  role text not null,
  area text not null,
  primary key (role, area)
);
alter table public.role_default_areas enable row level security;

insert into public.role_default_areas (role, area) values
  ('conselho','geral:dashboard'),('conselho','geral:calendario'),('conselho','geral:relatorios'),
  ('gestao_criativa','criativo:painel'),('gestao_criativa','criativo:conteudo'),('gestao_criativa','criativo:demandas'),
  ('gestao_criativa','criativo:calendario'),('gestao_criativa','criativo:arquivos'),('gestao_criativa','criativo:aprovacoes'),
  ('gestao_criativa','geral:dashboard'),('gestao_criativa','geral:calendario'),
  ('criativo','criativo:painel'),('criativo','criativo:conteudo'),('criativo','criativo:demandas'),
  ('criativo','criativo:calendario'),('criativo','criativo:arquivos'),('criativo','criativo:aprovacoes'),
  ('operacional','operacional:comercial'),('operacional','operacional:clientes'),('operacional','operacional:projetos'),
  ('operacional','operacional:entregas'),('operacional','operacional:operacao'),('operacional','operacional:calendario'),
  ('operacional','operacional:arquivos'),
  ('financeiro','operacional:financeiro'),('financeiro','operacional:clientes'),
  ('financeiro','geral:dashboard'),('financeiro','geral:calendario');

create policy "rda2_select" on public.role_default_areas
  for select using (public.iteros_profile_id() is not null);
create policy "rda2_admin_write" on public.role_default_areas
  for all using (public.iteros_is_admin()) with check (public.iteros_is_admin());
grant select, insert, update, delete on public.role_default_areas to authenticated;

-- ---------------------------------------------------------------------------
-- B3: helpers de base/área (espelham canAccessBase/canViewArea do frontend).
-- ---------------------------------------------------------------------------
create or replace function public.iteros_has_base(p_base text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid()) and u.active = true
      and (
        u.role = 'admin'
        or exists (select 1 from public.role_default_bases r where r.role = u.role and r.base = p_base)
        or (u.allowed_bases ? p_base)
      )
  )
$$;

create or replace function public.iteros_has_area(p_area text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when not public.iteros_has_base(split_part(p_area, ':', 1)) then false else exists(
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid()) and u.active = true
      and (
        u.role in ('admin', 'direcao')
        or exists (select 1 from public.role_default_areas r where r.role = u.role and r.area = p_area)
        or u.allowed_areas = '"all"'::jsonb
        or (u.allowed_areas ? p_area)
      )
  ) end
$$;

revoke execute on function public.iteros_has_base(text) from public;
revoke execute on function public.iteros_has_area(text) from public;
grant execute on function public.iteros_has_base(text) to authenticated;
grant execute on function public.iteros_has_area(text) to authenticated;

-- ---------------------------------------------------------------------------
-- B1: `client_id is null` não pode mais, sozinho, liberar SELECT sem exigir
-- perfil autenticado + ativo. (Nas policies de escrita isso já não era um
-- problema: elas sempre exigiam iteros_has_action(), que por si só já
-- requer perfil ativo — o buraco existia só nos SELECTs.)
-- projects não tem dimensão de área/base própria pedida no escopo desta
-- correção, então recebe só o fix de B1.
-- ---------------------------------------------------------------------------
drop policy "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select using (
    (client_id is null and public.iteros_profile_id() is not null)
    or public.iteros_can_access_client(client_id)
  );

-- ---------------------------------------------------------------------------
-- B3: leads -> área Comercial (operacional:comercial).
-- ---------------------------------------------------------------------------
drop policy "leads_select" on public.leads;
create policy "leads_select" on public.leads
  for select using (public.iteros_has_area('operacional:comercial'));

drop policy "leads_insert" on public.leads;
create policy "leads_insert" on public.leads
  for insert with check (public.iteros_has_action('criar') and public.iteros_has_area('operacional:comercial'));

drop policy "leads_update" on public.leads;
create policy "leads_update" on public.leads
  for update using (public.iteros_has_action('editar') and public.iteros_has_area('operacional:comercial'))
  with check (public.iteros_has_action('editar') and public.iteros_has_area('operacional:comercial'));

drop policy "leads_delete" on public.leads;
create policy "leads_delete" on public.leads
  for delete using (public.iteros_has_action('excluir') and public.iteros_has_area('operacional:comercial'));

-- ---------------------------------------------------------------------------
-- B1 + B3: tasks -> base da própria tarefa (coluna `area`, hoje já armazena
-- uma BaseId, ex: 'operacional' — mesma granularidade usada em todo o
-- restante do schema; não é normalização nova).
-- ---------------------------------------------------------------------------
drop policy "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (
    public.iteros_has_base(area)
    and ((client_id is null and public.iteros_profile_id() is not null) or public.iteros_can_access_client(client_id))
  );

drop policy "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (
    public.iteros_has_action('criar') and public.iteros_has_base(area)
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

drop policy "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update using (
    public.iteros_has_action('editar') and public.iteros_has_base(area)
    and (client_id is null or public.iteros_can_access_client(client_id))
  )
  with check (
    public.iteros_has_action('editar') and public.iteros_has_base(area)
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

drop policy "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (
    public.iteros_has_action('excluir') and public.iteros_has_base(area)
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

-- ---------------------------------------------------------------------------
-- B1 + B3: calendar_events -> base do evento (coluna `scope`, mesma
-- granularidade já usada hoje).
-- ---------------------------------------------------------------------------
drop policy "calendar_events_select" on public.calendar_events;
create policy "calendar_events_select" on public.calendar_events
  for select using (
    public.iteros_has_base(scope)
    and ((client_id is null and public.iteros_profile_id() is not null) or public.iteros_can_access_client(client_id))
  );

drop policy "calendar_events_insert" on public.calendar_events;
create policy "calendar_events_insert" on public.calendar_events
  for insert with check (
    public.iteros_has_action('criar') and public.iteros_has_base(scope)
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

drop policy "calendar_events_update" on public.calendar_events;
create policy "calendar_events_update" on public.calendar_events
  for update using (
    public.iteros_has_action('editar') and public.iteros_has_base(scope)
    and (client_id is null or public.iteros_can_access_client(client_id))
  )
  with check (
    public.iteros_has_action('editar') and public.iteros_has_base(scope)
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

drop policy "calendar_events_delete" on public.calendar_events;
create policy "calendar_events_delete" on public.calendar_events
  for delete using (
    public.iteros_has_action('excluir') and public.iteros_has_base(scope)
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

-- ---------------------------------------------------------------------------
-- B3: content_items -> sempre produção criativa (base 'criativo'). Não tem
-- coluna de área própria; o domínio inteiro é criativo por definição.
-- ---------------------------------------------------------------------------
drop policy "content_items_select" on public.content_items;
create policy "content_items_select" on public.content_items
  for select using (public.iteros_has_base('criativo') and public.iteros_can_access_client(client_id));

drop policy "content_items_insert" on public.content_items;
create policy "content_items_insert" on public.content_items
  for insert with check (public.iteros_has_action('criar') and public.iteros_has_base('criativo') and public.iteros_can_access_client(client_id));

drop policy "content_items_update" on public.content_items;
create policy "content_items_update" on public.content_items
  for update using (public.iteros_has_action('editar') and public.iteros_has_base('criativo') and public.iteros_can_access_client(client_id))
  with check (public.iteros_has_action('editar') and public.iteros_has_base('criativo') and public.iteros_can_access_client(client_id));

drop policy "content_items_delete" on public.content_items;
create policy "content_items_delete" on public.content_items
  for delete using (public.iteros_has_action('excluir') and public.iteros_has_base('criativo') and public.iteros_can_access_client(client_id));

-- ---------------------------------------------------------------------------
-- B3: Delivery Control -> área Entregas (operacional:entregas).
-- ---------------------------------------------------------------------------
drop policy "delivery_plan_items_select" on public.delivery_plan_items;
create policy "delivery_plan_items_select" on public.delivery_plan_items
  for select using (public.iteros_has_area('operacional:entregas') and public.iteros_can_access_client(client_id));

drop policy "delivery_plan_items_insert" on public.delivery_plan_items;
create policy "delivery_plan_items_insert" on public.delivery_plan_items
  for insert with check (public.iteros_has_action('criar') and public.iteros_has_area('operacional:entregas') and public.iteros_can_access_client(client_id));

drop policy "delivery_plan_items_update" on public.delivery_plan_items;
create policy "delivery_plan_items_update" on public.delivery_plan_items
  for update using (public.iteros_has_action('editar') and public.iteros_has_area('operacional:entregas') and public.iteros_can_access_client(client_id))
  with check (public.iteros_has_action('editar') and public.iteros_has_area('operacional:entregas') and public.iteros_can_access_client(client_id));

drop policy "delivery_plan_items_delete" on public.delivery_plan_items;
create policy "delivery_plan_items_delete" on public.delivery_plan_items
  for delete using (public.iteros_has_action('excluir') and public.iteros_has_area('operacional:entregas') and public.iteros_can_access_client(client_id));

drop policy "delivery_units_select" on public.delivery_units;
create policy "delivery_units_select" on public.delivery_units
  for select using (public.iteros_has_area('operacional:entregas') and public.iteros_can_access_client(client_id));

drop policy "delivery_units_insert" on public.delivery_units;
create policy "delivery_units_insert" on public.delivery_units
  for insert with check (public.iteros_has_action('criar') and public.iteros_has_area('operacional:entregas') and public.iteros_can_access_client(client_id));

drop policy "delivery_units_update" on public.delivery_units;
create policy "delivery_units_update" on public.delivery_units
  for update using (public.iteros_has_action('editar') and public.iteros_has_area('operacional:entregas') and public.iteros_can_access_client(client_id))
  with check (public.iteros_has_action('editar') and public.iteros_has_area('operacional:entregas') and public.iteros_can_access_client(client_id));

drop policy "delivery_units_delete" on public.delivery_units;
create policy "delivery_units_delete" on public.delivery_units
  for delete using (public.iteros_has_action('excluir') and public.iteros_has_area('operacional:entregas') and public.iteros_can_access_client(client_id));

-- ---------------------------------------------------------------------------
-- B4a: usuário inativo não pode mais ler nem a própria linha em `users`
-- (antes, `auth_user_id = auth.uid()` sozinho bastava — sem checar `active`
-- — e um usuário inativo continua tendo sessão Auth válida, como já
-- confirmado na Fase 1).
-- ---------------------------------------------------------------------------
drop policy "users_select" on public.users;
create policy "users_select" on public.users
  for select using (
    (auth_user_id = (select auth.uid()) and active = true)
    or public.iteros_is_admin()
    or public.iteros_has_action('gerenciar_usuarios')
  );

-- ---------------------------------------------------------------------------
-- B4b: a coluna legada `password` deixa de ser legível pela API para
-- QUALQUER usuário autenticado (admin incluso) — RLS restringe linhas, não
-- colunas, então isso exige privilégio de coluna no Postgres. A coluna
-- continua existindo (o frontend antigo ainda escreve nela); só a leitura
-- via PostgREST fica bloqueada.
-- ---------------------------------------------------------------------------
revoke select on public.users from authenticated;
grant select (
  id, name, email, role, job_title, avatar_initials, avatar_color, active,
  allowed_bases, allowed_areas, allowed_actions, allowed_client_ids,
  allowed_dashboard_cards, created_at, auth_user_id
) on public.users to authenticated;

-- ---------------------------------------------------------------------------
-- B2: revoga explicitamente qualquer privilégio de tabela do papel `anon`
-- nas tabelas operacionais, e ajusta default privileges para que tabelas
-- futuras também não sejam concedidas a `anon` — o estado final não deve
-- depender de grants históricos/implícitos do bootstrap do projeto. Nenhuma
-- regra de negócio do Iter OS exige sessão anônima.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
