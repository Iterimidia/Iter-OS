-- Fase 2: RLS e permissões reais no banco (substitui as policies `allow_all`).
--
-- Contexto: até aqui as 13 tabelas tinham policy `allow_all` (qualquer
-- request com a anon key lia/escrevia tudo). Esta migration substitui isso
-- por policies reais ancoradas no Supabase Auth + no perfil interno em
-- public.users, espelhando o motor de permissões do frontend
-- (src/lib/permissions.ts).
--
-- Regras centrais implementadas:
--   * todo acesso exige um perfil AUTENTICADO e ATIVO (auth.uid() -> public.users, active=true);
--   * admin tem acesso total (atalho role='admin');
--   * respeita allowed_client_ids ('all' ou lista) nas tabelas ligadas a cliente;
--   * financial_entries exige a ação `ver_financeiro`;
--   * escrita (INSERT/UPDATE/DELETE) respeita as ações criar/editar/excluir;
--   * files respeita visible_to_roles;
--   * usuário inativo é bloqueado mesmo com sessão Auth válida (active=false -> perfil nulo);
--   * user_metadata NUNCA é usado como fonte de autorização — só public.users.
--
-- Decisão de escopo (mantendo simplicidade proporcional ao porte da Iter):
-- a RLS reflete as dimensões de segurança de DADOS (autenticação, perfil
-- ativo, cliente, ver_financeiro, ações de escrita, visible_to_roles). A
-- visibilidade por "área/base" continua sendo, como já é hoje, uma decisão
-- de navegação da camada de aplicação (rotas/menus) — não há dimensão por
-- linha para "área" na maioria das tabelas, e replicá-la na RLS adicionaria
-- complexidade sem ganho real de segurança de dados. A exceção sensível
-- (financeiro) é tratada explicitamente via ver_financeiro.
--
-- SECURITY DEFINER — justificativa técnica concreta: as policies precisam
-- consultar o próprio perfil do chamador em public.users. Fazer isso via
-- subconsulta dentro de uma policy da própria tabela public.users (ou de
-- tabelas que cruzam com ela) reativa a RLS recursivamente e causa
-- "infinite recursion detected in policy". O padrão suportado e documentado
-- pelo Supabase para quebrar essa recursão é encapsular a leitura do perfil
-- em funções SECURITY DEFINER com search_path travado. É o único uso de
-- SECURITY DEFINER aqui, e estritamente para leitura do perfil do chamador.

-- ---------------------------------------------------------------------------
-- 1) Tabela de referência: ações padrão por papel (espelha ROLES em
--    src/lib/permissions.ts). Mantida como dado de referência auditável em
--    vez de embutir o mapa dentro de uma função. 'admin' não é listado —
--    é tratado por atalho (acesso total) nas funções.
-- ---------------------------------------------------------------------------
create table public.role_default_actions (
  role text not null,
  action text not null,
  primary key (role, action)
);

alter table public.role_default_actions enable row level security;

insert into public.role_default_actions (role, action) values
  ('direcao','visualizar'),('direcao','criar'),('direcao','editar'),('direcao','excluir'),
  ('direcao','exportar'),('direcao','aprovar'),('direcao','atribuir'),('direcao','alterar_status'),('direcao','ver_financeiro'),
  ('conselho','visualizar'),('conselho','exportar'),('conselho','ver_financeiro'),
  ('gestao_criativa','visualizar'),('gestao_criativa','criar'),('gestao_criativa','editar'),
  ('gestao_criativa','aprovar'),('gestao_criativa','atribuir'),('gestao_criativa','alterar_status'),('gestao_criativa','exportar'),
  ('criativo','visualizar'),('criativo','criar'),('criativo','editar'),('criativo','alterar_status'),
  ('operacional','visualizar'),('operacional','criar'),('operacional','editar'),
  ('operacional','alterar_status'),('operacional','atribuir'),('operacional','exportar'),
  ('financeiro','visualizar'),('financeiro','criar'),('financeiro','editar'),('financeiro','exportar'),('financeiro','ver_financeiro'),
  ('usuario_limitado','visualizar');

