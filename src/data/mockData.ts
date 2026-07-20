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
// Clientes
// ---------------------------------------------------------------------------
export const mockClients: Client[] = [
  {
    id: 'cli_parrilha',
    name: 'Parrilha & Brasa',
    status: 'em_atencao',
    plan: 'Crescimento',
    services: ['Social Media', 'Reels', 'Carrosséis'],
    strategicResponsibleId: 'usr_daniel',
    creativeResponsibleId: 'usr_raylhane',
    driveFolderUrl: 'https://drive.google.com/drive/folders/parrilha-brasa',
    segment: 'Gastronomia',
    briefing: 'Churrascaria premium, tom descontraído e visual quente (fogo, brasa, encontros).',
    nextMeetingAt: iso(3),
    pendencies: 'Falta de material recente — aguardando coleta de conteúdo em loco.',
    notes: 'Cliente sensível a prazo de resposta; historicamente atrasa envio de fotos.',
    createdAt: iso(-260),
  },
  {
    id: 'cli_rodrigo',
    name: 'Rodrigo Mocellin',
    status: 'ativo',
    plan: 'Essencial',
    services: ['Carrosséis', 'Reels', 'Capas', 'Estratégia de Conteúdo'],
    strategicResponsibleId: 'usr_daniel',
    creativeResponsibleId: 'usr_raylhane',
    driveFolderUrl: 'https://drive.google.com/drive/folders/rodrigo-mocellin',
    segment: 'Criador de conteúdo',
    briefing: 'Posicionamento pessoal, conteúdo educativo com estética minimalista.',
    nextMeetingAt: iso(7),
    pendencies: 'Aprovação de materiais da semana.',
    createdAt: iso(-310),
  },
  {
    id: 'cli_quintal',
    name: 'Quintal Escola',
    status: 'em_risco',
    plan: 'Start',
    services: ['Social Media', 'Stories'],
    strategicResponsibleId: 'usr_daniel',
    creativeResponsibleId: 'usr_raylhane',
    driveFolderUrl: 'https://drive.google.com/drive/folders/quintal-escola',
    segment: 'Educação infantil',
    briefing: 'Comunicação acolhedora para pais, foco em rotina e segurança.',
    nextMeetingAt: iso(12),
    pendencies: 'Sem resposta do cliente há 2 semanas — risco de cancelamento do plano.',
    createdAt: iso(-190),
  },
  {
    id: 'cli_itercontabil',
    name: 'Iter Gestão Contábil',
    status: 'ativo',
    plan: 'Estratégico',
    services: ['Social Media', 'Landing Page', 'Consultoria'],
    strategicResponsibleId: 'usr_daniel',
    creativeResponsibleId: 'usr_raylhane',
    driveFolderUrl: 'https://drive.google.com/drive/folders/iter-gestao-contabil',
    segment: 'Contabilidade',
    briefing: 'Autoridade e confiança para PMEs; conteúdo educativo sobre tributos.',
    nextMeetingAt: iso(5),
    createdAt: iso(-150),
  },
  {
    id: 'cli_itercrescere',
    name: 'Iter Crescere',
    status: 'ativo',
    plan: 'Personalizado',
    services: ['Landing Page', 'Site Institucional', 'Tráfego Pago'],
    strategicResponsibleId: 'usr_daniel',
    creativeResponsibleId: 'usr_raylhane',
    driveFolderUrl: 'https://drive.google.com/drive/folders/iter-crescere',
    segment: 'Educação / mentoria',
    briefing: 'Programa de aceleração para pequenos negócios; captação via landing page.',
    nextMeetingAt: iso(9),
    createdAt: iso(-90),
  },
]

