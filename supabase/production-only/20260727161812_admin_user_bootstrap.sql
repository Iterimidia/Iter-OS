-- REGISTRO HISTÓRICO — NÃO É UMA MIGRATION REPLICÁVEL E NÃO É EXECUTÁVEL
-- COM DADOS REAIS. Todo campo de identidade pessoal abaixo foi substituído
-- por um placeholder explícito (nunca o valor real). Este arquivo existe
-- só para deixar rastreável, na estrutura do repositório, QUE um insert de
-- usuário administrador aconteceu nessa posição do histórico — não para
-- reproduzir a pessoa real.
--
-- Este arquivo NÃO fica em `supabase/migrations/` de propósito: essa pasta é
-- replicada integralmente (na ordem dos nomes) por qualquer `supabase db
-- reset`, criação de branch/projeto novo, ou qualquer outro bootstrap
-- automatizado. Se este insert estivesse lá, TODO ambiente novo (staging,
-- local, CI) ganharia uma linha de usuário administrativo — isso é
-- exatamente o defeito que a separação em dois arquivos corrige.
--
-- O que aconteceu de fato em produção: a migration rastreada pelo Supabase
-- como `20260727161812_seed_iteros_initial_data` inseriu, na mesma
-- transação, (a) o usuário administrador real e (b) os dados de referência
-- `dashboard_cards`/`app_settings`. Para termos ao mesmo tempo (1) um
-- histórico rastreável do que rodou em produção e (2) um bootstrap
-- automatizado seguro para staging/local, separamos essa migration em dois
-- arquivos:
--
--   supabase/migrations/20260727161812_seed_iteros_initial_data.sql
--     → mantém o mesmo nome/posição no histórico, contém apenas as partes
--       sem PII (dashboard_cards, app_settings). É isso que roda em
--       qualquer bootstrap automatizado.
--
--   supabase/production-only/20260727161812_admin_user_bootstrap.sql (este arquivo)
--     → registro de que um insert de usuário admin aconteceu aqui,
--       totalmente anonimizado. Existe só para auditoria/rastreabilidade;
--       nenhum script ou processo automatizado lê esta pasta.
--
-- Isso não é "editar migration histórica de forma imprudente": nenhuma
-- migration real foi alterada — a migration efetivamente rastreada pelo
-- Supabase em produção (`schema_migrations`) permanece intacta e inalterada
-- no banco de produção. O que existe aqui é só uma representação
-- documental, no repositório, anonimizada por design.

insert into public.users (id, name, email, password, role, job_title, avatar_initials, avatar_color, active, allowed_bases, allowed_areas, allowed_actions, allowed_client_ids, allowed_dashboard_cards, created_at)
values (
  '__PRODUCTION_ADMIN_ID_REDACTED__', '__PRODUCTION_ADMIN_NAME_REDACTED__', '__PRODUCTION_ADMIN_EMAIL_REDACTED__', '__PRODUCTION_ADMIN_PASSWORD_REDACTED__', 'admin', '__PRODUCTION_ADMIN_JOB_TITLE_REDACTED__', '__PRODUCTION_ADMIN_INITIALS_REDACTED__', '#7C6BFF', true,
  '[]', '[]', '[]', '"all"', '"all"', current_date - interval '400 days'
);
