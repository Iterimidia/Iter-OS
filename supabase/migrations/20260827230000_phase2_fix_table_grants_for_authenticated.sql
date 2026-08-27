-- Fix: o reset de schema feito na validação de reprodutibilidade (Fase 0,
-- ponto 6 — drop schema public cascade + recriação) removeu os GRANTs
-- padrão que o Supabase normalmente configura no bootstrap do projeto
-- (GRANT ... TO authenticated). Sem esse GRANT de tabela, o PostgREST nega
-- acesso ANTES mesmo de avaliar RLS ("permission denied for table X").
--
-- Deliberadamente NÃO concedemos nada a `anon` — regra central da Fase 2 é
-- "todo acesso protegido exige usuário autenticado". RLS continua sendo a
-- camada de controle por linha; isto aqui é só o pré-requisito de tabela.

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