// ---------------------------------------------------------------------------
// Projetos
// ---------------------------------------------------------------------------
export const mockProjects: Project[] = [
  {
    id: 'proj_calendario_editorial',
    title: 'Calendário Editorial — Julho',
    clientId: 'cli_rodrigo',
    description: 'Planejamento e produção do calendário editorial mensal.',
    responsibleId: 'usr_raylhane',
    teamIds: ['usr_ester', 'usr_melissa'],
    status: 'em_andamento',
    startDate: iso(-15),
    endDate: iso(10),
    priority: 'alta',
    createdAt: iso(-15),
  },
  {
    id: 'proj_conteudo_semanal',
    title: 'Conteúdo Semanal',
    clientId: 'cli_parrilha',
    description: 'Produção semanal de posts, stories e reels.',
    responsibleId: 'usr_raylhane',
    teamIds: ['usr_ester'],
    status: 'em_andamento',
    startDate: iso(-30),
    endDate: iso(20),
    priority: 'alta',
    createdAt: iso(-30),
  },
  {
    id: 'proj_stories_quintal',
    title: 'Sequência de Stories',
    clientId: 'cli_quintal',
    description: 'Sequência de stories institucionais para reforço de matrícula.',
    responsibleId: 'usr_melissa',
    teamIds: ['usr_melissa'],
    status: 'planejamento',
    startDate: iso(2),
    endDate: iso(25),
    priority: 'media',
    createdAt: iso(-5),
  },
  {
    id: 'proj_landing_crescere',
    title: 'Landing Page — Iter Crescere',
    clientId: 'cli_itercrescere',
    description: 'Landing page de captação para o programa de aceleração.',
    responsibleId: 'usr_daniel',
    teamIds: ['usr_pedro'],
    status: 'em_andamento',
    startDate: iso(-20),
    endDate: iso(15),
    priority: 'urgente',
    createdAt: iso(-20),
  },
  {
    id: 'proj_estrategia_contabil',
    title: 'Estratégia de Conteúdo',
    clientId: 'cli_itercontabil',
    description: 'Reestruturação da linha editorial e autoridade digital.',
    responsibleId: 'usr_daniel',
    teamIds: ['usr_raylhane', 'usr_pedro'],
    status: 'planejamento',
    startDate: iso(5),
    endDate: iso(40),
    priority: 'media',
    createdAt: iso(-2),
  },
]

