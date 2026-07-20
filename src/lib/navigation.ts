import type { AppArea, BaseId } from '@/types'

export interface BaseMeta {
  id: BaseId
  label: string
  description: string
  icon: string
}

export const BASES: BaseMeta[] = [
  {
    id: 'geral',
    label: 'Base Geral',
    description: 'Megadashboard consolidado da operação, para direção e conselho.',
    icon: 'Globe2',
  },
  {
    id: 'operacional',
    label: 'Base Operacional',
    description: 'Direção, comercial, clientes, projetos, financeiro e equipe.',
    icon: 'Building2',
  },
  {
    id: 'criativo',
    label: 'Base Criativa',
    description: 'Produção de conteúdo, demandas e aprovações da equipe criativa.',
    icon: 'Sparkles',
  },
]

/**
 * IDs de área são prefixados com a base ("base:area") para não colidir —
 * o mesmo rótulo (ex: "Calendário") existe nas três bases com escopos diferentes.
 */
export const AREAS: AppArea[] = [
  { id: 'geral:dashboard', baseId: 'geral', label: 'Dashboard Geral', path: '/geral', icon: 'LayoutDashboard' },
  { id: 'geral:calendario', baseId: 'geral', label: 'Calendário Geral', path: '/geral/calendario', icon: 'CalendarDays' },
  { id: 'geral:relatorios', baseId: 'geral', label: 'Relatórios', path: '/geral/relatorios', icon: 'FileBarChart2' },
  { id: 'geral:visibilidade', baseId: 'geral', label: 'Visibilidade', path: '/geral/visibilidade', icon: 'Eye' },

  { id: 'operacional:direcao', baseId: 'operacional', label: 'Direção', path: '/operacional/direcao', icon: 'Compass' },
  { id: 'operacional:comercial', baseId: 'operacional', label: 'Comercial', path: '/operacional/comercial', icon: 'Handshake' },
  { id: 'operacional:clientes', baseId: 'operacional', label: 'Clientes', path: '/operacional/clientes', icon: 'Users' },
  { id: 'operacional:operacao', baseId: 'operacional', label: 'Operação', path: '/operacional/operacao', icon: 'KanbanSquare' },
  { id: 'operacional:financeiro', baseId: 'operacional', label: 'Financeiro', path: '/operacional/financeiro', icon: 'Wallet' },
  { id: 'operacional:equipe', baseId: 'operacional', label: 'Equipe', path: '/operacional/equipe', icon: 'UsersRound' },
  { id: 'operacional:arquivos', baseId: 'operacional', label: 'Arquivos', path: '/operacional/arquivos', icon: 'FolderOpen' },
  { id: 'operacional:configuracoes', baseId: 'operacional', label: 'Configurações', path: '/operacional/configuracoes', icon: 'Settings' },

  { id: 'criativo:painel', baseId: 'criativo', label: 'Painel Criativo', path: '/criativo', icon: 'LayoutDashboard' },
  { id: 'criativo:conteudo', baseId: 'criativo', label: 'Conteúdo', path: '/criativo/conteudo', icon: 'PenTool' },
  { id: 'criativo:demandas', baseId: 'criativo', label: 'Demandas', path: '/criativo/demandas', icon: 'KanbanSquare' },
  { id: 'criativo:calendario', baseId: 'criativo', label: 'Calendário', path: '/criativo/calendario', icon: 'CalendarDays' },
  { id: 'criativo:arquivos', baseId: 'criativo', label: 'Arquivos', path: '/criativo/arquivos', icon: 'FolderOpen' },
  { id: 'criativo:aprovacoes', baseId: 'criativo', label: 'Aprovações', path: '/criativo/aprovacoes', icon: 'CheckCircle2' },
]

export function areasForBase(baseId: BaseId): AppArea[] {
  return AREAS.filter((a) => a.baseId === baseId)
}

/** Acha a área mais específica cujo path é prefixo do pathname atual (cobre rotas com :id). */
export function findAreaByPath(pathname: string): AppArea | undefined {
  return AREAS.filter((a) => pathname === a.path || pathname.startsWith(`${a.path}/`)).sort(
    (a, b) => b.path.length - a.path.length,
  )[0]
}
