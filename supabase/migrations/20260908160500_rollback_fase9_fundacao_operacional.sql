-- Rollback controlado e explícito de 20260908155600_fase9_fundacao_operacional.
--
-- A Fase 9 foi iniciada por engano e desfeita antes de qualquer código
-- correspondente ser commitado ou promovido a produção. Esta migration NÃO
-- edita nem apaga a migration original (seu histórico permanece: ela
-- realmente rodou em staging) -- soma uma migration nova que reverte
-- exatamente, e só, os objetos que ela criou.
--
-- Verificado antes de escrever este rollback (sessão atual):
--   * nenhuma linha real tem dado nas colunas abaixo (todas nulas em
--     tasks/projects/content_items/clients) e activity_log está vazia;
--   * fase9_fundacao_operacional é a última migration do histórico de
--     staging -- nenhuma migration posterior depende de nada disto;
--   * produção nunca recebeu a migration original -- este rollback também
--     não é aplicado lá.
--
-- Dropar uma coluna já remove junto qualquer constraint que dependa só
-- dela (ex: os CHECK de blocked_reason/stage) -- não precisa de um DROP
-- CONSTRAINT separado. Dropar activity_log remove junto suas policies,
-- grants e os 2 índices que vivem nela.

alter table public.tasks drop column if exists executor_id;
alter table public.tasks drop column if exists blocked_reason;
alter table public.tasks drop column if exists blocked_note;
alter table public.tasks drop column if exists blocked_at;

alter table public.projects drop column if exists executor_id;

alter table public.content_items drop column if exists executor_id;

alter table public.clients drop column if exists stage;
alter table public.clients drop column if exists next_action;

drop table if exists public.activity_log;
