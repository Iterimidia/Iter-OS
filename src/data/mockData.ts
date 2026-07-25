/**
 * Dados fictícios coerentes com a operação da Iter Mídia — usados como seed
 * inicial do app (ver src/data/store.ts). Tudo aqui é substituível por
 * consultas ao Supabase futuramente; nenhuma tela deve importar este arquivo
 * diretamente além do store.
 */
import type {
  AppSettings,
  CalendarEvent,
  Client,
  ContentItem,
  DashboardCardDefinition,
  FileResource,
  FinancialEntry,
  Lead,
  Project,
  ReportDefinition,
  Task,
  User,
} from '@/types'
import { appSettingsDefaults } from '@/lib/theme'

const TODAY = new Date('2026-07-20T12:00:00')

/** Data ISO (yyyy-MM-dd) relativa a hoje — evita centenas de literais soltos. */
function iso(offsetDays: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------
export const mockUsers: User[] = [
  {
    id: 'usr_daniel',
    name: 'Daniel Michelin',
    email: 'daniel@itermidia.com.br',
    password: 'iter123',
    role: 'admin',
    jobTitle: 'CEO',
    avatarInitials: 'DM',
    avatarColor: '#7C6BFF',
    active: true,
    allowedBases: [],
    allowedAreas: [],
    allowedActions: [],
    allowedClientIds: 'all',
    allowedDashboardCards: 'all',
    createdAt: iso(-400),
  },
  {
    id: 'usr_raylhane',
    name: 'Raylhane',
    email: 'raylhane@itermidia.com.br',
    password: 'iter123',
    role: 'gestao_criativa',
    jobTitle: 'Gestão Criativa',
    avatarInitials: 'RA',
    avatarColor: '#22D3C4',
    active: true,
    allowedBases: [],
    allowedAreas: [],
    allowedActions: [],
    allowedClientIds: 'all',
    allowedDashboardCards: 'all',
    createdAt: iso(-380),
  },
  {
    id: 'usr_ester',
    name: 'Ester',
    email: 'ester@itermidia.com.br',
    password: 'iter123',
    role: 'criativo',
    jobTitle: 'Criativo',
    avatarInitials: 'ES',
    avatarColor: '#38BDF8',
    active: true,
    allowedBases: [],
    allowedAreas: [],
    allowedActions: [],
    allowedClientIds: 'all',
    allowedDashboardCards: 'all',
    createdAt: iso(-300),
  },
  {
    id: 'usr_melissa',
    name: 'Melissa',
    email: 'melissa@itermidia.com.br',
    password: 'iter123',
    role: 'criativo',
    jobTitle: 'Criativo',
    avatarInitials: 'ME',
    avatarColor: '#F5A623',
    active: true,
    allowedBases: [],
    allowedAreas: [],
    allowedActions: [],
    // demonstra a permissão por cliente: Melissa só acessa 2 dos 5 clientes.
    allowedClientIds: ['cli_parrilha', 'cli_quintal'],
    allowedDashboardCards: 'all',
    createdAt: iso(-250),
  },
  {
    id: 'usr_conselho',
    name: 'Conselho',
    email: 'conselho@itermidia.com.br',
    password: 'iter123',
    role: 'conselho',
    jobTitle: 'Conselho Consultivo',
    avatarInitials: 'CO',
    avatarColor: '#34D399',
    active: true,
    allowedBases: [],
    allowedAreas: [],
    allowedActions: [],
    allowedClientIds: 'all',
    allowedDashboardCards: 'all',
    createdAt: iso(-500),
  },
  {
    id: 'usr_pedro',
    name: 'Pedro Andrade',
    email: 'pedro@itermidia.com.br',
    password: 'iter123',
    role: 'operacional',
    jobTitle: 'Analista de Operações',
    avatarInitials: 'PA',
    avatarColor: '#60A5FA',
    active: true,
    allowedBases: [],
    allowedAreas: [],
    allowedActions: [],
    allowedClientIds: 'all',
    allowedDashboardCards: 'all',
    createdAt: iso(-200),
  },
  {
    id: 'usr_camila',
    name: 'Camila Nogueira',
    email: 'camila@itermidia.com.br',
    password: 'iter123',
    role: 'financeiro',
    jobTitle: 'Financeiro',
    avatarInitials: 'CN',
    avatarColor: '#EF4444',
    active: true,
    allowedBases: [],
    allowedAreas: [],
    allowedActions: [],
    allowedClientIds: 'all',
    allowedDashboardCards: 'all',
    createdAt: iso(-220),
  },
]

// ---------------------------------------------------------------------------
// Clientes — vazio de propósito: comece cadastrando os clientes reais pela
// tela Base Operacional → Clientes.
// ---------------------------------------------------------------------------
export const mockClients: Client[] = []

// ---------------------------------------------------------------------------
// Projetos — vazio de propósito: crie pela tela Base Operacional → Operação.
// ---------------------------------------------------------------------------
export const mockProjects: Project[] = []

// ---------------------------------------------------------------------------
// Tarefas — vazio de propósito: crie pela tela Base Operacional → Operação
// (ou Base Criativa, ajustando a área na criação).
// ---------------------------------------------------------------------------
export const mockTasks: Task[] = []

// ---------------------------------------------------------------------------
// Eventos de calendário manuais (reuniões). Prazos de tarefas, publicações,
// follow-ups e vencimentos financeiros são derivados automaticamente pelo
// src/lib/calendar.ts a partir das próprias coleções — não duplicar aqui.
// Vazio de propósito.
// ---------------------------------------------------------------------------
export const mockCalendarEvents: CalendarEvent[] = []

// ---------------------------------------------------------------------------
// Financeiro — vazio de propósito: lance receitas/despesas reais pela tela
// Base Operacional → Financeiro.
// ---------------------------------------------------------------------------
export const mockFinancialEntries: FinancialEntry[] = []

// ---------------------------------------------------------------------------
// Comercial — funil de leads. Vazio de propósito.
// ---------------------------------------------------------------------------
export const mockLeads: Lead[] = []

// ---------------------------------------------------------------------------
// Conteúdo criativo — vazio de propósito.
// ---------------------------------------------------------------------------
export const mockContentItems: ContentItem[] = []

// ---------------------------------------------------------------------------
// Arquivos / links organizados — vazio de propósito.
// ---------------------------------------------------------------------------
export const mockFiles: FileResource[] = []

// ---------------------------------------------------------------------------
// Cards do megadashboard (Base Geral) — visibilidade por papel.
// A área "Configuração de Visibilidade" permite ao admin ajustar overrides
// por usuário em cima disso (ver User.allowedDashboardCards).
// ---------------------------------------------------------------------------
export const mockDashboardCards: DashboardCardDefinition[] = [
  { id: 'card_receita_prevista', section: 'financeiro', title: 'Receita prevista', visibleToRoles: ['admin', 'direcao', 'conselho', 'financeiro'] },
  { id: 'card_receita_recebida', section: 'financeiro', title: 'Receita recebida', visibleToRoles: ['admin', 'direcao', 'conselho', 'financeiro'] },
  { id: 'card_contas_pendentes', section: 'financeiro', title: 'Contas pendentes', visibleToRoles: ['admin', 'direcao', 'financeiro'] },
  { id: 'card_despesas', section: 'financeiro', title: 'Despesas', visibleToRoles: ['admin', 'direcao', 'financeiro'] },
  { id: 'card_lucro_estimado', section: 'financeiro', title: 'Lucro estimado', visibleToRoles: ['admin', 'direcao', 'conselho', 'financeiro'] },

  { id: 'card_leads_abertos', section: 'comercial', title: 'Leads abertos', visibleToRoles: ['admin', 'direcao', 'operacional'] },
  { id: 'card_propostas_enviadas', section: 'comercial', title: 'Propostas enviadas', visibleToRoles: ['admin', 'direcao', 'operacional'] },
  { id: 'card_followups_pendentes', section: 'comercial', title: 'Follow-ups pendentes', visibleToRoles: ['admin', 'direcao', 'operacional'] },
  { id: 'card_negociacoes_andamento', section: 'comercial', title: 'Negociações em andamento', visibleToRoles: ['admin', 'direcao', 'operacional'] },

  { id: 'card_clientes_ativos', section: 'clientes', title: 'Clientes ativos', visibleToRoles: ['admin', 'direcao', 'conselho', 'operacional', 'gestao_criativa'] },
  { id: 'card_clientes_atencao', section: 'clientes', title: 'Clientes em atenção', visibleToRoles: ['admin', 'direcao', 'conselho', 'operacional', 'gestao_criativa'] },
  { id: 'card_clientes_risco', section: 'clientes', title: 'Clientes em risco', visibleToRoles: ['admin', 'direcao', 'conselho', 'operacional'] },
  { id: 'card_proximas_reunioes', section: 'clientes', title: 'Próximas reuniões', visibleToRoles: ['admin', 'direcao', 'conselho', 'operacional', 'gestao_criativa'] },

  { id: 'card_projetos_ativos', section: 'operacao', title: 'Projetos ativos', visibleToRoles: ['admin', 'direcao', 'conselho', 'operacional', 'gestao_criativa'] },
  { id: 'card_tarefas_abertas', section: 'operacao', title: 'Tarefas abertas', visibleToRoles: ['admin', 'direcao', 'operacional', 'gestao_criativa'] },
  { id: 'card_tarefas_atrasadas', section: 'operacao', title: 'Tarefas atrasadas', visibleToRoles: ['admin', 'direcao', 'operacional'] },
  { id: 'card_entregas_semana', section: 'operacao', title: 'Entregas da semana', visibleToRoles: ['admin', 'direcao', 'conselho', 'operacional', 'gestao_criativa'] },

  { id: 'card_conteudos_producao', section: 'criativo', title: 'Conteúdos em produção', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo'] },
  { id: 'card_reels_pendentes', section: 'criativo', title: 'Reels pendentes', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo'] },
  { id: 'card_carrosseis_pendentes', section: 'criativo', title: 'Carrosséis pendentes', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo'] },
  { id: 'card_aprovacoes_internas', section: 'criativo', title: 'Aprovações internas', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo'] },
  { id: 'card_aprovacoes_cliente', section: 'criativo', title: 'Aprovações do cliente', visibleToRoles: ['admin', 'direcao', 'gestao_criativa'] },
  { id: 'card_tarefas_criativas_atrasadas', section: 'criativo', title: 'Tarefas criativas atrasadas', visibleToRoles: ['admin', 'direcao', 'gestao_criativa'] },

  { id: 'card_cal_reunioes', section: 'calendario', title: 'Reuniões', visibleToRoles: ['admin', 'direcao', 'conselho', 'operacional', 'gestao_criativa'] },
  { id: 'card_cal_prazos', section: 'calendario', title: 'Prazos', visibleToRoles: ['admin', 'direcao', 'conselho', 'operacional', 'gestao_criativa', 'criativo'] },
  { id: 'card_cal_publicacoes', section: 'calendario', title: 'Publicações', visibleToRoles: ['admin', 'direcao', 'conselho', 'gestao_criativa', 'criativo'] },
  { id: 'card_cal_vencimentos', section: 'calendario', title: 'Vencimentos', visibleToRoles: ['admin', 'direcao', 'conselho', 'financeiro'] },
]

// ---------------------------------------------------------------------------
// Relatórios exportáveis
// ---------------------------------------------------------------------------
export const mockReports: ReportDefinition[] = [
  { id: 'rep_dashboard_geral', title: 'Dashboard Geral', description: 'Panorama consolidado da operação inteira.', requiredAction: 'exportar', scope: 'geral' },
  { id: 'rep_dashboard_operacional', title: 'Dashboard Operacional', description: 'Comercial, clientes, operação e financeiro.', requiredAction: 'exportar', scope: 'operacional' },
  { id: 'rep_dashboard_criativo', title: 'Dashboard Criativo', description: 'Produção de conteúdo e aprovações.', requiredAction: 'exportar', scope: 'criativo' },
  { id: 'rep_cliente', title: 'Relatório por Cliente', description: 'Visão consolidada de um cliente específico.', requiredAction: 'exportar', scope: 'cliente' },
  { id: 'rep_financeiro', title: 'Relatório Financeiro', description: 'Receitas, despesas e indicadores financeiros.', requiredAction: 'ver_financeiro', scope: 'operacional' },
  { id: 'rep_conteudo', title: 'Relatório de Conteúdo', description: 'Peças em produção, revisão e aprovação.', requiredAction: 'exportar', scope: 'criativo' },
  { id: 'rep_tarefas', title: 'Relatório de Tarefas', description: 'Tarefas por status, responsável e prazo.', requiredAction: 'exportar', scope: 'operacional' },
]

// ---------------------------------------------------------------------------
// Configurações do app
// ---------------------------------------------------------------------------
export const mockAppSettings: AppSettings = {
  companyName: 'Iter Mídia',
  loginSlogan: appSettingsDefaults.loginSlogan,
  dashboardSlogan: appSettingsDefaults.dashboardSlogan,
  loginBackgroundImageUrl: null,
  plans: ['Start', 'Essencial', 'Crescimento', 'Estratégico', 'Personalizado'],
  services: ['Social Media', 'Carrosséis', 'Reels', 'Stories', 'Landing Page', 'Site Institucional', 'Consultoria', 'Tráfego Pago', 'Branding'],
  clientStatuses: ['Ativo', 'Em atenção', 'Em risco', 'Inativo'],
  taskTypes: ['Roteiro', 'Design', 'Legenda', 'Publicação', 'Aprovação', 'Reel', 'Carrossel', 'Story', 'Capa de Reel', 'Thumbnail', 'Comercial', 'Financeiro', 'Contrato', 'Site', 'Tráfego Pago', 'Reunião', 'Relatório', 'Gestão', 'Arquivos'],
  integrations: [
    { id: 'int_supabase', name: 'Supabase', status: 'planejado', description: 'Banco de dados, autenticação e storage reais.' },
    { id: 'int_google_calendar', name: 'Google Calendar', status: 'planejado', description: 'Sincronização de prazos e reuniões.' },
    { id: 'int_google_drive', name: 'Google Drive', status: 'nao_conectado', description: 'Vínculo direto com pastas e arquivos.' },
    { id: 'int_gmail', name: 'Gmail', status: 'nao_conectado', description: 'Envio de propostas e relatórios por e-mail.' },
    { id: 'int_whatsapp', name: 'WhatsApp', status: 'em_breve', description: 'Notificações e follow-ups automáticos.' },
    { id: 'int_social_apis', name: 'APIs de redes sociais', status: 'em_breve', description: 'Métricas reais de Instagram e afins.' },
    { id: 'int_ai', name: 'Inteligência Artificial', status: 'planejado', description: 'Relatórios, resumos e sugestões automáticas.' },
  ],
}
