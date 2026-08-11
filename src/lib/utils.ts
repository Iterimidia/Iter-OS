import { clsx, type ClassValue } from 'clsx'
import { format, isBefore, isToday, parseISO, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type {
  ActionPermission,
  BillingType,
  Client,
  ClientStatus,
  ContentFormat,
  DeliveryUnitStatus,
  DemandStatus,
  FinancialStatus,
  IntegrationStatusKind,
  LeadStatus,
  Priority,
  ProjectStatus,
  RoleId,
  TaskStatus,
} from '@/types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  fixo: 'Valor fixo mensal',
  percentual: 'Percentual sobre vendas',
}

/** Texto curto de cobrança do cliente, pronto pra exibir em card/detalhe/relatório. */
export function formatClientBilling(client: Pick<Client, 'billingType' | 'monthlyValue' | 'commissionPercentage'>): string {
  if (client.billingType === 'percentual') {
    return `${client.commissionPercentage ?? 0}% sobre vendas`
  }
  return `${formatCurrency(client.monthlyValue)}/mês`
}

export function formatDate(iso: string, pattern = 'dd/MM/yyyy'): string {
  return format(parseISO(iso), pattern, { locale: ptBR })
}

export function formatDateLong(iso: string): string {
  return format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function isOverdue(dueDate?: string, done = false): boolean {
  if (!dueDate || done) return false
  return isBefore(startOfDay(parseISO(dueDate)), startOfDay(new Date()))
}

export function isDueToday(dueDate?: string): boolean {
  if (!dueDate) return false
  return isToday(parseISO(dueDate))
}

export function isThisMonth(iso: string): boolean {
  const d = parseISO(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export function addDaysIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function groupBy<T, K extends string | number>(items: T[], key: (item: T) => K): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = key(item)
      ;(acc[k] ??= []).push(item)
      return acc
    },
    {} as Record<K, T[]>,
  )
}

interface StatusMeta {
  label: string
  tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'primary'
}

export const TASK_STATUS_META: Record<TaskStatus, StatusMeta> = {
  a_fazer: { label: 'A fazer', tone: 'neutral' },
  em_andamento: { label: 'Em andamento', tone: 'info' },
  aguardando_revisao: { label: 'Aguardando revisão', tone: 'warning' },
  ajustes_necessarios: { label: 'Ajustes necessários', tone: 'danger' },
  aguardando_cliente: { label: 'Aguardando cliente', tone: 'warning' },
  aprovado: { label: 'Aprovado', tone: 'success' },
  publicado: { label: 'Publicado', tone: 'primary' },
  concluido: { label: 'Concluído', tone: 'success' },
}

export const DEMAND_STATUS_META: Record<DemandStatus, StatusMeta> = {
  a_fazer: { label: 'A fazer', tone: 'neutral' },
  em_producao: { label: 'Em produção', tone: 'info' },
  em_revisao_interna: { label: 'Em revisão interna', tone: 'warning' },
  ajustes_necessarios: { label: 'Ajustes necessários', tone: 'danger' },
  aguardando_cliente: { label: 'Aguardando cliente', tone: 'warning' },
  aprovado: { label: 'Aprovado', tone: 'success' },
  publicado: { label: 'Publicado', tone: 'primary' },
}

export const LEAD_STATUS_META: Record<LeadStatus, StatusMeta> = {
  lead: { label: 'Lead', tone: 'neutral' },
  contato_iniciado: { label: 'Contato iniciado', tone: 'info' },
  diagnostico: { label: 'Diagnóstico', tone: 'info' },
  proposta_enviada: { label: 'Proposta enviada', tone: 'warning' },
  follow_up: { label: 'Follow-up', tone: 'warning' },
  fechado: { label: 'Fechado', tone: 'success' },
  perdido: { label: 'Perdido', tone: 'danger' },
}

export const CLIENT_STATUS_META: Record<ClientStatus, StatusMeta> = {
  ativo: { label: 'Ativo', tone: 'success' },
  em_atencao: { label: 'Em atenção', tone: 'warning' },
  em_risco: { label: 'Em risco', tone: 'danger' },
  inativo: { label: 'Inativo', tone: 'neutral' },
}

export const FINANCIAL_STATUS_META: Record<FinancialStatus, StatusMeta> = {
  previsto: { label: 'Previsto', tone: 'neutral' },
  pago: { label: 'Pago', tone: 'success' },
  pendente: { label: 'Pendente', tone: 'warning' },
  vencido: { label: 'Vencido', tone: 'danger' },
}

export const PROJECT_STATUS_META: Record<ProjectStatus, StatusMeta> = {
  planejamento: { label: 'Planejamento', tone: 'neutral' },
  em_andamento: { label: 'Em andamento', tone: 'info' },
  pausado: { label: 'Pausado', tone: 'warning' },
  concluido: { label: 'Concluído', tone: 'success' },
}

