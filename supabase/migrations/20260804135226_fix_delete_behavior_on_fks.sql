-- Deletar um cliente ou usuário não deve arrastar projetos/tarefas/conteúdos
-- já vinculados (esse é o comportamento comunicado na tela de exclusão de
-- cliente). Colunas NOT NULL não podem usar "on delete set null", então
-- removemos a constraint de integridade referencial nesses casos —
-- a mesma tolerância a referências "penduradas" que a UI já trata em
-- todo lugar (clientName(id) ?? '-', userName(id) ?? '-', etc).

alter table public.projects drop constraint projects_client_id_fkey;

alter table public.tasks drop constraint tasks_responsible_id_fkey;

alter table public.content_items drop constraint content_items_client_id_fkey;
alter table public.content_items drop constraint content_items_responsible_id_fkey;

-- Estas duas colunas são opcionais (nullable), então "set null" é seguro e
-- correto: apagar o cliente/tarefa relacionados só limpa a referência do
-- evento de calendário, sem apagar o evento.
alter table public.calendar_events drop constraint calendar_events_client_id_fkey;
alter table public.calendar_events add constraint calendar_events_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete set null;

alter table public.calendar_events drop constraint calendar_events_task_id_fkey;
alter table public.calendar_events add constraint calendar_events_task_id_fkey
  foreign key (task_id) references public.tasks(id) on delete set null;
