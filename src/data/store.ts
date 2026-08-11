/**
 * Camada central de dados do Iter OS — Zustand por cima do Supabase.
 *
 * Cada action faz uma atualização otimista no estado local (resposta
 * instantânea na UI) e dispara a chamada real ao Supabase em paralelo; se a
 * chamada falhar, a mudança local é revertida e o erro é avisado. Assinaturas
 * Realtime (`postgres_changes`) mantêm o estado sincronizado quando OUTRA
 * aba/navegador/pessoa muda algo — é isso que resolve o problema de cada
 * navegador ver uma cópia isolada dos dados.
 *
 * Chame `useDataStore.getState().initialize()` uma vez (ver src/app/App.tsx)
 * antes de renderizar qualquer tela que dependa destes dados.
 */
import { create } from 'zustand'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type {
  AppSettings,
  CalendarEvent,
  Client,
  ContentItem,
  DashboardCardDefinition,
  DeliveryPlanItem,
  DeliveryUnit,
  FileResource,
  FinancialEntry,
  Lead,
  Project,
  Task,
  User,
} from '@/types'
import { supabase } from '@/lib/supabaseClient'
import { generateId } from '@/lib/utils'

const todayIso = () => new Date().toISOString().slice(0, 10)

// ---------------------------------------------------------------------------
// snake_case (banco) <-> camelCase (app) — conversão genérica de 1 nível.
// Conteúdo de colunas jsonb (arrays, listas de comentários etc.) não é
// tocado, só as chaves de topo da linha.
// ---------------------------------------------------------------------------
function toSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
}
function toCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}
function rowToEntity<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) out[toCamelKey(k)] = v
  return out as T
}
function entityToRow(entity: object): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(entity)) out[toSnakeKey(k)] = v
  return out
}

function reportError(action: string, table: string, error: { message: string } | null): boolean {
  if (!error) return false
  console.error(`[Supabase] Falha ao ${action} em "${table}":`, error)
  window.alert(`Não foi possível ${action} (${table}). Detalhe: ${error.message}`)
  return true
}

async function fetchTable<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('*')
  if (reportError('carregar', table, error)) return []
  return (data ?? []).map((row) => rowToEntity<T>(row as Record<string, unknown>))
}

interface DataState {
  initialized: boolean
  users: User[]
  clients: Client[]
  projects: Project[]
  tasks: Task[]
  calendarEvents: CalendarEvent[]
  financialEntries: FinancialEntry[]
  leads: Lead[]
  contentItems: ContentItem[]
  files: FileResource[]
  deliveryPlanItems: DeliveryPlanItem[]
  deliveryUnits: DeliveryUnit[]
  dashboardCards: DashboardCardDefinition[]
  appSettings: AppSettings

  initialize: () => Promise<void>

  addUser: (data: Omit<User, 'id' | 'createdAt'>) => User
  updateUser: (id: string, patch: Partial<User>) => void
  removeUser: (id: string) => void

  addClient: (data: Omit<Client, 'id' | 'createdAt'>) => Client
  updateClient: (id: string, patch: Partial<Client>) => void
  removeClient: (id: string) => void

  addProject: (data: Omit<Project, 'id' | 'createdAt'>) => Project
  updateProject: (id: string, patch: Partial<Project>) => void
  removeProject: (id: string) => void

  addTask: (data: Omit<Task, 'id' | 'createdAt'>) => Task
  updateTask: (id: string, patch: Partial<Task>) => void
  removeTask: (id: string) => void

  addCalendarEvent: (data: Omit<CalendarEvent, 'id' | 'source'>) => CalendarEvent
  updateCalendarEvent: (id: string, patch: Partial<CalendarEvent>) => void
  removeCalendarEvent: (id: string) => void

  addFinancialEntry: (data: Omit<FinancialEntry, 'id'>) => FinancialEntry
  updateFinancialEntry: (id: string, patch: Partial<FinancialEntry>) => void
  removeFinancialEntry: (id: string) => void

  addLead: (data: Omit<Lead, 'id' | 'createdAt'>) => Lead
  updateLead: (id: string, patch: Partial<Lead>) => void
  removeLead: (id: string) => void

  addContentItem: (data: Omit<ContentItem, 'id' | 'createdAt'>) => ContentItem
  updateContentItem: (id: string, patch: Partial<ContentItem>) => void
  removeContentItem: (id: string) => void

  addFile: (data: Omit<FileResource, 'id' | 'createdAt'>) => FileResource
  updateFile: (id: string, patch: Partial<FileResource>) => void
  removeFile: (id: string) => void

