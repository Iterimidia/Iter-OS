/**
 * Agregação do calendário — nenhum evento de tarefa/conteúdo/lead/financeiro é
 * guardado separadamente. Tudo é derivado, na hora, das próprias coleções.
 * É isso que garante a regra "toda tarefa com prazo aparece no calendário e
 * atualiza sozinha se o prazo mudar": não existe cópia pra ficar dessincronizada.
 */
import type {
  BaseId,
  CalendarEvent,
  CalendarEventType,
  ContentItem,
  FinancialEntry,
  Lead,
  Project,
  Task,
  User,
} from '@/types'
import { useMemo } from 'react'
import { canAccessClient, canPerformAction } from '@/lib/permissions'
import { useDataStore } from '@/data/store'
import { useCurrentUser } from '@/features/auth/useAuth'

export interface CalendarSourceData {
  tasks: Task[]
  projects: Project[]
  contentItems: ContentItem[]
  leads: Lead[]
  financialEntries: FinancialEntry[]
  calendarEvents: CalendarEvent[]
}

function taskEventType(task: Task): CalendarEventType {
  if (task.type === 'Publicação') return 'publicacao'
  if (task.type === 'Aprovação') return 'aprovacao'
  if (task.type === 'Reunião') return 'reuniao'
  return 'tarefa'
}

function contentEventType(item: ContentItem): CalendarEventType {
  if (item.status === 'em_revisao_interna' || item.status === 'ajustes_necessarios') return 'revisao'
  if (item.status === 'aguardando_cliente') return 'aprovacao'
  return 'tarefa'
}

/** Constrói os eventos visíveis num escopo (base) para um usuário, já filtrados por permissão. */
export function buildCalendarEvents(scope: BaseId, user: User, data: CalendarSourceData): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const includesArea = (area: BaseId) => scope === 'geral' || scope === area

  for (const task of data.tasks) {
    if (!task.dueDate || !includesArea(task.area)) continue
    if (task.clientId && !canAccessClient(user, task.clientId)) continue
    events.push({
      id: `task-${task.id}`,
      title: task.title,
      date: task.dueDate,
      type: taskEventType(task),
      scope: task.area,
      clientId: task.clientId,
      taskId: task.id,
      status: task.status,
      priority: task.priority,
      source: 'task',
    })
  }

  if (includesArea('criativo')) {
    for (const item of data.contentItems) {
      if (!canAccessClient(user, item.clientId)) continue
      if (item.dueDate) {
        events.push({
          id: `content-due-${item.id}`,
          title: item.title,
          date: item.dueDate,
          type: contentEventType(item),
          scope: 'criativo',
          clientId: item.clientId,
          status: item.status,
          source: 'content',
        })
      }
      if (item.publishDate) {
        events.push({
          id: `content-pub-${item.id}`,
          title: item.title,
          date: item.publishDate,
          type: 'publicacao',
          scope: 'criativo',
          clientId: item.clientId,
          status: item.status,
          source: 'content',
        })
      }
    }
  }

  if (includesArea('operacional')) {
    for (const lead of data.leads) {
      if (!lead.followUpDate) continue
      events.push({
        id: `lead-${lead.id}`,
        title: `Follow-up — ${lead.companyName}`,
        date: lead.followUpDate,
        type: 'follow_up',
        scope: 'operacional',
        status: lead.status,
        source: 'lead',
      })
    }

    if (canPerformAction(user, 'ver_financeiro')) {
      for (const entry of data.financialEntries) {
        if (entry.status === 'pago') continue
        if (entry.clientId && !canAccessClient(user, entry.clientId)) continue
        events.push({
          id: `fin-${entry.id}`,
          title: `${entry.type === 'receita' ? 'Recebimento' : 'Pagamento'} — ${entry.description}`,
          date: entry.dueDate,
          type: 'vencimento',
          scope: 'operacional',
          clientId: entry.clientId,
          status: entry.status,
          source: 'finance',
        })
      }
    }

    for (const project of data.projects) {
      if (!project.endDate || !canAccessClient(user, project.clientId)) continue
      events.push({
        id: `project-${project.id}`,
        title: `Entrega — ${project.title}`,
        date: project.endDate,
        type: 'entrega',
        scope: 'operacional',
        clientId: project.clientId,
        priority: project.priority,
        source: 'project',
      })
    }
  }

  for (const evt of data.calendarEvents) {
    if (!includesArea(evt.scope)) continue
    if (evt.clientId && !canAccessClient(user, evt.clientId)) continue
    events.push(evt)
  }

  return events.sort((a, b) => a.date.localeCompare(b.date))
}

export function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  return events.reduce(
    (acc, e) => {
      (acc[e.date] ??= []).push(e)
      return acc
    },
    {} as Record<string, CalendarEvent[]>,
  )
}

/** Hook de conveniência: pega os dados do store e recalcula os eventos do escopo para o usuário logado. */
export function useScopedCalendarEvents(scope: BaseId): CalendarEvent[] {
  const user = useCurrentUser()
  const tasks = useDataStore((s) => s.tasks)
  const projects = useDataStore((s) => s.projects)
  const contentItems = useDataStore((s) => s.contentItems)
  const leads = useDataStore((s) => s.leads)
  const financialEntries = useDataStore((s) => s.financialEntries)
  const calendarEvents = useDataStore((s) => s.calendarEvents)

  return useMemo(() => {
    if (!user) return []
    return buildCalendarEvents(scope, user, { tasks, projects, contentItems, leads, financialEntries, calendarEvents })
  }, [scope, user, tasks, projects, contentItems, leads, financialEntries, calendarEvents])
}

export const EVENT_TYPE_ORDER: CalendarEventType[] = [
  'tarefa',
  'publicacao',
  'reuniao',
  'vencimento',
  'follow_up',
  'entrega',
  'revisao',
  'aprovacao',
]

export const CALENDAR_EVENT_META: Record<CalendarEventType, { label: string; className: string }> = {
  tarefa: { label: 'Tarefa', className: 'bg-iter-primary' },
  publicacao: { label: 'Publicação', className: 'bg-iter-secondary' },
  reuniao: { label: 'Reunião', className: 'bg-iter-info' },
  vencimento: { label: 'Vencimento', className: 'bg-iter-danger' },
  follow_up: { label: 'Follow-up', className: 'bg-iter-warning' },
  entrega: { label: 'Entrega', className: 'bg-iter-success' },
  revisao: { label: 'Revisão', className: 'bg-iter-warning' },
  aprovacao: { label: 'Aprovação', className: 'bg-iter-accent' },
}