export const PRIORITY_META: Record<Priority, StatusMeta> = {
  baixa: { label: 'Baixa', tone: 'neutral' },
  media: { label: 'Média', tone: 'info' },
  alta: { label: 'Alta', tone: 'warning' },
  urgente: { label: 'Urgente', tone: 'danger' },
}

export const INTEGRATION_STATUS_META: Record<IntegrationStatusKind, StatusMeta> = {
  conectado: { label: 'Conectado', tone: 'success' },
  em_breve: { label: 'Em breve', tone: 'warning' },
  nao_conectado: { label: 'Não conectado', tone: 'neutral' },
  planejado: { label: 'Planejado', tone: 'info' },
}

export const ROLE_LABELS: Record<RoleId, string> = {
  admin: 'Admin',
  direcao: 'Direção',
  conselho: 'Conselho',
  gestao_criativa: 'Gestão Criativa',
  criativo: 'Criativo',
  operacional: 'Operacional',
  financeiro: 'Financeiro',
  usuario_limitado: 'Usuário Limitado',
}

export const TASK_STATUS_ORDER: TaskStatus[] = [
  'a_fazer',
  'em_andamento',
  'aguardando_revisao',
  'ajustes_necessarios',
  'aguardando_cliente',
  'aprovado',
  'publicado',
  'concluido',
]

export const ACTION_LABELS: Record<ActionPermission, string> = {
  visualizar: 'Visualizar',
  criar: 'Criar',
  editar: 'Editar',
  excluir: 'Excluir',
  exportar: 'Exportar',
  aprovar: 'Aprovar',
  atribuir: 'Atribuir',
  alterar_status: 'Alterar status',
  ver_financeiro: 'Ver financeiro',
  gerenciar_usuarios: 'Gerenciar usuários',
}

export const ACTION_LIST: ActionPermission[] = [
  'visualizar',
  'criar',
  'editar',
  'excluir',
  'exportar',
  'aprovar',
  'atribuir',
  'alterar_status',
  'ver_financeiro',
  'gerenciar_usuarios',
]

export const AVATAR_COLORS = ['#7C6BFF', '#22D3C4', '#38BDF8', '#F5A623', '#34D399', '#EF4444', '#60A5FA', '#F472B6']

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  'lead',
  'contato_iniciado',
  'diagnostico',
  'proposta_enviada',
  'follow_up',
  'fechado',
  'perdido',
]

export const CONTENT_FORMAT_LABELS: Record<ContentFormat, string> = {
  carrossel: 'Carrossel',
  post_estatico: 'Post Estático',
  reel: 'Reel',
  story: 'Story',
  capa_reel: 'Capa de Reel',
  thumbnail: 'Thumbnail',
  landing_page: 'Landing Page',
  site: 'Site',
  legenda: 'Legenda',
  roteiro: 'Roteiro',
}

export const CONTENT_FORMAT_ORDER: ContentFormat[] = [
  'carrossel',
  'post_estatico',
  'reel',
  'story',
  'capa_reel',
  'thumbnail',
  'landing_page',
  'site',
  'legenda',
  'roteiro',
]

export const DELIVERY_UNIT_STATUS_META: Record<DeliveryUnitStatus, StatusMeta> = {
  pendente: { label: 'Pendente', tone: 'neutral' },
  em_producao: { label: 'Em produção', tone: 'info' },
  entregue: { label: 'Entregue', tone: 'success' },
}

export const DELIVERY_UNIT_STATUS_ORDER: DeliveryUnitStatus[] = ['pendente', 'em_producao', 'entregue']

/** Próximo status ao clicar num chip de entrega — cicla pendente -> em_producao -> entregue -> pendente. */
export function nextDeliveryUnitStatus(status: DeliveryUnitStatus): DeliveryUnitStatus {
  const idx = DELIVERY_UNIT_STATUS_ORDER.indexOf(status)
  return DELIVERY_UNIT_STATUS_ORDER[(idx + 1) % DELIVERY_UNIT_STATUS_ORDER.length]
}

/** Mês de referência atual no formato 'YYYY-MM'. */
export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

export function shiftMonthKey(month: string, delta: number): string {
  const [year, monthNum] = month.split('-').map(Number)
  const d = new Date(year, monthNum - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-').map(Number)
  return format(new Date(year, monthNum - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })
}

export const DEMAND_STATUS_ORDER: DemandStatus[] = [
  'a_fazer',
  'em_producao',
  'em_revisao_interna',
  'ajustes_necessarios',
  'aguardando_cliente',
  'aprovado',
  'publicado',
]