-- ---------------------------------------------------------------------------
-- 2) Funções auxiliares (SECURITY DEFINER, search_path travado). Todas
--    exigem perfil ativo — perfil inativo => resultado nulo/false => bloqueio.
-- ---------------------------------------------------------------------------
create or replace function public.iteros_profile_id()
returns text language sql stable security definer set search_path = '' as $$
  select id from public.users
  where auth_user_id = (select auth.uid()) and active = true
  limit 1
$$;

create or replace function public.iteros_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.users
    where auth_user_id = (select auth.uid()) and active = true and role = 'admin'
  )
$$;

create or replace function public.iteros_profile_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.users
  where auth_user_id = (select auth.uid()) and active = true
  limit 1
$$;

create or replace function public.iteros_has_action(p_action text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid()) and u.active = true
      and (
        u.role = 'admin'
        or exists (select 1 from public.role_default_actions r where r.role = u.role and r.action = p_action)
        or (u.allowed_actions ? p_action)
      )
  )
$$;

create or replace function public.iteros_can_access_client(p_client_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when p_client_id is null then false else exists(
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid()) and u.active = true
      and (
        u.role = 'admin'
        or u.allowed_client_ids = '"all"'::jsonb
        or (u.allowed_client_ids ? p_client_id)
      )
  ) end
$$;

create or replace function public.iteros_has_ver_financeiro()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.iteros_has_action('ver_financeiro')
$$;

-- role_default_actions: leitura liberada para perfis ativos; escrita só admin.
create policy "rda_select" on public.role_default_actions
  for select using (public.iteros_profile_id() is not null);
create policy "rda_admin_write" on public.role_default_actions
  for all using (public.iteros_is_admin()) with check (public.iteros_is_admin());

-- ---------------------------------------------------------------------------
-- 3) Remover as policies allow_all das 13 tabelas.
-- ---------------------------------------------------------------------------
drop policy if exists "allow_all" on public.users;
drop policy if exists "allow_all" on public.clients;
drop policy if exists "allow_all" on public.projects;
drop policy if exists "allow_all" on public.tasks;
drop policy if exists "allow_all" on public.calendar_events;
drop policy if exists "allow_all" on public.financial_entries;
drop policy if exists "allow_all" on public.leads;
drop policy if exists "allow_all" on public.content_items;
drop policy if exists "allow_all" on public.files;
drop policy if exists "allow_all" on public.dashboard_cards;
drop policy if exists "allow_all" on public.app_settings;
drop policy if exists "allow_all" on public.delivery_plan_items;
drop policy if exists "allow_all" on public.delivery_units;

-- ---------------------------------------------------------------------------
-- 4) Policies reais.
-- ---------------------------------------------------------------------------

-- users: cada um lê o próprio perfil; admin lê/gerencia todos.
create policy "users_select" on public.users
  for select using (
    auth_user_id = (select auth.uid())
    or public.iteros_is_admin()
    or public.iteros_has_action('gerenciar_usuarios')
  );
create policy "users_insert" on public.users
  for insert with check (public.iteros_is_admin() or public.iteros_has_action('gerenciar_usuarios'));
create policy "users_update" on public.users
  for update using (public.iteros_is_admin() or public.iteros_has_action('gerenciar_usuarios'))
  with check (public.iteros_is_admin() or public.iteros_has_action('gerenciar_usuarios'));
create policy "users_delete" on public.users
  for delete using (public.iteros_is_admin() or public.iteros_has_action('gerenciar_usuarios'));

-- clients: escopo por allowed_client_ids. INSERT só exige ação 'criar'
-- (um cliente novo ainda não pode constar na lista de ninguém).
create policy "clients_select" on public.clients
  for select using (public.iteros_can_access_client(id));
