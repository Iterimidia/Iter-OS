/**
 * Motor de permissões do Iter OS — fonte única de verdade para autorização.
 *
 * Nenhum componente deve decidir visibilidade "na unha"; toda checagem passa
 * por uma das funções abaixo. Isso é o que garante a regra do produto:
 * "nenhum usuário deve ver base, área, card, cliente ou relatório que não
 * esteja liberado para ele."
 */
import type {
  ActionPermission,
  BaseId,
  DashboardCardDefinition,
  FileResource,
  ReportDefinition,
  Role,
  RoleId,
  User,
} from '@/types'
import { AREAS, BASES, areasForBase, type BaseMeta } from '@/lib/navigation'

export const ROLES: Record<RoleId, Role> = {
  admin: {
    id: 'admin',
    label: 'Admin',
    description: 'Acesso total: todas as bases, áreas, ações e configurações.',
    defaultBases: ['geral', 'operacional', 'criativo'],
    defaultAreas: 'all',
    defaultActions: [
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
    ],
  },
  direcao: {
    id: 'direcao',
    label: 'Direção',
    description: 'Visão executiva completa da operação, sem gestão de usuários.',
    defaultBases: ['geral', 'operacional', 'criativo'],
    defaultAreas: 'all',
    defaultActions: [
      'visualizar',
      'criar',
      'editar',
      'excluir',
      'exportar',
      'aprovar',
      'atribuir',
      'alterar_status',
      'ver_financeiro',
    ],
  },
  conselho: {
    id: 'conselho',
    label: 'Conselho',
    description: 'Vê dashboard geral, indicadores e relatórios. Não edita nem altera permissões.',
    defaultBases: ['geral'],
    defaultAreas: ['geral:dashboard', 'geral:calendario', 'geral:relatorios'],
    defaultActions: ['visualizar', 'exportar', 'ver_financeiro'],
  },
  gestao_criativa: {
    id: 'gestao_criativa',
    label: 'Gestão Criativa',
    description: 'Comanda a Base Criativa e enxerga parte da Base Geral. Sem financeiro ou comercial sensível.',
    defaultBases: ['criativo', 'geral'],
    defaultAreas: [
      'criativo:painel',
      'criativo:conteudo',
      'criativo:demandas',
      'criativo:calendario',
      'criativo:arquivos',
      'criativo:aprovacoes',
      'geral:dashboard',
      'geral:calendario',
    ],
    defaultActions: ['visualizar', 'criar', 'editar', 'aprovar', 'atribuir', 'alterar_status', 'exportar'],
  },
  criativo: {
    id: 'criativo',
    label: 'Criativo',
    description: 'Executa produção: tarefas, calendário, demandas e arquivos liberados.',
    defaultBases: ['criativo'],
    defaultAreas: [
      'criativo:painel',
      'criativo:conteudo',
      'criativo:demandas',
      'criativo:calendario',
      'criativo:arquivos',
      'criativo:aprovacoes',
    ],
    defaultActions: ['visualizar', 'criar', 'editar', 'alterar_status'],
  },
  operacional: {
    id: 'operacional',
    label: 'Operacional',
    description: 'Executa comercial, clientes e operação. Sem financeiro nem gestão de equipe.',
    defaultBases: ['operacional'],
    defaultAreas: ['operacional:comercial', 'operacional:clientes', 'operacional:operacao', 'operacional:arquivos'],
    defaultActions: ['visualizar', 'criar', 'editar', 'alterar_status', 'atribuir', 'exportar'],
  },
  financeiro: {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Cuida do financeiro gerencial e enxerga indicadores consolidados na Base Geral.',
    defaultBases: ['operacional', 'geral'],
    defaultAreas: ['operacional:financeiro', 'operacional:clientes', 'geral:dashboard', 'geral:calendario'],
    defaultActions: ['visualizar', 'criar', 'editar', 'exportar', 'ver_financeiro'],
  },
  usuario_limitado: {
    id: 'usuario_limitado',
    label: 'Usuário Limitado',
    description: 'Sem acesso padrão — tudo é liberado explicitamente por usuário.',
    defaultBases: [],
    defaultAreas: [],
    defaultActions: ['visualizar'],
  },
}

