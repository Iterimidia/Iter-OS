-- Fixtures de teste para o projeto Iter OS Staging (e para dev/QA local).
-- NENHUM dado aqui é real: usuários, clientes, projetos, tarefas,
-- lançamentos financeiros e leads abaixo são inteiramente fictícios.
--
-- Aplicado automaticamente no bootstrap via `supabase/config.toml`
-- ([db.seed] sql_paths).
--
-- As senhas abaixo são placeholders óbvios e só existem porque a
-- coluna `users.password` ainda é texto plano, obrigatória e sem
-- vínculo com Supabase Auth (essa é justamente a vulnerabilidade
-- crítica documentada para eliminação nas próximas fases — não usar
-- estes valores como referência de "senha segura").
--
-- Todos os valores de status/tipo/área abaixo foram conferidos contra
-- `src/types/index.ts` e `src/lib/navigation.ts` (fonte única de verdade
-- da aplicação) para garantir que os fixtures são aceitos pela UI e pelo
-- motor de permissões (`src/lib/permissions.ts`) exatamente como dados
-- reais seriam.
--
-- Casos negativos incluídos, para exercitar o motor de permissões e a
-- futura RLS por usuário (não apenas o caminho "admin vê tudo"):
--   - seed_usuario_inativo: active=false → login deve ser recusado
--     independente de papel/permissões (ver src/features/auth/useAuth.ts).
--   - seed_operacional_restrito: allowed_client_ids = só Cliente Teste A →
--     Cliente Teste B deve ficar inacessível (canAccessClient nega).
--   - seed_operacional_restrito: papel 'operacional' não concede
--     'ver_financeiro' nem 'excluir' (nem por default do papel, nem por
--     allowed_actions do usuário) → operações financeiras e exclusão devem
--     ficar negadas (canPerformAction nega).

insert into public.users
  (id, name, email, password, role, job_title, avatar_initials, avatar_color, active,
   allowed_bases, allowed_areas, allowed_actions, allowed_client_ids, allowed_dashboard_cards, created_at)
values
  ('seed_admin', 'Seed Admin (teste)', 'seed.admin@teste.itermidia.invalid', 'FIXTURE_SENHA_FAKE_1', 'admin',
   'Admin de teste', 'SA', '#9C3D87', true,
   '["geral","operacional","criativo"]', '"all"', '["visualizar","criar","editar","excluir","exportar","aprovar","atribuir","alterar_status","ver_financeiro","gerenciar_usuarios"]',
   '"all"', '"all"', current_date - interval '30 days'),

  -- Caso positivo/negativo combinado: acesso permitido a Cliente Teste A,
  -- negado a Cliente Teste B; sem 'ver_financeiro' nem 'excluir' (nem via
  -- papel 'operacional', nem via allowed_actions abaixo).
  ('seed_operacional_restrito', 'Seed Operacional Restrito (teste)', 'seed.operacional@teste.itermidia.invalid', 'FIXTURE_SENHA_FAKE_2', 'operacional',
   'Analista de teste', 'OR', '#1F6E90', true,
   '["operacional"]', '["operacional:clientes","operacional:operacao","operacional:calendario"]', '["visualizar","criar","editar","alterar_status"]',
   '["seed_client_a"]', '["card_clientes_ativos","card_projetos_ativos","card_tarefas_abertas","card_entregas_semana"]', current_date - interval '20 days'),

  ('seed_financeiro', 'Seed Financeiro (teste)', 'seed.financeiro@teste.itermidia.invalid', 'FIXTURE_SENHA_FAKE_3', 'financeiro',
   'Financeiro de teste', 'SF', '#0A5580', true,
   '["operacional"]', '["operacional:financeiro","operacional:calendario"]', '["visualizar","criar","editar","exportar","ver_financeiro"]',
   '"all"', '["card_receita_prevista","card_receita_recebida","card_contas_pendentes","card_despesas","card_lucro_estimado"]', current_date - interval '15 days'),

  -- Caso negativo puro: usuário inativo. Deve ser recusado no login
  -- (useAuth.ts: "if (!user.active) return { ok: false, ... }") mesmo tendo
  -- as mesmas permissões do seed_operacional_restrito.
  ('seed_usuario_inativo', 'Seed Usuário Inativo (teste)', 'seed.inativo@teste.itermidia.invalid', 'FIXTURE_SENHA_FAKE_4', 'operacional',
   'Ex-analista de teste', 'UI', '#767992', false,
   '["operacional"]', '["operacional:clientes","operacional:operacao","operacional:calendario"]', '["visualizar","criar","editar","alterar_status"]',
   '["seed_client_a"]', '["card_clientes_ativos","card_projetos_ativos","card_tarefas_abertas","card_entregas_semana"]', current_date - interval '60 days');

insert into public.clients
  (id, name, status, plan, monthly_value, services, strategic_responsible_id, creative_responsible_id,
   drive_folder_url, briefing, next_meeting_at, pendencies, notes, segment, created_at, billing_type, commission_percentage)
values
  ('seed_client_a', 'Cliente Teste A', 'ativo', 'Crescimento', 4500, '["Social Media","Reels","Tráfego Pago"]',
   'seed_admin', 'seed_operacional_restrito', null, 'Briefing fictício para QA de branch de teste.',
   current_date + interval '7 days', null, 'Cliente fictício usado apenas para testes de RLS/QA.', 'Varejo (teste)',
   current_date - interval '90 days', 'fixo', null),

  -- Cliente B: propositalmente FORA do allowed_client_ids do
  -- seed_operacional_restrito, para exercitar a negação de acesso por
  -- cliente. billing_type 'percentual' exercita o outro ramo do tipo
  -- (o único diferente de 'fixo' aceito pela aplicação).
  ('seed_client_b', 'Cliente Teste B', 'em_atencao', 'Essencial', 2200, '["Social Media","Carrosséis"]',
   'seed_admin', 'seed_admin', null, null,
   null, 'Renovação de contrato pendente (fictício).', null, 'Serviços (teste)',
   current_date - interval '45 days', 'percentual', 12);