create policy "clients_insert" on public.clients
  for insert with check (public.iteros_has_action('criar'));
create policy "clients_update" on public.clients
  for update using (public.iteros_has_action('editar') and public.iteros_can_access_client(id))
  with check (public.iteros_has_action('editar') and public.iteros_can_access_client(id));
create policy "clients_delete" on public.clients
  for delete using (public.iteros_has_action('excluir') and public.iteros_can_access_client(id));

-- projects (client_id nullable)
create policy "projects_select" on public.projects
  for select using (client_id is null or public.iteros_can_access_client(client_id));
create policy "projects_insert" on public.projects
  for insert with check (public.iteros_has_action('criar') and (client_id is null or public.iteros_can_access_client(client_id)));
create policy "projects_update" on public.projects
  for update using (public.iteros_has_action('editar') and (client_id is null or public.iteros_can_access_client(client_id)))
  with check (public.iteros_has_action('editar') and (client_id is null or public.iteros_can_access_client(client_id)));
create policy "projects_delete" on public.projects
  for delete using (public.iteros_has_action('excluir') and (client_id is null or public.iteros_can_access_client(client_id)));

-- tasks (client_id nullable)
create policy "tasks_select" on public.tasks
  for select using (client_id is null or public.iteros_can_access_client(client_id));
create policy "tasks_insert" on public.tasks
  for insert with check (public.iteros_has_action('criar') and (client_id is null or public.iteros_can_access_client(client_id)));
create policy "tasks_update" on public.tasks
  for update using (public.iteros_has_action('editar') and (client_id is null or public.iteros_can_access_client(client_id)))
  with check (public.iteros_has_action('editar') and (client_id is null or public.iteros_can_access_client(client_id)));
create policy "tasks_delete" on public.tasks
  for delete using (public.iteros_has_action('excluir') and (client_id is null or public.iteros_can_access_client(client_id)));

-- calendar_events (client_id nullable)
create policy "calendar_events_select" on public.calendar_events
  for select using (client_id is null or public.iteros_can_access_client(client_id));
create policy "calendar_events_insert" on public.calendar_events
  for insert with check (public.iteros_has_action('criar') and (client_id is null or public.iteros_can_access_client(client_id)));
create policy "calendar_events_update" on public.calendar_events
  for update using (public.iteros_has_action('editar') and (client_id is null or public.iteros_can_access_client(client_id)))
  with check (public.iteros_has_action('editar') and (client_id is null or public.iteros_can_access_client(client_id)));
create policy "calendar_events_delete" on public.calendar_events
  for delete using (public.iteros_has_action('excluir') and (client_id is null or public.iteros_can_access_client(client_id)));

-- financial_entries: exige ver_financeiro + escopo por cliente (client_id nullable = despesa geral).
create policy "financial_entries_select" on public.financial_entries
  for select using (public.iteros_has_ver_financeiro() and (client_id is null or public.iteros_can_access_client(client_id)));
create policy "financial_entries_insert" on public.financial_entries
  for insert with check (public.iteros_has_ver_financeiro() and public.iteros_has_action('criar') and (client_id is null or public.iteros_can_access_client(client_id)));
create policy "financial_entries_update" on public.financial_entries
  for update using (public.iteros_has_ver_financeiro() and public.iteros_has_action('editar') and (client_id is null or public.iteros_can_access_client(client_id)))
  with check (public.iteros_has_ver_financeiro() and public.iteros_has_action('editar') and (client_id is null or public.iteros_can_access_client(client_id)));
create policy "financial_entries_delete" on public.financial_entries
  for delete using (public.iteros_has_ver_financeiro() and public.iteros_has_action('excluir') and (client_id is null or public.iteros_can_access_client(client_id)));

-- leads (sem client_id): perfil ativo lê; escrita por ação.
create policy "leads_select" on public.leads
  for select using (public.iteros_profile_id() is not null);