export const ROLE_LIST: Role[] = Object.values(ROLES)

export function getRole(roleId: RoleId): Role {
  return ROLES[roleId]
}

export function isAdmin(user: User): boolean {
  return user.role === 'admin'
}

/** União dos defaults do papel com as liberações específicas do usuário. */
export function canAccessBase(user: User, baseId: BaseId): boolean {
  if (isAdmin(user)) return true
  const role = getRole(user.role)
  return role.defaultBases.includes(baseId) || user.allowedBases.includes(baseId)
}

export function getAccessibleBases(user: User): BaseMeta[] {
  return BASES.filter((base) => canAccessBase(user, base.id))
}

export function canViewArea(user: User, areaId: string): boolean {
  const area = AREAS.find((a) => a.id === areaId)
  if (!area) return false
  if (!canAccessBase(user, area.baseId)) return false
  if (isAdmin(user)) return true

  const role = getRole(user.role)
  if (role.defaultAreas === 'all' || role.defaultAreas.includes(areaId)) return true
  if (user.allowedAreas === 'all') return true
  return user.allowedAreas.includes(areaId)
}

export function getAccessibleAreas(user: User, baseId: BaseId) {
  return areasForBase(baseId).filter((area) => canViewArea(user, area.id))
}

export function canPerformAction(user: User, action: ActionPermission): boolean {
  if (isAdmin(user)) return true
  const role = getRole(user.role)
  return role.defaultActions.includes(action) || user.allowedActions.includes(action)
}

export function canAccessClient(user: User, clientId: string): boolean {
  if (isAdmin(user)) return true
  if (user.allowedClientIds === 'all') return true
  return user.allowedClientIds.includes(clientId)
}

export function getAccessibleClients<T extends { id: string }>(user: User, clients: T[]): T[] {
  return clients.filter((client) => canAccessClient(user, client.id))
}

export function canViewDashboardCard(user: User, card: DashboardCardDefinition): boolean {
  if (isAdmin(user)) return true
  if (!card.visibleToRoles.includes(user.role)) return false
  if (user.allowedDashboardCards === 'all') return true
  return user.allowedDashboardCards.includes(card.id)
}

export function canViewFile(user: User, file: FileResource): boolean {
  if (isAdmin(user)) return true
  if (!file.visibleToRoles.includes(user.role)) return false
  if (file.clientId && !canAccessClient(user, file.clientId)) return false
  return true
}

export interface PermissionedResource {
  requiredAction?: ActionPermission
  base?: BaseId
  clientId?: string
  visibleToRoles?: RoleId[]
}

export function canView(user: User, resource?: PermissionedResource): boolean {
  if (!resource) return canPerformAction(user, 'visualizar')
  if (resource.base && !canAccessBase(user, resource.base)) return false
  if (resource.visibleToRoles && !isAdmin(user) && !resource.visibleToRoles.includes(user.role)) return false
  if (resource.clientId && !canAccessClient(user, resource.clientId)) return false
  return canPerformAction(user, resource.requiredAction ?? 'visualizar')
}

export function canEdit(user: User, resource?: PermissionedResource): boolean {
  if (resource?.base && !canAccessBase(user, resource.base)) return false
  if (resource?.clientId && !canAccessClient(user, resource.clientId)) return false
  return canPerformAction(user, resource?.requiredAction ?? 'editar')
}

export function canExport(user: User, report: ReportDefinition): boolean {
  if (report.scope !== 'cliente' && !canAccessBase(user, report.scope as BaseId)) return false
  return canPerformAction(user, report.requiredAction ?? 'exportar')
}

/** Primeira área acessível de uma base — usada como destino ao entrar nela. */
export function getBaseHomePath(user: User, baseId: BaseId): string | null {
  const areas = getAccessibleAreas(user, baseId)
  return areas[0]?.path ?? null
}

export function getHomePathForUser(user: User): string {
  const bases = getAccessibleBases(user)
  if (bases.length === 0) return '/sem-acesso'
  if (bases.length > 1) return '/selecionar-base'
  return getBaseHomePath(user, bases[0].id) ?? '/sem-acesso'
}
