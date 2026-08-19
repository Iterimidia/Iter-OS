-- REGISTRO HISTÓRICO — NÃO É UMA MIGRATION REPLICÁVEL.
--
-- Este arquivo NÃO fica em `supabase/migrations/` de propósito: essa pasta é
-- replicada integralmente (na ordem dos nomes) por qualquer `supabase db
-- reset`, criação de branch/projeto novo, ou qualquer outro bootstrap
-- automatizado. Se este insert estivesse lá, TODO ambiente novo (staging,
-- local, CI) ganharia uma linha com nome e e-mail reais de uma pessoa real
-- — isso é exatamente o defeito que este arquivo corrige.
--
-- O que aconteceu de fato em produção: a migration rastreada pelo Supabase
-- como `20260727161812_seed_iteros_initial_data` inseriu, na mesma
-- transação, (a) o usuário administrador real e (b) os dados de referência
-- `dashboard_cards`/`app_settings`. Para termos ao mesmo tempo (1) um
-- histórico fiel do que rodou em produção e (2) um bootstrap automatizado
-- seguro para staging/local, separamos essa migration em dois arquivos:
--
--   supabase/migrations/20260727161812_seed_iteros_initial_data.sql
--     → mantém o mesmo nome/posição no histórico, contém apenas as partes
--       sem PII (dashboard_cards, app_settings). É isso que roda em
--       qualquer bootstrap automatizado.
--
--   supabase/production-only/20260727161812_admin_user_bootstrap.sql (este arquivo)
--     → registro do insert do usuário admin real, exatamente como rodou em
--       produção, com a senha já redigida (nunca foi versionada em texto
--       plano — ver histórico do commit anterior). Existe só para auditoria/
--       rastreabilidade; nenhum script ou processo automatizado lê esta
--       pasta.
--
-- Isso não é "editar migration histórica de forma imprudente": a soma dos
-- dois arquivos reproduz exatamente as mesmas instruções SQL que rodaram em
-- produção, na mesma ordem lógica — só mudou ONDE cada parte vive no
-- repositório, com o motivo documentado aqui.

insert into public.users (id, name, email, password, role, job_title, avatar_initials, avatar_color, active, allowed_bases, allowed_areas, allowed_actions, allowed_client_ids, allowed_dashboard_cards, created_at)
values (
  'usr_daniel', 'Daniel Michelin', 'daniel@itermidia.com.br', '__REDACTED_SET_MANUALLY__', 'admin', 'CEO', 'DM', '#7C6BFF', true,
  '[]', '[]', '[]', '"all"', '"all"', current_date - interval '400 days'
);
