-- Fase 2 (correção pós-revisão Codex, 2ª rodada): fecha o único bloqueante
-- restante, B3 — granularidade de área incompleta em projects, tasks,
-- calendar_events e content_items. B1, B2 e B4 já foram aprovados e não são
-- tocados aqui. Usa exclusivamente os helpers já existentes
-- (iteros_has_area, iteros_has_base) — nenhuma arquitetura nova, nenhuma
-- normalização de JSONB.
--
-- IDs de área confirmados em src/lib/navigation.ts antes de escrever esta
-- migration (nenhum nome novo inventado):
--   operacional:projetos, operacional:operacao, operacional:calendario,
--   criativo:painel, criativo:conteudo, criativo:demandas,
--   criativo:calendario, geral:dashboard, geral:calendario.

-- ---------------------------------------------------------------------------
-- projects -> área "Projetos" (operacional:projetos). Não tem coluna de
-- área própria; o domínio inteiro corresponde a uma única área.
-- ---------------------------------------------------------------------------
drop policy "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select using (
    public.iteros_has_area('operacional:projetos')
    and ((client_id is null and public.iteros_profile_id() is not null) or public.iteros_can_access_client(client_id))
  );

drop policy "projects_insert" on public.projects;
create policy "projects_insert" on public.projects
  for insert with check (
    public.iteros_has_action('criar') and public.iteros_has_area('operacional:projetos')
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

drop policy "projects_update" on public.projects;
create policy "projects_update" on public.projects
  for update using (
    public.iteros_has_action('editar') and public.iteros_has_area('operacional:projetos')
    and (client_id is null or public.iteros_can_access_client(client_id))
  )
  with check (
    public.iteros_has_action('editar') and public.iteros_has_area('operacional:projetos')
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

drop policy "projects_delete" on public.projects;
create policy "projects_delete" on public.projects
  for delete using (
    public.iteros_has_action('excluir') and public.iteros_has_area('operacional:projetos')
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

-- ---------------------------------------------------------------------------
-- tasks -> a coluna `area` guarda uma BaseId ('operacional'/'criativo'/
-- 'geral' — ver TaskFormModal.tsx), não uma área completa. O mapeamento
-- abaixo reflete onde cada uma é de fato listada no frontend hoje:
--   'operacional' -> operacional:operacao (OperationPage.tsx filtra
--     t.area === 'operacional')
--   'criativo'    -> criativo:painel (CreativePanelPage.tsx filtra
--     t.area === 'criativo')
--   'geral'       -> geral:dashboard (fallback defensivo; não há página
--     dedicada a tarefas de base 'geral' hoje, mas o tipo permite o valor)
-- ---------------------------------------------------------------------------
create or replace function public.iteros_task_area(p_task_base text)
returns text language sql immutable as $$
  select case p_task_base
    when 'operacional' then 'operacional:operacao'
    when 'criativo' then 'criativo:painel'
    when 'geral' then 'geral:dashboard'
    else null
  end
$$;
revoke execute on function public.iteros_task_area(text) from public;
grant execute on function public.iteros_task_area(text) to authenticated;

drop policy "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (
    public.iteros_has_area(public.iteros_task_area(area))
    and ((client_id is null and public.iteros_profile_id() is not null) or public.iteros_can_access_client(client_id))
  );

drop policy "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (
    public.iteros_has_action('criar') and public.iteros_has_area(public.iteros_task_area(area))
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

drop policy "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update using (
    public.iteros_has_action('editar') and public.iteros_has_area(public.iteros_task_area(area))
    and (client_id is null or public.iteros_can_access_client(client_id))
  )
  with check (
    public.iteros_has_action('editar') and public.iteros_has_area(public.iteros_task_area(area))
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

drop policy "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (
    public.iteros_has_action('excluir') and public.iteros_has_area(public.iteros_task_area(area))
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

-- ---------------------------------------------------------------------------
-- calendar_events -> a coluna `scope` também guarda uma BaseId (ver
-- src/lib/calendar.ts: buildCalendarEvents(scope: BaseId, ...)). Mapeamento
-- para a área de calendário de cada base (todas existem em navigation.ts):
--   'operacional' -> operacional:calendario
--   'criativo'    -> criativo:calendario
--   'geral'       -> geral:calendario
-- ---------------------------------------------------------------------------
create or replace function public.iteros_calendar_area(p_scope text)
returns text language sql immutable as $$
  select case p_scope
    when 'operacional' then 'operacional:calendario'
    when 'criativo' then 'criativo:calendario'
    when 'geral' then 'geral:calendario'
    else null
  end
$$;
revoke execute on function public.iteros_calendar_area(text) from public;
grant execute on function public.iteros_calendar_area(text) to authenticated;

drop policy "calendar_events_select" on public.calendar_events;
create policy "calendar_events_select" on public.calendar_events
  for select using (
    public.iteros_has_area(public.iteros_calendar_area(scope))
    and ((client_id is null and public.iteros_profile_id() is not null) or public.iteros_can_access_client(client_id))
  );

drop policy "calendar_events_insert" on public.calendar_events;
create policy "calendar_events_insert" on public.calendar_events
  for insert with check (
    public.iteros_has_action('criar') and public.iteros_has_area(public.iteros_calendar_area(scope))
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

drop policy "calendar_events_update" on public.calendar_events;
create policy "calendar_events_update" on public.calendar_events
  for update using (
    public.iteros_has_action('editar') and public.iteros_has_area(public.iteros_calendar_area(scope))
    and (client_id is null or public.iteros_can_access_client(client_id))
  )
  with check (
    public.iteros_has_action('editar') and public.iteros_has_area(public.iteros_calendar_area(scope))
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

drop policy "calendar_events_delete" on public.calendar_events;
create policy "calendar_events_delete" on public.calendar_events
  for delete using (
    public.iteros_has_action('excluir') and public.iteros_has_area(public.iteros_calendar_area(scope))
    and (client_id is null or public.iteros_can_access_client(client_id))
  );

-- ---------------------------------------------------------------------------
-- content_items -> conferido no frontend (ContentPage.tsx e
-- DemandsPage.tsx): as DUAS páginas leem exatamente a mesma tabela
-- `contentItems`, só com filtros de exibição diferentes (formato vs. board
-- de status) — não existe uma coluna que distinga "isto é conteúdo" de
-- "isto é demanda". Não há como mapear cada linha para UMA área sem
-- inventar uma dimensão que não existe hoje (o que seria redesenhar o
-- sistema). O fiel ao comportamento real do frontend é exigir acesso a
-- QUALQUER UMA das duas áreas que consomem esta tabela — replica
-- exatamente quem já enxerga este dado hoje pela UI, nem mais nem menos.
-- ---------------------------------------------------------------------------
drop policy "content_items_select" on public.content_items;
create policy "content_items_select" on public.content_items
  for select using (
    (public.iteros_has_area('criativo:conteudo') or public.iteros_has_area('criativo:demandas'))
    and public.iteros_can_access_client(client_id)
  );

drop policy "content_items_insert" on public.content_items;
create policy "content_items_insert" on public.content_items
  for insert with check (
    public.iteros_has_action('criar')
    and (public.iteros_has_area('criativo:conteudo') or public.iteros_has_area('criativo:demandas'))
    and public.iteros_can_access_client(client_id)
  );

drop policy "content_items_update" on public.content_items;
create policy "content_items_update" on public.content_items
  for update using (
    public.iteros_has_action('editar')
    and (public.iteros_has_area('criativo:conteudo') or public.iteros_has_area('criativo:demandas'))
    and public.iteros_can_access_client(client_id)
  )
  with check (
    public.iteros_has_action('editar')
    and (public.iteros_has_area('criativo:conteudo') or public.iteros_has_area('criativo:demandas'))
    and public.iteros_can_access_client(client_id)
  );

drop policy "content_items_delete" on public.content_items;
create policy "content_items_delete" on public.content_items
  for delete using (
    public.iteros_has_action('excluir')
    and (public.iteros_has_area('criativo:conteudo') or public.iteros_has_area('criativo:demandas'))
    and public.iteros_can_access_client(client_id)
  );