create policy "leads_insert" on public.leads
  for insert with check (public.iteros_has_action('criar'));
create policy "leads_update" on public.leads
  for update using (public.iteros_has_action('editar')) with check (public.iteros_has_action('editar'));
create policy "leads_delete" on public.leads
  for delete using (public.iteros_has_action('excluir'));

-- content_items (client_id NOT NULL)
create policy "content_items_select" on public.content_items
  for select using (public.iteros_can_access_client(client_id));
create policy "content_items_insert" on public.content_items
  for insert with check (public.iteros_has_action('criar') and public.iteros_can_access_client(client_id));
create policy "content_items_update" on public.content_items
  for update using (public.iteros_has_action('editar') and public.iteros_can_access_client(client_id))
  with check (public.iteros_has_action('editar') and public.iteros_can_access_client(client_id));
create policy "content_items_delete" on public.content_items
  for delete using (public.iteros_has_action('excluir') and public.iteros_can_access_client(client_id));

-- files (client_id nullable + visible_to_roles)
create policy "files_select" on public.files
  for select using (
    (public.iteros_is_admin() or (visible_to_roles ? public.iteros_profile_role()))
    and (client_id is null or public.iteros_can_access_client(client_id))
  );
create policy "files_insert" on public.files
  for insert with check (public.iteros_has_action('criar') and (client_id is null or public.iteros_can_access_client(client_id)));
create policy "files_update" on public.files
  for update using (public.iteros_has_action('editar') and (client_id is null or public.iteros_can_access_client(client_id)))
  with check (public.iteros_has_action('editar') and (client_id is null or public.iteros_can_access_client(client_id)));
create policy "files_delete" on public.files
  for delete using (public.iteros_has_action('excluir') and (client_id is null or public.iteros_can_access_client(client_id)));

-- dashboard_cards (referência/config): perfil ativo lê; só admin escreve.
create policy "dashboard_cards_select" on public.dashboard_cards
  for select using (public.iteros_profile_id() is not null);
create policy "dashboard_cards_admin_write" on public.dashboard_cards
  for all using (public.iteros_is_admin()) with check (public.iteros_is_admin());

-- app_settings (config única): perfil ativo lê; só admin escreve.
create policy "app_settings_select" on public.app_settings
  for select using (public.iteros_profile_id() is not null);
create policy "app_settings_admin_write" on public.app_settings
  for all using (public.iteros_is_admin()) with check (public.iteros_is_admin());

-- delivery_plan_items (client_id NOT NULL)
create policy "delivery_plan_items_select" on public.delivery_plan_items
  for select using (public.iteros_can_access_client(client_id));
create policy "delivery_plan_items_insert" on public.delivery_plan_items
  for insert with check (public.iteros_has_action('criar') and public.iteros_can_access_client(client_id));
create policy "delivery_plan_items_update" on public.delivery_plan_items
  for update using (public.iteros_has_action('editar') and public.iteros_can_access_client(client_id))
  with check (public.iteros_has_action('editar') and public.iteros_can_access_client(client_id));
create policy "delivery_plan_items_delete" on public.delivery_plan_items
  for delete using (public.iteros_has_action('excluir') and public.iteros_can_access_client(client_id));

-- delivery_units (client_id NOT NULL)
create policy "delivery_units_select" on public.delivery_units
  for select using (public.iteros_can_access_client(client_id));
create policy "delivery_units_insert" on public.delivery_units
  for insert with check (public.iteros_has_action('criar') and public.iteros_can_access_client(client_id));
create policy "delivery_units_update" on public.delivery_units
  for update using (public.iteros_has_action('editar') and public.iteros_can_access_client(client_id))
  with check (public.iteros_has_action('editar') and public.iteros_can_access_client(client_id));
create policy "delivery_units_delete" on public.delivery_units
  for delete using (public.iteros_has_action('excluir') and public.iteros_can_access_client(client_id));