// ---------------------------------------------------------------------------
// Tarefas
// ---------------------------------------------------------------------------
export const mockTasks: Task[] = [
  { id: 'tsk_01', title: 'Criar roteiro de carrossel', clientId: 'cli_rodrigo', projectId: 'proj_calendario_editorial', responsibleId: 'usr_ester', dueDate: iso(-2), priority: 'alta', status: 'ajustes_necessarios', type: 'Roteiro', area: 'criativo', createdAt: iso(-9) },
  { id: 'tsk_02', title: 'Design de post', clientId: 'cli_parrilha', projectId: 'proj_conteudo_semanal', responsibleId: 'usr_ester', dueDate: iso(-1), priority: 'alta', status: 'em_andamento', type: 'Design', area: 'criativo', createdAt: iso(-6) },
  { id: 'tsk_03', title: 'Revisar legenda', clientId: 'cli_rodrigo', projectId: 'proj_calendario_editorial', responsibleId: 'usr_melissa', dueDate: iso(0), priority: 'media', status: 'aguardando_revisao', type: 'Legenda', area: 'criativo', createdAt: iso(-3) },
  { id: 'tsk_04', title: 'Agendar publicação', clientId: 'cli_parrilha', projectId: 'proj_conteudo_semanal', responsibleId: 'usr_raylhane', dueDate: iso(1), priority: 'media', status: 'a_fazer', type: 'Publicação', area: 'criativo', createdAt: iso(-1) },
  { id: 'tsk_05', title: 'Enviar aprovação para cliente', clientId: 'cli_quintal', projectId: 'proj_stories_quintal', responsibleId: 'usr_melissa', dueDate: iso(2), priority: 'media', status: 'aguardando_cliente', type: 'Aprovação', area: 'criativo', createdAt: iso(-2) },
  { id: 'tsk_06', title: 'Produzir reel de bastidores', clientId: 'cli_parrilha', projectId: 'proj_conteudo_semanal', responsibleId: 'usr_ester', dueDate: iso(3), priority: 'alta', status: 'em_andamento', type: 'Reel', area: 'criativo', createdAt: iso(-4) },
  { id: 'tsk_07', title: 'Criar capa de reel', clientId: 'cli_rodrigo', projectId: 'proj_calendario_editorial', responsibleId: 'usr_melissa', dueDate: iso(4), priority: 'baixa', status: 'a_fazer', type: 'Capa de Reel', area: 'criativo', createdAt: iso(-1) },
  { id: 'tsk_08', title: 'Montar carrossel institucional', clientId: 'cli_quintal', projectId: 'proj_stories_quintal', responsibleId: 'usr_melissa', dueDate: iso(5), priority: 'media', status: 'em_andamento', type: 'Carrossel', area: 'criativo', createdAt: iso(-2) },
  { id: 'tsk_09', title: 'Revisar brandbook para novos posts', clientId: 'cli_itercontabil', projectId: 'proj_estrategia_contabil', responsibleId: 'usr_raylhane', dueDate: iso(6), priority: 'baixa', status: 'a_fazer', type: 'Referência', area: 'criativo', createdAt: iso(0) },
  { id: 'tsk_10', title: 'Gravar stories institucionais', clientId: 'cli_quintal', projectId: 'proj_stories_quintal', responsibleId: 'usr_ester', dueDate: iso(7), priority: 'media', status: 'a_fazer', type: 'Story', area: 'criativo', createdAt: iso(0) },
  { id: 'tsk_11', title: 'Ajustar thumbnail do reel', clientId: 'cli_rodrigo', projectId: 'proj_calendario_editorial', responsibleId: 'usr_melissa', dueDate: iso(-4), priority: 'media', status: 'ajustes_necessarios', type: 'Thumbnail', area: 'criativo', createdAt: iso(-8) },
  { id: 'tsk_12', title: 'Publicar carrossel aprovado', clientId: 'cli_parrilha', projectId: 'proj_conteudo_semanal', responsibleId: 'usr_raylhane', dueDate: iso(8), priority: 'media', status: 'aprovado', type: 'Carrossel', area: 'criativo', createdAt: iso(-3) },
  { id: 'tsk_13', title: 'Publicar reel semanal', clientId: 'cli_rodrigo', projectId: 'proj_calendario_editorial', responsibleId: 'usr_ester', dueDate: iso(-6), priority: 'media', status: 'publicado', type: 'Reel', area: 'criativo', createdAt: iso(-12), completedAt: iso(-6) },
  { id: 'tsk_14', title: 'Enviar relatório de aprovações', clientId: 'cli_quintal', projectId: 'proj_stories_quintal', responsibleId: 'usr_melissa', dueDate: iso(-8), priority: 'baixa', status: 'concluido', type: 'Aprovação', area: 'criativo', createdAt: iso(-14), completedAt: iso(-8) },

  { id: 'tsk_15', title: 'Montar proposta comercial', responsibleId: 'usr_daniel', dueDate: iso(1), priority: 'alta', status: 'em_andamento', type: 'Comercial', area: 'operacional', createdAt: iso(-3) },
  { id: 'tsk_16', title: 'Atualizar status financeiro', responsibleId: 'usr_camila', dueDate: iso(2), priority: 'media', status: 'a_fazer', type: 'Financeiro', area: 'operacional', createdAt: iso(-1) },
  { id: 'tsk_17', title: 'Follow-up comercial — Studio Fit Academia', responsibleId: 'usr_pedro', dueDate: iso(3), priority: 'media', status: 'a_fazer', type: 'Comercial', area: 'operacional', createdAt: iso(0) },
  { id: 'tsk_18', title: 'Revisar contrato Iter Crescere', clientId: 'cli_itercrescere', projectId: 'proj_landing_crescere', responsibleId: 'usr_daniel', dueDate: iso(-3), priority: 'alta', status: 'ajustes_necessarios', type: 'Contrato', area: 'operacional', createdAt: iso(-10) },
  { id: 'tsk_19', title: 'Publicar landing page', clientId: 'cli_itercrescere', projectId: 'proj_landing_crescere', responsibleId: 'usr_pedro', dueDate: iso(9), priority: 'urgente', status: 'em_andamento', type: 'Site', area: 'operacional', createdAt: iso(-6) },
  { id: 'tsk_20', title: 'Reunião de alinhamento mensal', responsibleId: 'usr_daniel', dueDate: iso(4), priority: 'media', status: 'a_fazer', type: 'Reunião', area: 'operacional', createdAt: iso(-1) },
  { id: 'tsk_21', title: 'Cobrar pendência financeira', clientId: 'cli_parrilha', responsibleId: 'usr_camila', dueDate: iso(-1), priority: 'alta', status: 'aguardando_cliente', type: 'Financeiro', area: 'operacional', createdAt: iso(-5) },
  { id: 'tsk_22', title: 'Fechar relatório mensal de resultados', responsibleId: 'usr_daniel', dueDate: iso(12), priority: 'media', status: 'a_fazer', type: 'Relatório', area: 'operacional', createdAt: iso(0) },
  { id: 'tsk_23', title: 'Organizar arquivos do Drive', clientId: 'cli_itercontabil', responsibleId: 'usr_pedro', dueDate: iso(6), priority: 'baixa', status: 'a_fazer', type: 'Arquivos', area: 'operacional', createdAt: iso(-1) },
  { id: 'tsk_24', title: 'Revisar briefing de novo cliente', responsibleId: 'usr_daniel', dueDate: iso(2), priority: 'alta', status: 'em_andamento', type: 'Comercial', area: 'operacional', createdAt: iso(-2) },
  { id: 'tsk_25', title: 'Configurar tráfego pago', clientId: 'cli_itercrescere', projectId: 'proj_landing_crescere', responsibleId: 'usr_pedro', dueDate: iso(10), priority: 'alta', status: 'a_fazer', type: 'Tráfego Pago', area: 'operacional', createdAt: iso(-1) },
  { id: 'tsk_26', title: 'Emitir nota de serviços do mês', responsibleId: 'usr_camila', dueDate: iso(5), priority: 'media', status: 'a_fazer', type: 'Financeiro', area: 'operacional', createdAt: iso(0) },
  { id: 'tsk_27', title: 'Validar entrega semanal com Raylhane', responsibleId: 'usr_daniel', dueDate: iso(1), priority: 'media', status: 'em_andamento', type: 'Gestão', area: 'operacional', createdAt: iso(-2) },
  { id: 'tsk_28', title: 'Revisar carga de trabalho da equipe criativa', responsibleId: 'usr_raylhane', dueDate: iso(3), priority: 'baixa', status: 'a_fazer', type: 'Gestão', area: 'operacional', createdAt: iso(-1) },
]

