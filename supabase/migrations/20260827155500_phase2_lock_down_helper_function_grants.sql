-- Fase 2 (endurecimento): restringe quem pode chamar as funções auxiliares
-- SECURITY DEFINER via RPC do PostgREST.
--
-- As funções (iteros_profile_id, iteros_is_admin, iteros_profile_role,
-- iteros_has_action, iteros_can_access_client, iteros_has_ver_financeiro)
-- só leem o PRÓPRIO perfil do chamador via auth.uid() — sem sessão
-- autenticada, auth.uid() é null e todas retornam null/false. Ou seja,
-- deixá-las exposta ao `anon` não é uma falha de segurança em si (nada
-- vaza), mas o advisor de segurança da Supabase sinaliza corretamente que
-- reduzir a superfície exposta via /rest/v1/rpc/* é boa prática. Esta
-- migration revoga EXECUTE de `public` (que inclui `anon`) e concede
-- somente para `authenticated`.

revoke execute on function public.iteros_profile_id() from public;
revoke execute on function public.iteros_is_admin() from public;
revoke execute on function public.iteros_profile_role() from public;
revoke execute on function public.iteros_has_action(text) from public;
revoke execute on function public.iteros_can_access_client(text) from public;
revoke execute on function public.iteros_has_ver_financeiro() from public;

grant execute on function public.iteros_profile_id() to authenticated;
grant execute on function public.iteros_is_admin() to authenticated;
grant execute on function public.iteros_profile_role() to authenticated;
grant execute on function public.iteros_has_action(text) to authenticated;
grant execute on function public.iteros_can_access_client(text) to authenticated;
grant execute on function public.iteros_has_ver_financeiro() to authenticated;
