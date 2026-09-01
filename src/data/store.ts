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

/**
 * `users.password` (coluna legada) não tem mais GRANT de SELECT para
 * `authenticated` (Fase 2, B4b) — um `select('*')` nessa tabela é negado por
 * inteiro pelo Postgres, não "quase tudo menos password". Por isso `users` é
 * sempre buscada com a lista explícita de colunas seguras abaixo.
 */
const USER_SAFE_COLUMNS =
  'id,name,email,role,job_title,avatar_initials,avatar_color,active,allowed_bases,allowed_areas,allowed_actions,allowed_client_ids,allowed_dashboard_cards,created_at,auth_user_id'

async function fetchUsers(): Promise<User[]> {
  const { data, error } = await supabase.from('users').select(USER_SAFE_COLUMNS)
  if (reportError('carregar', 'users', error)) return []
  return (data ?? []).map((row) => rowToEntity<User>(row as Record<string, unknown>))
}

/** Nunca deixa um `password` vindo de um payload Realtime entrar no estado do app. */
function stripPassword(row: Record<string, unknown>): Record<string, unknown> {
  const { password: _password, ...rest } = row
  return rest
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

  /** Carrega os dados da identidade autenticada atual (`session.user.id`) — ver src/app/App.tsx. */
  initialize: (identityId: string) => Promise<void>
  /** Limpa todo o estado local e encerra os canais Realtime — chamado no logout, para nenhum dado do usuário anterior sobreviver na memória/UI. */
  reset: () => void

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

/**
 * Liga o ciclo de dados à identidade da sessão atual, para a corrida
 * descrita na correção pós-revisão Codex da Fase 3 não poder mais acontecer:
 * `initialize()` de A em andamento -> A desloga/troca pra B -> `reset()` (ou
 * a nova identidade) incrementa `generation` -> quando a promise antiga de A
 * finalmente resolve, ela vê `generation` diferente da que capturou e
 * descarta o resultado, em vez de repopular o store ou recriar subscriptions
 * com dados de uma identidade que não é mais a atual. Cada subscription
 * Realtime também carrega a `generation` de quando foi criada e se
 * autodesliga (ignora o evento) se ela não bate mais com a atual.
 */
let generation = 0
let currentIdentity: string | null = null

/**
 * Ids de itens contratados cuja criação ainda não foi confirmada no Supabase.
 * Enquanto pendente, ninguém deve tentar criar delivery_units apontando pra
 * esse plan_item_id — a foreign key exige que o item já exista de fato no banco.
 */
const pendingPlanItemIds = new Set<string>()
export function isDeliveryPlanItemPending(id: string): boolean {
  return pendingPlanItemIds.has(id)
}

/**
 * Assina mudanças de uma tabela-lista e mescla no array correspondente do
 * estado, por id (idempotente: seguro mesmo se a própria action já tiver
 * feito a atualização otimista). `myGeneration` é a geração vigente no
 * momento em que a subscription foi criada — se `generation` já mudou
 * quando um evento chega (identidade trocou/deslogou nesse meio-tempo), o
 * evento é ignorado em vez de escrever no store por cima da carga atual.
 */
function subscribeListTable<T extends { id: string }>(
  table: string,
  key: keyof DataState,
  set: (fn: (s: DataState) => Partial<DataState>) => void,
  myGeneration: number,
  sanitizeRow?: (row: Record<string, unknown>) => Record<string, unknown>,
) {
  supabase
    .channel(`realtime:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      if (myGeneration !== generation) return
      set((s) => {
        const list = s[key] as unknown as T[]
        if (payload.eventType === 'INSERT') {
          const item = rowToEntity<T>(sanitizeRow ? sanitizeRow(payload.new) : payload.new)
          if (list.some((x) => x.id === item.id)) return {}
          return { [key]: [...list, item] } as Partial<DataState>
        }
        if (payload.eventType === 'UPDATE') {
          const item = rowToEntity<T>(sanitizeRow ? sanitizeRow(payload.new) : payload.new)
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

  initialize: async (identityId) => {
    // Identidade nova (primeira carga, ou troca A -> B sem passar por
    // 'signed_out' no meio) -> invalida a geração anterior e limpa os dados
    // da identidade antiga ANTES de buscar qualquer coisa nova, pra nenhuma
    // informação de A ficar visível para B, nem por um instante. Chamada
    // repetida pra MESMA identidade (ex: efeito re-executando) não repete
    // esse passo, pra não derrubar subscriptions saudáveis à toa.
    if (identityId !== currentIdentity) {
      generation += 1
      currentIdentity = identityId
      supabase.removeAllChannels()
      set({
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
      })
    }
    const myGeneration = generation

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
      fetchUsers(),
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

    // A geração mudou enquanto essas buscas corriam (logout, ou troca pra
    // outra identidade, no meio do carregamento) -> este resultado é de uma
    // identidade que não é mais a atual. Descarta em vez de aplicar: não
    // repopula o store nem cria subscriptions por cima do que já foi limpo.
    if (myGeneration !== generation) return

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

    subscribeListTable<User>('users', 'users', set, myGeneration, stripPassword)
    subscribeListTable<Client>('clients', 'clients', set, myGeneration)
    subscribeListTable<Project>('projects', 'projects', set, myGeneration)
    subscribeListTable<Task>('tasks', 'tasks', set, myGeneration)
    subscribeListTable<CalendarEvent>('calendar_events', 'calendarEvents', set, myGeneration)
    subscribeListTable<FinancialEntry>('financial_entries', 'financialEntries', set, myGeneration)
    subscribeListTable<Lead>('leads', 'leads', set, myGeneration)
    subscribeListTable<ContentItem>('content_items', 'contentItems', set, myGeneration)
    subscribeListTable<FileResource>('files', 'files', set, myGeneration)
    subscribeListTable<DeliveryPlanItem>('delivery_plan_items', 'deliveryPlanItems', set, myGeneration)
    subscribeListTable<DeliveryUnit>('delivery_units', 'deliveryUnits', set, myGeneration)
    subscribeListTable<DashboardCardDefinition>('dashboard_cards', 'dashboardCards', set, myGeneration)

    supabase
      .channel('realtime:app_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'app_settings' }, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (myGeneration !== generation) return
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
    pendingPlanItemIds.add(item.id)
    set((s) => ({ deliveryPlanItems: [...s.deliveryPlanItems, item] }))
    supabase
      .from('delivery_plan_items')
      .insert(entityToRow(item))
      .then(({ error }) => {
        if (reportError('criar item contratado', 'delivery_plan_items', error)) {
          set((s) => ({ deliveryPlanItems: s.deliveryPlanItems.filter((p) => p.id !== item.id) }))
          pendingPlanItemIds.delete(item.id)
          return
        }
        // Só cria as unidades do mês depois que o item existe de fato no banco —
        // criar em paralelo arrisca a foreign key (delivery_units.plan_item_id
        // exige um plan_item_id que já esteja persistido).
        const month = todayIso().slice(0, 7)
        for (let i = 0; i < item.monthlyQuantity; i++) {
          get().addDeliveryUnit({ planItemId: item.id, clientId: item.clientId, month, status: 'pendente' })
        }
        pendingPlanItemIds.delete(item.id)
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

  reset: () => {
    generation += 1
    currentIdentity = null
    supabase.removeAllChannels()
    set({
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
    })
  },
}))
