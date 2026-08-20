-- Fase 1: fundação para Supabase Auth real.
--
-- Adiciona o vínculo entre o perfil interno (public.users, com IDs em texto
-- já usados pelas FKs em todo o schema) e a identidade de autenticação real
-- (auth.users, gerenciada pelo GoTrue). auth.users passa a ser responsável
-- por identidade/e-mail/senha/sessão; public.users continua sendo a única
-- fonte de verdade para perfil, cargo, áreas, ações e clientes permitidos —
-- auth.users.user_metadata nunca deve ser usado para autorização.
--
-- Não é destrutiva: coluna nova, nullable (a migração dos usuários reais
-- para Auth é gradual — Fase 2+), sem tocar em nenhuma linha existente,
-- sem remover `password` (ainda em uso pelo fluxo de login atual do
-- frontend). RLS final desse vínculo fica para a Fase 2.

alter table public.users
  add column auth_user_id uuid unique references auth.users(id);