// ---------------------------------------------------------------------------
// Eventos de calendário manuais (reuniões). Prazos de tarefas, publicações,
// follow-ups e vencimentos financeiros são derivados automaticamente pelo
// src/lib/calendar.ts a partir das próprias coleções — não duplicar aqui.
// ---------------------------------------------------------------------------
export const mockCalendarEvents: CalendarEvent[] = [
  { id: 'evt_01', title: 'Reunião de alinhamento — Parrilha & Brasa', date: iso(3), type: 'reuniao', scope: 'operacional', clientId: 'cli_parrilha', source: 'manual' },
  { id: 'evt_02', title: 'Reunião mensal de resultados', date: iso(12), type: 'reuniao', scope: 'geral', source: 'manual' },
  { id: 'evt_03', title: 'Apresentação de estratégia — Iter Gestão Contábil', date: iso(5), type: 'reuniao', scope: 'operacional', clientId: 'cli_itercontabil', source: 'manual' },
  { id: 'evt_04', title: 'Reunião de briefing — Iter Crescere', date: iso(9), type: 'reuniao', scope: 'operacional', clientId: 'cli_itercrescere', source: 'manual' },
  { id: 'evt_05', title: 'Reunião de pauta criativa', date: iso(6), type: 'reuniao', scope: 'criativo', source: 'manual' },
  { id: 'evt_06', title: 'Reunião com o conselho', date: iso(15), type: 'reuniao', scope: 'geral', source: 'manual' },
]

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------
export const mockFinancialEntries: FinancialEntry[] = [
  { id: 'fin_01', type: 'receita', category: 'Mensalidade', description: 'Mensalidade — Parrilha & Brasa', clientId: 'cli_parrilha', amount: 3200, dueDate: iso(-5), paidDate: iso(-5), status: 'pago', recurring: true },
  { id: 'fin_02', type: 'receita', category: 'Mensalidade', description: 'Mensalidade — Rodrigo Mocellin', clientId: 'cli_rodrigo', amount: 1800, dueDate: iso(-2), paidDate: iso(-2), status: 'pago', recurring: true },
  { id: 'fin_03', type: 'receita', category: 'Mensalidade', description: 'Mensalidade — Quintal Escola', clientId: 'cli_quintal', amount: 1500, dueDate: iso(2), status: 'pendente', recurring: true },
  { id: 'fin_04', type: 'receita', category: 'Mensalidade', description: 'Mensalidade — Iter Gestão Contábil', clientId: 'cli_itercontabil', amount: 4200, dueDate: iso(-10), status: 'vencido', recurring: true },
  { id: 'fin_05', type: 'receita', category: 'Projeto', description: 'Landing page — 1ª parcela', clientId: 'cli_itercrescere', amount: 6000, dueDate: iso(10), status: 'previsto' },
  { id: 'fin_06', type: 'receita', category: 'Serviço avulso', description: 'Pacote extra de reels', clientId: 'cli_rodrigo', amount: 800, dueDate: iso(15), status: 'previsto' },
  { id: 'fin_07', type: 'despesa', category: 'Softwares', description: 'Assinaturas de ferramentas de design', amount: 450, dueDate: iso(1), status: 'pendente', recurring: true },
  { id: 'fin_08', type: 'despesa', category: 'Tráfego Pago', description: 'Mídia — Iter Crescere', clientId: 'cli_itercrescere', amount: 2000, dueDate: iso(4), status: 'previsto' },
  { id: 'fin_09', type: 'despesa', category: 'Equipe', description: 'Freelancer de vídeo', amount: 900, dueDate: iso(-1), status: 'vencido' },
  { id: 'fin_10', type: 'despesa', category: 'Infraestrutura', description: 'Aluguel / infraestrutura do escritório', amount: 1200, dueDate: iso(5), status: 'previsto', recurring: true },
  { id: 'fin_11', type: 'despesa', category: 'Softwares', description: 'Banco de imagens e fontes', amount: 180, dueDate: iso(8), status: 'previsto', recurring: true },
  { id: 'fin_12', type: 'despesa', category: 'Administrativo', description: 'Contabilidade', amount: 350, dueDate: iso(-6), paidDate: iso(-6), status: 'pago', recurring: true },
  { id: 'fin_13', type: 'receita', category: 'Serviço avulso', description: 'Pacote de reels extra', clientId: 'cli_parrilha', amount: 600, dueDate: iso(6), status: 'pendente' },
  { id: 'fin_14', type: 'receita', category: 'Setup', description: 'Setup inicial', clientId: 'cli_quintal', amount: 500, dueDate: iso(-15), paidDate: iso(-15), status: 'pago' },
  { id: 'fin_15', type: 'receita', category: 'Projeto', description: 'Landing page — 2ª parcela', clientId: 'cli_itercrescere', amount: 6000, dueDate: iso(25), status: 'previsto' },
  { id: 'fin_16', type: 'despesa', category: 'Softwares', description: 'Assinatura de ferramentas de IA', amount: 220, dueDate: iso(3), status: 'pendente', recurring: true },
  { id: 'fin_17', type: 'despesa', category: 'Infraestrutura', description: 'Sala de reunião / co-working', amount: 300, dueDate: iso(9), status: 'previsto' },
  { id: 'fin_18', type: 'receita', category: 'Mensalidade', description: 'Mensalidade — próximo ciclo', clientId: 'cli_rodrigo', amount: 1800, dueDate: iso(28), status: 'previsto', recurring: true },
]