  addDeliveryPlanItem: (data: Omit<DeliveryPlanItem, 'id' | 'createdAt'>) => DeliveryPlanItem
  updateDeliveryPlanItem: (id: string, patch: Partial<DeliveryPlanItem>) => void
  removeDeliveryPlanItem: (id: string) => void

  addDeliveryUnit: (data: Omit<DeliveryUnit, 'id' | 'createdAt'>) => DeliveryUnit
  updateDeliveryUnit: (id: string, patch: Partial<DeliveryUnit>) => void
  removeDeliveryUnit: (id: string) => void

  updateDashboardCard: (id: string, patch: Partial<DashboardCardDefinition>) => void

  updateAppSettings: (patch: Partial<AppSettings>) => void
}

const FALLBACK_APP_SETTINGS: AppSettings = {
  companyName: 'Iter Mídia',
  loginSlogan: 'Organize a operação. Enxergue o todo. Execute com clareza.',
  dashboardSlogan: 'A central de comando da operação da Iter Mídia.',
  loginBackgroundImageUrl: null,
  plans: [],
  services: [],
  clientStatuses: [],
  taskTypes: [],
  integrations: [],
}

let realtimeSubscribed = false

/** Assina mudanças de uma tabela-lista e mescla no array correspondente do estado, por id (idempotente: seguro mesmo se a própria action já tiver feito a atualização otimista). */
function subscribeListTable<T extends { id: string }>(
  table: string,
  key: keyof DataState,
  set: (fn: (s: DataState) => Partial<DataState>) => void,
) {
  supabase
    .channel(`realtime:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      set((s) => {
        const list = s[key] as unknown as T[]
        if (payload.eventType === 'INSERT') {
          const item = rowToEntity<T>(payload.new)
          if (list.some((x) => x.id === item.id)) return {}
          return { [key]: [...list, item] } as Partial<DataState>
        }
        if (payload.eventType === 'UPDATE') {
          const item = rowToEntity<T>(payload.new)
          return { [key]: list.map((x) => (x.id === item.id ? item : x)) } as Partial<DataState>
        }
        if (payload.eventType === 'DELETE') {
          const oldId = (payload.old as { id?: string }).id
          return { [key]: list.filter((x) => x.id !== oldId) } as Partial<DataState>
        }
        return {}
      })
    })
    .subscribe()
}

export const useDataStore = create<DataState>()((set, get) => ({
  initialized: false,
  users: [],
  clients: [],
  projects: [],
  tasks: [],
  calendarEvents: [],
  financialEntries: [],
  leads: [],
  contentItems: [],
  files: [],
  deliveryPlanItems: [],
  deliveryUnits: [],
  dashboardCards: [],
  appSettings: FALLBACK_APP_SETTINGS,

  initialize: async () => {
    const [
      users,
      clients,
      projects,
      tasks,
      calendarEvents,
      financialEntries,
      leads,
      contentItems,
      files,
      deliveryPlanItems,
      deliveryUnits,
      dashboardCards,
      appSettingsRows,
    ] = await Promise.all([
      fetchTable<User>('users'),
      fetchTable<Client>('clients'),
      fetchTable<Project>('projects'),
      fetchTable<Task>('tasks'),
      fetchTable<CalendarEvent>('calendar_events'),
      fetchTable<FinancialEntry>('financial_entries'),
      fetchTable<Lead>('leads'),
      fetchTable<ContentItem>('content_items'),
      fetchTable<FileResource>('files'),
      fetchTable<DeliveryPlanItem>('delivery_plan_items'),
      fetchTable<DeliveryUnit>('delivery_units'),
      fetchTable<DashboardCardDefinition>('dashboard_cards'),
      fetchTable<AppSettings>('app_settings'),
    ])

    set({
      users,
      clients,
      projects,
      tasks,
      calendarEvents,
      financialEntries,
      leads,
      contentItems,
      files,
      deliveryPlanItems,
      deliveryUnits,
      dashboardCards,
      appSettings: appSettingsRows[0] ?? FALLBACK_APP_SETTINGS,
      initialized: true,
    })

    if (realtimeSubscribed) return
    realtimeSubscribed = true

    subscribeListTable<User>('users', 'users', set)
    subscribeListTable<Client>('clients', 'clients', set)
    subscribeListTable<Project>('projects', 'projects', set)
    subscribeListTable<Task>('tasks', 'tasks', set)
    subscribeListTable<CalendarEvent>('calendar_events', 'calendarEvents', set)
    subscribeListTable<FinancialEntry>('financial_entries', 'financialEntries', set)
    subscribeListTable<Lead>('leads', 'leads', set)
    subscribeListTable<ContentItem>('content_items', 'contentItems', set)
    subscribeListTable<FileResource>('files', 'files', set)
    subscribeListTable<DeliveryPlanItem>('delivery_plan_items', 'deliveryPlanItems', set)
    subscribeListTable<DeliveryUnit>('delivery_units', 'deliveryUnits', set)
    subscribeListTable<DashboardCardDefinition>('dashboard_cards', 'dashboardCards', set)

    supabase
      .channel('realtime:app_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        set({ appSettings: rowToEntity<AppSettings>(payload.new) })
      })
      .subscribe()
  },

  addUser: (data) => {
    const user: User = { ...data, id: generateId('usr'), createdAt: todayIso() }
    set((s) => ({ users: [...s.users, user] }))
    supabase
      .from('users')
      .insert(entityToRow(user))
      .then(({ error }) => {
        if (reportError('criar usuário', 'users', error)) set((s) => ({ users: s.users.filter((u) => u.id !== user.id) }))
      })
    return user
  },
  updateUser: (id, patch) => {
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }))
    supabase
      .from('users')
      .update(entityToRow(patch))
      .eq('id', id)
      .then(({ error }) => reportError('atualizar usuário', 'users', error))
  },
  removeUser: (id) => {
    const previous = get().users
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }))
    supabase
      .from('users')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (reportError('excluir usuário', 'users', error)) set({ users: previous })
      })
  },

  addClient: (data) => {
    const client: Client = { ...data, id: generateId('cli'), createdAt: todayIso() }
    set((s) => ({ clients: [...s.clients, client] }))
    supabase
      .from('clients')
      .insert(entityToRow(client))
      .then(({ error }) => {
        if (reportError('criar cliente', 'clients', error)) {
          set((s) => ({ clients: s.clients.filter((c) => c.id !== client.id) }))
          return
        }
        // Só cria a receita depois que o cliente existe de fato no banco —
        // criar em paralelo arrisca a foreign key (financial_entries.client_id
        // exige um client_id que já esteja persistido). Cliente com valor fixo
        // já entra no Financeiro (e por consequência no dashboard da Direção,
        // que lê da mesma coleção) como receita prevista deste mês. Cliente
        // por percentual não tem valor conhecido de antemão, então não gera
        // lançamento — isso continua manual.
        if (client.billingType === 'fixo' && client.monthlyValue > 0) {
          get().addFinancialEntry({
            type: 'receita',
            category: 'Mensalidade',
            description: `Mensalidade — ${client.name}`,
            clientId: client.id,
            amount: client.monthlyValue,
            dueDate: todayIso(),
            status: 'previsto',
            recurring: true,
          })
        }
      })
    return client
  },
  updateClient: (id, patch) => {
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
    supabase
      .from('clients')
      .update(entityToRow(patch))
      .eq('id', id)
      .then(({ error }) => reportError('atualizar cliente', 'clients', error))
  },
  removeClient: (id) => {
    const previous = get().clients
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }))
    supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (reportError('excluir cliente', 'clients', error)) set({ clients: previous })
      })
  },

  addProject: (data) => {
    const project: Project = { ...data, id: generateId('proj'), createdAt: todayIso() }
    set((s) => ({ projects: [...s.projects, project] }))
    supabase
      .from('projects')
      .insert(entityToRow(project))
      .then(({ error }) => {
        if (reportError('criar projeto', 'projects', error)) set((s) => ({ projects: s.projects.filter((p) => p.id !== project.id) }))
      })
    return project
  },
  updateProject: (id, patch) => {
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
    supabase
      .from('projects')
      .update(entityToRow(patch))
      .eq('id', id)
      .then(({ error }) => reportError('atualizar projeto', 'projects', error))
  },
  removeProject: (id) => {
    const previous = get().projects
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
    supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (reportError('excluir projeto', 'projects', error)) set({ projects: previous })
      })
  },

  addTask: (data) => {
    const task: Task = { ...data, id: generateId('tsk'), createdAt: todayIso() }
    set((s) => ({ tasks: [...s.tasks, task] }))
    supabase
      .from('tasks')
      .insert(entityToRow(task))
      .then(({ error }) => {
        if (reportError('criar tarefa', 'tasks', error)) set((s) => ({ tasks: s.tasks.filter((t) => t.id !== task.id) }))
      })
    return task
  },
  updateTask: (id, patch) => {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
    supabase
      .from('tasks')
      .update(entityToRow(patch))
      .eq('id', id)
      .then(({ error }) => reportError('atualizar tarefa', 'tasks', error))
  },
  removeTask: (id) => {
    const previous = get().tasks
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (reportError('excluir tarefa', 'tasks', error)) set({ tasks: previous })
      })
  },

  addCalendarEvent: (data) => {
    const event: CalendarEvent = { ...data, id: generateId('evt'), source: 'manual' }
    set((s) => ({ calendarEvents: [...s.calendarEvents, event] }))
    supabase
      .from('calendar_events')
      .insert(entityToRow(event))
      .then(({ error }) => {
        if (reportError('criar evento', 'calendar_events', error)) set((s) => ({ calendarEvents: s.calendarEvents.filter((e) => e.id !== event.id) }))
      })
    return event
  },
  updateCalendarEvent: (id, patch) => {
    set((s) => ({ calendarEvents: s.calendarEvents.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
    supabase
      .from('calendar_events')
      .update(entityToRow(patch))
      .eq('id', id)
      .then(({ error }) => reportError('atualizar evento', 'calendar_events', error))
  },
  removeCalendarEvent: (id) => {
    const previous = get().calendarEvents
    set((s) => ({ calendarEvents: s.calendarEvents.filter((e) => e.id !== id) }))
    supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (reportError('excluir evento', 'calendar_events', error)) set({ calendarEvents: previous })
      })
  },

  addFinancialEntry: (data) => {
    const entry: FinancialEntry = { ...data, id: generateId('fin') }
    set((s) => ({ financialEntries: [...s.financialEntries, entry] }))
    supabase
      .from('financial_entries')
      .insert(entityToRow(entry))
      .then(({ error }) => {
        if (reportError('criar lançamento', 'financial_entries', error)) set((s) => ({ financialEntries: s.financialEntries.filter((f) => f.id !== entry.id) }))
      })
    return entry
  },
  updateFinancialEntry: (id, patch) => {
    set((s) => ({ financialEntries: s.financialEntries.map((f) => (f.id === id ? { ...f, ...patch } : f)) }))
    supabase
      .from('financial_entries')
      .update(entityToRow(patch))
      .eq('id', id)
      .then(({ error }) => reportError('atualizar lançamento', 'financial_entries', error))
  },
  removeFinancialEntry: (id) => {
    const previous = get().financialEntries
    set((s) => ({ financialEntries: s.financialEntries.filter((f) => f.id !== id) }))
    supabase
      .from('financial_entries')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (reportError('excluir lançamento', 'financial_entries', error)) set({ financialEntries: previous })
      })
  },

  addLead: (data) => {
    const lead: Lead = { ...data, id: generateId('lead'), createdAt: todayIso() }
    set((s) => ({ leads: [...s.leads, lead] }))
    supabase
      .from('leads')
      .insert(entityToRow(lead))
      .then(({ error }) => {
        if (reportError('criar lead', 'leads', error)) set((s) => ({ leads: s.leads.filter((l) => l.id !== lead.id) }))
      })
    return lead
  },
  updateLead: (id, patch) => {
    set((s) => ({ leads: s.leads.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))
    supabase
      .from('leads')
      .update(entityToRow(patch))
      .eq('id', id)
      .then(({ error }) => reportError('atualizar lead', 'leads', error))
  },
  removeLead: (id) => {
    const previous = get().leads
    set((s) => ({ leads: s.leads.filter((l) => l.id !== id) }))
    supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (reportError('excluir lead', 'leads', error)) set({ leads: previous })
      })
  },

  addContentItem: (data) => {
    const item: ContentItem = { ...data, id: generateId('cnt'), createdAt: todayIso() }
    set((s) => ({ contentItems: [...s.contentItems, item] }))
    supabase
      .from('content_items')
      .insert(entityToRow(item))
      .then(({ error }) => {
        if (reportError('criar peça', 'content_items', error)) set((s) => ({ contentItems: s.contentItems.filter((c) => c.id !== item.id) }))
      })
    return item
  },
  updateContentItem: (id, patch) => {
    set((s) => ({ contentItems: s.contentItems.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
    supabase
      .from('content_items')
      .update(entityToRow(patch))
      .eq('id', id)
      .then(({ error }) => reportError('atualizar peça', 'content_items', error))
  },
  removeContentItem: (id) => {
    const previous = get().contentItems
    set((s) => ({ contentItems: s.contentItems.filter((c) => c.id !== id) }))
    supabase
      .from('content_items')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (reportError('excluir peça', 'content_items', error)) set({ contentItems: previous })
      })
  },

  addFile: (data) => {
    const file: FileResource = { ...data, id: generateId('file'), createdAt: todayIso() }
    set((s) => ({ files: [...s.files, file] }))
    supabase
      .from('files')
      .insert(entityToRow(file))
      .then(({ error }) => {
        if (reportError('criar arquivo', 'files', error)) set((s) => ({ files: s.files.filter((f) => f.id !== file.id) }))
      })
    return file
  },
  updateFile: (id, patch) => {
    set((s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) }))
    supabase
      .from('files')
      .update(entityToRow(patch))
      .eq('id', id)
      .then(({ error }) => reportError('atualizar arquivo', 'files', error))
  },
  removeFile: (id) => {
    const previous = get().files
    set((s) => ({ files: s.files.filter((f) => f.id !== id) }))
    supabase
      .from('files')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (reportError('excluir arquivo', 'files', error)) set({ files: previous })
      })
  },

  addDeliveryPlanItem: (data) => {
    const item: DeliveryPlanItem = { ...data, id: generateId('dplan'), createdAt: todayIso() }
    set((s) => ({ deliveryPlanItems: [...s.deliveryPlanItems, item] }))
    supabase
      .from('delivery_plan_items')
      .insert(entityToRow(item))
      .then(({ error }) => {
        if (reportError('criar item contratado', 'delivery_plan_items', error))
          set((s) => ({ deliveryPlanItems: s.deliveryPlanItems.filter((p) => p.id !== item.id) }))
      })
    return item
  },
  updateDeliveryPlanItem: (id, patch) => {
    set((s) => ({ deliveryPlanItems: s.deliveryPlanItems.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
    supabase
      .from('delivery_plan_items')
      .update(entityToRow(patch))
      .eq('id', id)
      .then(({ error }) => reportError('atualizar item contratado', 'delivery_plan_items', error))
  },
  removeDeliveryPlanItem: (id) => {
    const previousItems = get().deliveryPlanItems
    const previousUnits = get().deliveryUnits
    set((s) => ({
      deliveryPlanItems: s.deliveryPlanItems.filter((p) => p.id !== id),
      deliveryUnits: s.deliveryUnits.filter((u) => u.planItemId !== id),
    }))
    supabase
      .from('delivery_plan_items')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (reportError('excluir item contratado', 'delivery_plan_items', error)) set({ deliveryPlanItems: previousItems, deliveryUnits: previousUnits })
      })
  },

  addDeliveryUnit: (data) => {
    const unit: DeliveryUnit = { ...data, id: generateId('dunit'), createdAt: todayIso() }
    set((s) => ({ deliveryUnits: [...s.deliveryUnits, unit] }))
    supabase
      .from('delivery_units')
      .insert(entityToRow(unit))
      .then(({ error }) => {
        if (reportError('criar entrega', 'delivery_units', error)) set((s) => ({ deliveryUnits: s.deliveryUnits.filter((u) => u.id !== unit.id) }))
      })
    return unit
  },
  updateDeliveryUnit: (id, patch) => {
    set((s) => ({ deliveryUnits: s.deliveryUnits.map((u) => (u.id === id ? { ...u, ...patch } : u)) }))
    supabase
      .from('delivery_units')
      .update(entityToRow(patch))
      .eq('id', id)
      .then(({ error }) => reportError('atualizar entrega', 'delivery_units', error))
  },
  removeDeliveryUnit: (id) => {
    const previous = get().deliveryUnits
    set((s) => ({ deliveryUnits: s.deliveryUnits.filter((u) => u.id !== id) }))
    supabase
      .from('delivery_units')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (reportError('excluir entrega', 'delivery_units', error)) set({ deliveryUnits: previous })
      })
  },

  updateDashboardCard: (id, patch) => {
    set((s) => ({ dashboardCards: s.dashboardCards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
    supabase
      .from('dashboard_cards')
      .update(entityToRow(patch))
      .eq('id', id)
      .then(({ error }) => reportError('atualizar card', 'dashboard_cards', error))
  },

  updateAppSettings: (patch) => {
    set((s) => ({ appSettings: { ...s.appSettings, ...patch } }))
    supabase
      .from('app_settings')
      .update(entityToRow(patch))
      .eq('id', 1)
      .then(({ error }) => reportError('atualizar configurações', 'app_settings', error))
  },
}))
