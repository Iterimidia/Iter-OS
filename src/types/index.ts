// Tipos centrais do domínio do Iter OS.
// Qualquer entidade persistida (hoje em localStorage, futuramente no Supabase) é tipada aqui.

export type BaseId = 'geral' | 'operacional' | 'criativo'

export type RoleId =
  | 'admin'
  | 'direcao'
  | 'conselho'
  | 'gestao_criativa'
  | 'criativo'
  | 'operacional'
  | 'financeiro'
  | 'usuario_limitado'

export type ActionPermission =
  | 'visualizar'
  | 'criar'
  | 'editar'
  | 'excluir'
  | 'exportar'
  | 'aprovar'
  | 'atribuir'
  | 'alterar_status'
  | 'ver_financeiro'
  | 'gerenciar_usuarios'

export interface Role {
  id: RoleId
  label: string
  description: string
  defaultBases: BaseId[]
  defaultAreas: string[] | 'all'
  defaultActions: ActionPermission[]
}

/** 'all' = sem restrição (ex: admin). Lista vazia = nenhum acesso. */
export type AccessList = string[] | 'all'

export interface User {
  id: string
  name: string
  email: string
  password: string // mock — trocar por Supabase Auth (hash + sessão real)
  role: RoleId
  jobTitle: string
  avatarInitials: string
  avatarColor: string
  active: boolean
  allowedBases: BaseId[]
  allowedAreas: AccessList
  allowedActions: ActionPermission[]
  allowedClientIds: AccessList
  allowedDashboardCards: AccessList
  createdAt: string
}

export interface AppArea {
  id: string
  baseId: BaseId
  label: string
  path: string
  icon: string
  description?: string
}

export type ClientStatus = 'ativo' | 'em_atencao' | 'em_risco' | 'inativo'

/** 'fixo' = valor mensal fechado. 'percentual' = comissão sobre vendas do cliente. */
export type BillingType = 'fixo' | 'percentual'

export interface Client {
  id: string
  name: string
  status: ClientStatus
  plan: string
  billingType: BillingType
  /** Valor mensal contratado por este cliente (R$) — usado quando billingType é 'fixo'. */
  monthlyValue: number
  /** Percentual sobre as vendas do cliente — usado quando billingType é 'percentual'. */
  commissionPercentage?: number
  services: string[]
  strategicResponsibleId: string
  creativeResponsibleId: string
  driveFolderUrl?: string
  briefing?: string
  nextMeetingAt?: string
  pendencies?: string
  notes?: string
  segment?: string
  createdAt: string
}

export type ProjectStatus = 'planejamento' | 'em_andamento' | 'pausado' | 'concluido'
export type Priority = 'baixa' | 'media' | 'alta' | 'urgente'

export interface Project {
  id: string
  title: string
  clientId: string
  description: string
  responsibleId: string
  teamIds: string[]
  status: ProjectStatus
  startDate: string
  endDate: string
  priority: Priority
  createdAt: string
}

export type TaskStatus =
  | 'a_fazer'
  | 'em_andamento'
  | 'aguardando_revisao'
  | 'ajustes_necessarios'
  | 'aguardando_cliente'
  | 'aprovado'
  | 'publicado'
  | 'concluido'

export interface Comment {
  id: string
  authorId: string
  text: string
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description?: string
  clientId?: string
  projectId?: string
  responsibleId: string
  dueDate?: string
  priority: Priority
  status: TaskStatus
  type: string
  area: BaseId
  createdAt: string
  completedAt?: string
  fileIds?: string[]
  comments?: Comment[]
}

export type CalendarEventType =
  | 'tarefa'
  | 'publicacao'
  | 'reuniao'
  | 'vencimento'
  | 'follow_up'
  | 'entrega'
  | 'revisao'
  | 'aprovacao'

export interface CalendarEvent {
  id: string
  title: string
  date: string
  type: CalendarEventType
  scope: BaseId
  clientId?: string
  taskId?: string
  status?: string
  priority?: Priority
  source: 'manual' | 'task' | 'content' | 'lead' | 'finance' | 'project'
}

export interface FileResource {
  id: string
  name: string
  type: string
  category: string
  clientId?: string
  projectId?: string
  url: string
  description?: string
  visibleToRoles: RoleId[]
  createdAt: string
}

export type FinancialType = 'receita' | 'despesa'
export type FinancialStatus = 'previsto' | 'pago' | 'pendente' | 'vencido'

export interface FinancialEntry {
  id: string
  type: FinancialType
  category: string
  description: string
  clientId?: string
  amount: number
  dueDate: string
  paidDate?: string
  status: FinancialStatus
  recurring?: boolean
}

export type LeadStatus =
  | 'lead'
  | 'contato_iniciado'
  | 'diagnostico'
  | 'proposta_enviada'
  | 'follow_up'
  | 'fechado'
  | 'perdido'

export interface Lead {
  id: string
  companyName: string
  responsibleName: string
  contact: string
  instagramOrSite?: string
  segment: string
  origin: string
  status: LeadStatus
  serviceInterest: string
  estimatedValue: number
  nextAction?: string
  followUpDate?: string
  notes?: string
  createdAt: string
}

export type ContentFormat =
  | 'carrossel'
  | 'post_estatico'
  | 'reel'
  | 'story'
  | 'capa_reel'
  | 'thumbnail'
  | 'landing_page'
  | 'site'
  | 'legenda'
  | 'roteiro'

export type DemandStatus =
  | 'a_fazer'
  | 'em_producao'
  | 'em_revisao_interna'
  | 'ajustes_necessarios'
  | 'aguardando_cliente'
  | 'aprovado'
  | 'publicado'

export interface ContentItem {
  id: string
  clientId: string
  projectId?: string
  format: ContentFormat
  theme: string
  title: string
  responsibleId: string
  status: DemandStatus
  dueDate?: string
  publishDate?: string
  caption?: string
  script?: string
  fileUrl?: string
  internalApproval: boolean
  clientApproval: boolean
  comments?: Comment[]
  createdAt: string
}

export interface DashboardCardDefinition {
  id: string
  section: 'financeiro' | 'comercial' | 'clientes' | 'operacao' | 'criativo' | 'calendario'
  title: string
  description?: string
  visibleToRoles: RoleId[]
}

export type IntegrationStatusKind = 'conectado' | 'em_breve' | 'nao_conectado' | 'planejado'

export interface IntegrationStatus {
  id: string
  name: string
  status: IntegrationStatusKind
  description: string
}

export interface AppSettings {
  companyName: string
  loginSlogan: string
  dashboardSlogan: string
  loginBackgroundImageUrl: string | null
  plans: string[]
  services: string[]
  clientStatuses: string[]
  taskTypes: string[]
  integrations: IntegrationStatus[]
}

export interface ReportDefinition {
  id: string
  title: string
  description: string
  requiredAction: ActionPermission
  scope: BaseId | 'cliente'
}