// ---------------------------------------------------------------------------
// Comercial — funil de leads
// ---------------------------------------------------------------------------
export const mockLeads: Lead[] = [
  { id: 'lead_01', companyName: 'Studio Fit Academia', responsibleName: 'Marcos Lima', contact: '(45) 99911-2233', instagramOrSite: '@studiofitacademia', segment: 'Fitness', origin: 'Indicação', status: 'lead', serviceInterest: 'Social Media', estimatedValue: 1800, nextAction: 'Agendar diagnóstico', followUpDate: iso(2), notes: 'Chegou por indicação da Quintal Escola.', createdAt: iso(-4) },
  { id: 'lead_02', companyName: 'Doce Ponto Confeitaria', responsibleName: 'Juliana Prado', contact: '(45) 99822-1010', instagramOrSite: '@docepontoconfeitaria', segment: 'Gastronomia', origin: 'Instagram Ads', status: 'contato_iniciado', serviceInterest: 'Reels', estimatedValue: 1400, nextAction: 'Enviar case de Parrilha & Brasa', followUpDate: iso(1), createdAt: iso(-7) },
  { id: 'lead_03', companyName: 'Ótica Visão Clara', responsibleName: 'Renato Sales', contact: '(45) 99733-4455', segment: 'Saúde / Óptica', origin: 'Site', status: 'diagnostico', serviceInterest: 'Consultoria', estimatedValue: 2200, nextAction: 'Levantar briefing completo', followUpDate: iso(3), createdAt: iso(-10) },
  { id: 'lead_04', companyName: 'Advocacia Bittencourt', responsibleName: 'Fernanda Bittencourt', contact: '(45) 99644-7788', segment: 'Jurídico', origin: 'LinkedIn', status: 'proposta_enviada', serviceInterest: 'Branding', estimatedValue: 5200, nextAction: 'Aguardar retorno da proposta', followUpDate: iso(4), createdAt: iso(-14) },
  { id: 'lead_05', companyName: 'Grupo Nutre Bem', responsibleName: 'Carla Menezes', contact: '(45) 99555-1122', segment: 'Nutrição', origin: 'Indicação', status: 'follow_up', serviceInterest: 'Site Institucional', estimatedValue: 3800, nextAction: 'Retomar contato pós-proposta', followUpDate: iso(-1), notes: 'Follow-up atrasado — priorizar.', createdAt: iso(-20) },
  { id: 'lead_06', companyName: 'Quintal Escola — Expansão', responsibleName: 'Diretoria Quintal', contact: '(45) 99666-3344', segment: 'Educação infantil', origin: 'Cliente atual', status: 'proposta_enviada', serviceInterest: 'Tráfego Pago', estimatedValue: 2600, nextAction: 'Follow-up da proposta de tráfego', followUpDate: iso(3), createdAt: iso(-6) },
  { id: 'lead_07', companyName: 'Rodrigo Mocellin — Upsell Estratégia', responsibleName: 'Rodrigo Mocellin', contact: 'contato@rodrigomocellin.com', segment: 'Consultoria', origin: 'Cliente atual', status: 'fechado', serviceInterest: 'Estratégia de Conteúdo', estimatedValue: 1800, nextAction: 'Onboarding concluído', notes: 'Upsell fechado com cliente já ativo.', createdAt: iso(-35) },
  { id: 'lead_08', companyName: 'Pet Shop Amigo Fiel', responsibleName: 'Bruno Castro', contact: '(45) 99311-9900', segment: 'Pet', origin: 'Instagram Ads', status: 'perdido', serviceInterest: 'Social Media', estimatedValue: 1200, notes: 'Optou por concorrente com preço menor.', createdAt: iso(-40) },
]