insert into public.projects
  (id, title, client_id, description, responsible_id, team_ids, status, start_date, end_date, priority, created_at)
values
  ('seed_project_a1', 'Campanha de lançamento (teste)', 'seed_client_a', 'Projeto fictício para QA.',
   'seed_operacional_restrito', '["seed_operacional_restrito"]', 'em_andamento', current_date - interval '10 days',
   current_date + interval '20 days', 'alta', current_date - interval '10 days'),

  -- client_id NULL de propósito: prova que a Fase 2 (B1) exige perfil ativo
  -- mesmo para registros internos sem cliente — não deve ficar visível a
  -- anon/inativo só por não ter client_id.
  ('seed_project_internal', 'Projeto interno (teste, sem cliente)', null, 'Fictício, para testar client_id IS NULL.',
   'seed_admin', '[]', 'em_andamento', null, null, 'media', current_date - interval '5 days');

insert into public.tasks
  (id, title, description, client_id, project_id, responsible_id, due_date, priority, status, type, area, created_at)
values
  ('seed_task_a1', 'Roteiro do reel de lançamento (teste)', 'Tarefa fictícia para QA.', 'seed_client_a',
   'seed_project_a1', 'seed_operacional_restrito', current_date + interval '3 days', 'alta', 'em_andamento',
   'Roteiro', 'operacional', current_date - interval '5 days');

-- scope é BaseId ('geral' | 'operacional' | 'criativo') — não 'cliente'.
insert into public.calendar_events
  (id, title, date, type, scope, client_id, task_id, status, priority, source)
values
  ('seed_event_a1', 'Reunião de alinhamento (teste)', current_date + interval '7 days', 'reuniao', 'operacional',
   'seed_client_a', null, 'agendado', 'media', 'manual'),

  -- scope 'criativo' + client_id NULL: prova que a fronteira de área/base
  -- (B3) e o fix de client_id IS NULL (B1) funcionam juntos — um papel sem
  -- acesso à base 'criativo' (ex: financeiro) não deve ver este evento.
  ('seed_event_criativo_only', 'Evento criativo (teste cruzamento de área)', current_date + interval '3 days',
   'reuniao', 'criativo', null, null, 'agendado', 'media', 'manual');

insert into public.financial_entries
  (id, type, category, description, client_id, amount, due_date, paid_date, status, recurring)
values
  ('seed_fin_a1', 'receita', 'Mensalidade', 'Mensalidade Cliente Teste A (fictício)', 'seed_client_a',
   4500, current_date + interval '10 days', null, 'pendente', true),
  ('seed_fin_a2', 'despesa', 'Ferramentas', 'Assinatura de ferramenta (fictício)', null,
   150, current_date - interval '2 days', current_date - interval '2 days', 'pago', true);

-- status é LeadStatus ('lead' é o estado inicial — não 'novo').
insert into public.leads
  (id, company_name, responsible_name, contact, instagram_or_site, segment, origin, status, service_interest,
   estimated_value, next_action, follow_up_date, notes, created_at)
values
  ('seed_lead_a1', 'Empresa Lead Teste', 'Contato Fictício', '(11) 90000-0000', '@leadteste', 'Varejo (teste)',
   'Indicação', 'lead', 'Social Media', 3000, 'Enviar proposta (fictício)', current_date + interval '4 days',
   'Lead fictício para QA.', current_date - interval '3 days');

-- status é DemandStatus ('em_producao' — não 'producao').
insert into public.content_items
  (id, client_id, project_id, format, theme, title, responsible_id, status, due_date, publish_date, caption,
   script, file_url, internal_approval, client_approval, comments, created_at)
values
  ('seed_content_a1', 'seed_client_a', 'seed_project_a1', 'reel', 'Lançamento', 'Reel de lançamento (teste)',
   'seed_operacional_restrito', 'em_producao', current_date + interval '2 days', current_date + interval '5 days',
   'Legenda fictícia.', 'Roteiro fictício.', null, false, false, '[]', current_date - interval '4 days');

insert into public.files
  (id, name, type, category, client_id, project_id, url, description, visible_to_roles, created_at)
values
  ('seed_file_a1', 'briefing-cliente-teste-a.pdf', 'pdf', 'briefing', 'seed_client_a', 'seed_project_a1',
   'https://example.invalid/fixtures/briefing-cliente-teste-a.pdf', 'Arquivo fictício para QA.',
   '["admin","direcao","operacional","gestao_criativa"]', current_date - interval '9 days');

insert into public.delivery_plan_items
  (id, client_id, label, monthly_quantity, format, created_at)
values
  ('seed_plan_a1', 'seed_client_a', 'Posts feed', 6, 'post_estatico', current_date - interval '10 days'),
  ('seed_plan_a2', 'seed_client_a', 'Reels', 2, 'reel', current_date - interval '10 days');

insert into public.delivery_units
  (id, plan_item_id, client_id, month, status, created_at)
values
  ('seed_unit_a1', 'seed_plan_a1', 'seed_client_a', to_char(current_date, 'YYYY-MM'), 'entregue', current_date - interval '10 days'),
  ('seed_unit_a2', 'seed_plan_a1', 'seed_client_a', to_char(current_date, 'YYYY-MM'), 'em_producao', current_date - interval '10 days'),
  ('seed_unit_a3', 'seed_plan_a2', 'seed_client_a', to_char(current_date, 'YYYY-MM'), 'pendente', current_date - interval '10 days');
