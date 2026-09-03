-- Fase 8 (achado na promoção pra produção): produção manteve, desde o
-- bootstrap original do projeto (antes de qualquer migration deste repo),
-- uma default privilege de FUNCTION que concede EXECUTE a `anon` (e
-- `authenticated`/`service_role`) em toda função nova criada pelo papel
-- `postgres` no schema public -- confirmado via pg_default_acl. Staging não
-- tem essa entrada (foi perdida no reset de schema da Fase 0, o mesmo
-- motivo pelo qual a migration phase2_fix_table_grants_for_authenticated
-- precisou reconceder o equivalente pra tabelas/authenticated).
--
-- Efeito prático: mesmo depois de phase2_lock_down_helper_function_grants e
-- phase2_fix_codex_b1_b4 revogarem EXECUTE de `public` nas funções
-- iteros_*, `anon` continuou com EXECUTE direto (concedido no momento da
-- criação de cada função via essa default privilege, não através de
-- PUBLIC) -- confirmado pelo advisor de segurança
-- (anon_security_definer_function_executable) logo após aplicar as 9
-- migrations pendentes em produção.
--
-- Isto NÃO expõe dado nenhum hoje: todas as funções abaixo leem o próprio
-- perfil do chamador via auth.uid(), que é null sem sessão -- uma chamada
-- anônima sempre recebe null/false. Ainda assim, fecha a superfície pra
-- bater com o estado final pretendido (só authenticated executa) e
-- silenciar o advisor.
--
-- Não altera nenhuma migration já aplicada (nem em produção, nem em
-- staging) -- soma uma correção nova por cima, como já é o padrão deste
-- projeto (ver comentário de delivery_plan_item_quantity_rpc). Idempotente:
-- reaplicar em qualquer ambiente é seguro.

revoke execute on function public.iteros_profile_id() from anon;
revoke execute on function public.iteros_is_admin() from anon;
revoke execute on function public.iteros_profile_role() from anon;
revoke execute on function public.iteros_has_action(text) from anon;
revoke execute on function public.iteros_can_access_client(text) from anon;
revoke execute on function public.iteros_has_ver_financeiro() from anon;
revoke execute on function public.iteros_has_base(text) from anon;
revoke execute on function public.iteros_has_area(text) from anon;
revoke execute on function public.iteros_task_area(text) from anon;
revoke execute on function public.iteros_calendar_area(text) from anon;

-- Fecha a causa raiz pra funções futuras criadas pelo papel corrente
-- (postgres, o mesmo que roda as migrations): sem isto, a próxima função
-- nova (ex: Fase 8.7, remoção de password) reabriria o mesmo buraco.
alter default privileges in schema public revoke execute on functions from anon;