// ---------------------------------------------------------------------------
// Conteúdo criativo
// ---------------------------------------------------------------------------
export const mockContentItems: ContentItem[] = [
  { id: 'cnt_01', clientId: 'cli_rodrigo', projectId: 'proj_calendario_editorial', format: 'carrossel', theme: 'Produtividade', title: '5 hábitos de produtividade', responsibleId: 'usr_ester', status: 'em_producao', dueDate: iso(1), publishDate: iso(3), caption: '5 hábitos que mudaram minha rotina...', internalApproval: false, clientApproval: false, createdAt: iso(-5) },
  { id: 'cnt_02', clientId: 'cli_parrilha', projectId: 'proj_conteudo_semanal', format: 'reel', theme: 'Bastidores', title: 'Bastidores da brasa', responsibleId: 'usr_ester', status: 'em_revisao_interna', dueDate: iso(0), publishDate: iso(2), internalApproval: false, clientApproval: false, createdAt: iso(-6) },
  { id: 'cnt_03', clientId: 'cli_quintal', projectId: 'proj_stories_quintal', format: 'story', theme: 'Rotina escolar', title: 'Um dia no Quintal', responsibleId: 'usr_melissa', status: 'aguardando_cliente', dueDate: iso(-1), publishDate: iso(4), internalApproval: true, clientApproval: false, createdAt: iso(-8) },
  { id: 'cnt_04', clientId: 'cli_rodrigo', projectId: 'proj_calendario_editorial', format: 'legenda', theme: 'Storytelling', title: 'Legenda — carrossel de hábitos', responsibleId: 'usr_melissa', status: 'a_fazer', dueDate: iso(2), internalApproval: false, clientApproval: false, createdAt: iso(-2) },
  { id: 'cnt_05', clientId: 'cli_parrilha', projectId: 'proj_conteudo_semanal', format: 'post_estatico', theme: 'Promoção', title: 'Happy hour de quinta', responsibleId: 'usr_ester', status: 'aprovado', dueDate: iso(-2), publishDate: iso(1), internalApproval: true, clientApproval: true, createdAt: iso(-9) },
  { id: 'cnt_06', clientId: 'cli_itercontabil', projectId: 'proj_estrategia_contabil', format: 'carrossel', theme: 'Educação tributária', title: 'MEI sem dor de cabeça', responsibleId: 'usr_raylhane', status: 'a_fazer', dueDate: iso(6), internalApproval: false, clientApproval: false, createdAt: iso(-1) },
  { id: 'cnt_07', clientId: 'cli_itercrescere', projectId: 'proj_landing_crescere', format: 'landing_page', theme: 'Captação', title: 'Landing page — programa de aceleração', responsibleId: 'usr_pedro', status: 'em_producao', dueDate: iso(9), internalApproval: false, clientApproval: false, createdAt: iso(-15) },
  { id: 'cnt_08', clientId: 'cli_rodrigo', projectId: 'proj_calendario_editorial', format: 'capa_reel', theme: 'Identidade visual', title: 'Capa — série produtividade', responsibleId: 'usr_melissa', status: 'ajustes_necessarios', dueDate: iso(-3), internalApproval: true, clientApproval: false, createdAt: iso(-10) },
  { id: 'cnt_09', clientId: 'cli_quintal', projectId: 'proj_stories_quintal', format: 'thumbnail', theme: 'Matrícula aberta', title: 'Thumbnail — campanha de matrícula', responsibleId: 'usr_melissa', status: 'em_producao', dueDate: iso(3), internalApproval: false, clientApproval: false, createdAt: iso(-3) },
  { id: 'cnt_10', clientId: 'cli_parrilha', projectId: 'proj_conteudo_semanal', format: 'roteiro', theme: 'Cardápio novo', title: 'Apresentação do cardápio novo', responsibleId: 'usr_ester', status: 'em_revisao_interna', dueDate: iso(1), internalApproval: false, clientApproval: false, createdAt: iso(-4) },
  { id: 'cnt_11', clientId: 'cli_itercrescere', projectId: 'proj_landing_crescere', format: 'site', theme: 'Institucional', title: 'Site institucional — estrutura de páginas', responsibleId: 'usr_pedro', status: 'a_fazer', dueDate: iso(14), internalApproval: false, clientApproval: false, createdAt: iso(-2) },
  { id: 'cnt_12', clientId: 'cli_rodrigo', projectId: 'proj_calendario_editorial', format: 'reel', theme: 'Rotina', title: 'Rotina de estudos', responsibleId: 'usr_ester', status: 'publicado', dueDate: iso(-7), publishDate: iso(-6), internalApproval: true, clientApproval: true, createdAt: iso(-12) },
  { id: 'cnt_13', clientId: 'cli_itercontabil', projectId: 'proj_estrategia_contabil', format: 'post_estatico', theme: 'Prazo fiscal', title: 'Alerta de prazo do Simples Nacional', responsibleId: 'usr_raylhane', status: 'aguardando_cliente', dueDate: iso(2), internalApproval: true, clientApproval: false, createdAt: iso(-3) },
  { id: 'cnt_14', clientId: 'cli_quintal', projectId: 'proj_stories_quintal', format: 'carrossel', theme: 'Depoimentos', title: 'Depoimentos de famílias', responsibleId: 'usr_melissa', status: 'a_fazer', dueDate: iso(8), internalApproval: false, clientApproval: false, createdAt: iso(0) },
  { id: 'cnt_15', clientId: 'cli_parrilha', projectId: 'proj_conteudo_semanal', format: 'story', theme: 'Enquete', title: 'Enquete: prato favorito', responsibleId: 'usr_ester', status: 'aprovado', dueDate: iso(0), publishDate: iso(0), internalApproval: true, clientApproval: true, createdAt: iso(-5) },
]

