-- Esta migration é replicada automaticamente por qualquer bootstrap
-- (supabase db reset, criação de projeto/branch novo). Por isso ela contém
-- SOMENTE dados de referência/configuração (dashboard_cards, app_settings) —
-- nenhuma informação pessoal real.
--
-- Em produção, esta migration originalmente também inseriu o usuário
-- administrador real (nome/e-mail reais). Esse insert foi deliberadamente
-- movido para fora deste arquivo, para `supabase/production-only/
-- 20260727161812_admin_user_bootstrap.sql` — uma pasta que nenhum processo
-- automatizado lê, mantida só para registro histórico/auditoria (com a
-- senha já redigida). Ver esse arquivo e o README para o motivo completo.
-- Juntos, os dois arquivos reproduzem exatamente o que rodou em produção;
-- separados, este aqui sozinho é seguro para rodar em qualquer ambiente
-- novo (staging, local, CI) sem criar dado pessoal real.

insert into public.dashboard_cards (id, section, title, visible_to_roles) values
('card_receita_prevista', 'financeiro', 'Receita prevista', '["admin","direcao","conselho","financeiro"]'),
('card_receita_recebida', 'financeiro', 'Receita recebida', '["admin","direcao","conselho","financeiro"]'),
('card_contas_pendentes', 'financeiro', 'Contas pendentes', '["admin","direcao","financeiro"]'),
('card_despesas', 'financeiro', 'Despesas', '["admin","direcao","financeiro"]'),
('card_lucro_estimado', 'financeiro', 'Lucro estimado', '["admin","direcao","conselho","financeiro"]'),
('card_leads_abertos', 'comercial', 'Leads abertos', '["admin","direcao","operacional"]'),
('card_propostas_enviadas', 'comercial', 'Propostas enviadas', '["admin","direcao","operacional"]'),
('card_followups_pendentes', 'comercial', 'Follow-ups pendentes', '["admin","direcao","operacional"]'),
('card_negociacoes_andamento', 'comercial', 'Negociações em andamento', '["admin","direcao","operacional"]'),
('card_clientes_ativos', 'clientes', 'Clientes ativos', '["admin","direcao","conselho","operacional","gestao_criativa"]'),
('card_clientes_atencao', 'clientes', 'Clientes em atenção', '["admin","direcao","conselho","operacional","gestao_criativa"]'),
('card_clientes_risco', 'clientes', 'Clientes em risco', '["admin","direcao","conselho","operacional"]'),
('card_proximas_reunioes', 'clientes', 'Próximas reuniões', '["admin","direcao","conselho","operacional","gestao_criativa"]'),
('card_projetos_ativos', 'operacao', 'Projetos ativos', '["admin","direcao","conselho","operacional","gestao_criativa"]'),
('card_tarefas_abertas', 'operacao', 'Tarefas abertas', '["admin","direcao","operacional","gestao_criativa"]'),
('card_tarefas_atrasadas', 'operacao', 'Tarefas atrasadas', '["admin","direcao","operacional"]'),
('card_entregas_semana', 'operacao', 'Entregas da semana', '["admin","direcao","conselho","operacional","gestao_criativa"]'),
('card_conteudos_producao', 'criativo', 'Conteúdos em produção', '["admin","direcao","gestao_criativa","criativo"]'),
('card_reels_pendentes', 'criativo', 'Reels pendentes', '["admin","direcao","gestao_criativa","criativo"]'),
('card_carrosseis_pendentes', 'criativo', 'Carrosséis pendentes', '["admin","direcao","gestao_criativa","criativo"]'),
('card_aprovacoes_internas', 'criativo', 'Aprovações internas', '["admin","direcao","gestao_criativa","criativo"]'),
('card_aprovacoes_cliente', 'criativo', 'Aprovações do cliente', '["admin","direcao","gestao_criativa"]'),
('card_tarefas_criativas_atrasadas', 'criativo', 'Tarefas criativas atrasadas', '["admin","direcao","gestao_criativa"]'),
('card_cal_reunioes', 'calendario', 'Reuniões', '["admin","direcao","conselho","operacional","gestao_criativa"]'),
('card_cal_prazos', 'calendario', 'Prazos', '["admin","direcao","conselho","operacional","gestao_criativa","criativo"]'),
('card_cal_publicacoes', 'calendario', 'Publicações', '["admin","direcao","conselho","gestao_criativa","criativo"]'),
('card_cal_vencimentos', 'calendario', 'Vencimentos', '["admin","direcao","conselho","financeiro"]');

insert into public.app_settings (id, company_name, login_slogan, dashboard_slogan, login_background_image_url, plans, services, client_statuses, task_types, integrations)
values (
  1,
  'Iter Mídia',
  'Marketing que move resultado.',
  'Tudo o que sua operação precisa, em um só lugar.',
  null,
  '["Start","Essencial","Crescimento","Estratégico","Personalizado"]',
  '["Social Media","Carrosséis","Reels","Stories","Landing Page","Site Institucional","Consultoria","Tráfego Pago","Branding"]',
  '["Ativo","Em atenção","Em risco","Inativo"]',
  '["Roteiro","Design","Legenda","Publicação","Aprovação","Reel","Carrossel","Story","Capa de Reel","Thumbnail","Comercial","Financeiro","Contrato","Site","Tráfego Pago","Reunião","Relatório","Gestão","Arquivos"]',
  '[{"id":"int_supabase","name":"Supabase","status":"conectado","description":"Banco de dados, autenticação e storage reais."},{"id":"int_google_calendar","name":"Google Calendar","status":"planejado","description":"Sincronização de prazos e reuniões."},{"id":"int_google_drive","name":"Google Drive","status":"nao_conectado","description":"Vínculo direto com pastas e arquivos."},{"id":"int_gmail","name":"Gmail","status":"nao_conectado","description":"Envio de propostas e relatórios por e-mail."},{"id":"int_whatsapp","name":"WhatsApp","status":"em_breve","description":"Notificações e follow-ups automáticos."},{"id":"int_social_apis","name":"APIs de redes sociais","status":"em_breve","description":"Métricas reais de Instagram e afins."},{"id":"int_ai","name":"Inteligência Artificial","status":"planejado","description":"Relatórios, resumos e sugestões automáticas."}]'
);