// ---------------------------------------------------------------------------
// Arquivos / links organizados
// ---------------------------------------------------------------------------
export const mockFiles: FileResource[] = [
  { id: 'file_01', name: 'Briefing — Parrilha & Brasa', type: 'Briefing', category: 'Briefings', clientId: 'cli_parrilha', url: 'https://drive.google.com/briefing-parrilha', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo', 'operacional'], createdAt: iso(-260) },
  { id: 'file_02', name: 'Logo — Parrilha & Brasa (svg/png)', type: 'Logo', category: 'Logos', clientId: 'cli_parrilha', url: 'https://drive.google.com/logo-parrilha', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo', 'operacional'], createdAt: iso(-260) },
  { id: 'file_03', name: 'Brandbook — Rodrigo Mocellin', type: 'Brandbook', category: 'Brandbooks', clientId: 'cli_rodrigo', url: 'https://drive.google.com/brandbook-rodrigo', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo'], createdAt: iso(-300) },
  { id: 'file_04', name: 'Banco de fotos — Quintal Escola', type: 'Fotos', category: 'Fotos', clientId: 'cli_quintal', url: 'https://drive.google.com/fotos-quintal', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo'], createdAt: iso(-180) },
  { id: 'file_05', name: 'Vídeos brutos — Parrilha & Brasa', type: 'Vídeos', category: 'Vídeos', clientId: 'cli_parrilha', url: 'https://drive.google.com/videos-parrilha', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo'], createdAt: iso(-40) },
  { id: 'file_06', name: 'Contrato — Iter Gestão Contábil', type: 'Contrato', category: 'Contratos', clientId: 'cli_itercontabil', url: 'https://drive.google.com/contrato-itercontabil', visibleToRoles: ['admin', 'direcao', 'financeiro'], createdAt: iso(-150) },
  { id: 'file_07', name: 'Proposta — Iter Crescere (landing page)', type: 'Proposta', category: 'Propostas', clientId: 'cli_itercrescere', url: 'https://drive.google.com/proposta-crescere', visibleToRoles: ['admin', 'direcao', 'financeiro', 'operacional'], createdAt: iso(-90) },
  { id: 'file_08', name: 'Referências visuais — Iter Crescere', type: 'Referência', category: 'Referências', clientId: 'cli_itercrescere', url: 'https://drive.google.com/referencias-crescere', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo'], createdAt: iso(-20) },
  { id: 'file_09', name: 'Pasta Drive — Rodrigo Mocellin', type: 'Pasta', category: 'Pastas por Cliente', clientId: 'cli_rodrigo', url: 'https://drive.google.com/drive/rodrigo-mocellin', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo', 'operacional'], createdAt: iso(-310) },
  { id: 'file_10', name: 'Modelos de carrossel (template)', type: 'Modelo', category: 'Referências', url: 'https://drive.google.com/templates-carrossel', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo'], createdAt: iso(-100) },
  { id: 'file_11', name: 'Contrato — Parrilha & Brasa', type: 'Contrato', category: 'Contratos', clientId: 'cli_parrilha', url: 'https://drive.google.com/contrato-parrilha', visibleToRoles: ['admin', 'direcao', 'financeiro'], createdAt: iso(-260) },
  { id: 'file_12', name: 'Brandbook — Iter Gestão Contábil', type: 'Brandbook', category: 'Brandbooks', clientId: 'cli_itercontabil', url: 'https://drive.google.com/brandbook-itercontabil', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo'], createdAt: iso(-140) },
  { id: 'file_13', name: 'Materiais aprovados — Quintal Escola', type: 'Aprovado', category: 'Aprovados', clientId: 'cli_quintal', url: 'https://drive.google.com/aprovados-quintal', visibleToRoles: ['admin', 'direcao', 'gestao_criativa', 'criativo'], createdAt: iso(-10) },
  { id: 'file_14', name: 'Proposta comercial — modelo padrão', type: 'Proposta', category: 'Propostas', url: 'https://drive.google.com/modelo-proposta', visibleToRoles: ['admin', 'direcao', 'operacional', 'financeiro'], createdAt: iso(-200) },
]

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
