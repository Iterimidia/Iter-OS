/**
 * Camada central de dados do Iter OS — Zustand por cima do Supabase.
 *
 * Cada action faz uma atualização otimista no estado local (resposta
 * instantânea na UI) e dispara a chamada real ao Supabase; se a chamada
 * falhar, a mudança local é revertida (rollback pro valor anterior) e o
 * chamador recebe um resultado explícito (`{ok:false, error}`) — nenhuma
 * action mente dizendo "criado"/"salvo"/"excluído" quando a persistência
 * não confirmou. Assinaturas Realtime (`postgres_changes`) mantêm o estado
 * sincronizado quando OUTRA aba/navegador/pessoa muda algo — é isso que
 * resolve o problema de cada navegador ver uma cópia isolada dos dados.
 *
 * Chame `useDataStore.getState().initialize(identityId)` uma vez (ver
 * src/app/App.tsx) antes de renderizar qualquer tela que dependa destes
 * dados.
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

/** Erro do Postgres visto pelo PostgREST — só os campos que realmente usamos. */
interface PgError {
  message: string
  code?: string
}

/**
 * Sempre loga; por padrão também avisa o usuário com um alert (mantém a UX
 * simples que o app já tinha — sem toast/redesign). `silent: true` é usado
 * só quando quem chamou vai compor uma mensagem própria mais específica
 * (ex: falha num passo de uma operação composta) e não quer dois avisos
 * empilhados para o mesmo evento.
 */
function reportError(action: string, table: string, error: PgError | null, opts: { silent?: boolean } = {}): boolean {
  if (!error) return false
  console.error(`[Supabase] Falha ao ${action} em "${table}":`, error)
  if (opts.silent) return true
  // 23503 = foreign_key_violation — a causa mais comum e mais confusa se
  // mostrada como texto cru do Postgres (ex: excluir um cliente que ainda
  // tem entregas contratadas vinculadas).
  const friendly =
    error.code === '23503'
      ? `Não foi possível ${action}: existem outros registros vinculados a este item.`
      : `Não foi possível ${action} (${table}). Detalhe: ${error.message}`
  window.alert(friendly)
  return true
}

/**
 * Busca sem alertar individualmente — usada só pelo carregamento inicial
 * (`initialize`), que trata falha de rede/API como um estado próprio
 * (`loadError`, ver abaixo) em vez de "lista vazia" ou de uma enxurrada de
 * alerts (uma por tabela) se a rede cair.
 */
async function fetchTable<T>(table: string): Promise<{ data: T[]; ok: boolean }> {
  const { data, error } = await supabase.from(table).select('*')
  if (error) {
    console.error(`[Supabase] Falha ao carregar "${table}":`, error)
    return { data: [], ok: false }
  }
  return { data: (data ?? []).map((row) => rowToEntity<T>(row as Record<string, unknown>)), ok: true }
}

/**
 * `users.password` (coluna legada) não tem mais GRANT de SELECT para
 * `authenticated` (Fase 2, B4b) — um `select('*')` nessa tabela é negado por
 * inteiro pelo Postgres, não "quase tudo menos password". Por isso `users` é
 * sempre buscada à parte, com a lista explícita de colunas seguras abaixo.
 */
const USER_SAFE_COLUMNS =
  'id,name,email,role,job_title,avatar_initials,avatar_color,active,allowed_bases,allowed_areas,allowed_actions,allowed_client_ids,allowed_dashboard_cards,created_at,auth_user_id'

async function fetchUsers(): Promise<{ data: User[]; ok: boolean }> {
  const { data, error } = await supabase.from('users').select(USER_SAFE_COLUMNS)
  if (error) {
    console.error('[Supabase] Falha ao carregar "users":', error)
    return { data: [], ok: false }
  }
  return { data: (data ?? []).map((row) => rowToEntity<User>(row as Record<string, unknown>)), ok: true }
}

/** Nunca deixa um `password` vindo de um payload Realtime entrar no estado do app. */
function stripPassword(row: Record<string, unknown>): Record<string, unknown> {
  const { password: _password, ...rest } = row
  return rest
}

// ---------------------------------------------------------------------------
// Helpers genéricos de CRUD com atualização otimista + rollback real.
//
// As 12 coleções abaixo (`ListKey`) seguem todas o mesmo formato — um array
// de entidades com `id`, uma tabela do Supabase correspondente. Em vez de
// repetir "otimista + insert/update/delete + rollback no erro" 30+ vezes (e
// arriscar esquecer o rollback em alguma — foi exatamente isso que
// aconteceu antes: todo `updateX` fazia a atualização otimista mas não
// desfazia nada se o Supabase recusasse, deixando o Zustand com uma edição
// que parecia salva mas nunca foi), a lógica mora aqui uma vez só.
// ---------------------------------------------------------------------------
type ListKey =
  | 'users'
  | 'clients'
  | 'projects'
  | 'tasks'
  | 'calendarEvents'
  | 'financialEntries'
  | 'leads'
  | 'contentItems'
  | 'files'
  | 'deliveryPlanItems'
  | 'deliveryUnits'
  | 'dashboardCards'

export type MutationResult<T> = { ok: true; data: T } | { ok: false; error: string }

type SetFn = (fn: (s: DataState) => Partial<DataState>) => void
type GetFn = () => DataState

function getList<T>(state: DataState, key: ListKey): T[] {
  return state[key] as unknown as T[]
}

/** Cria otimisticamente; se o `insert` falhar, remove o item de volta e devolve o erro — nunca fica "criado" só na tela. */
async function createRow<T extends { id: string }>(
  set: SetFn,
  key: ListKey,
  table: string,
  label: string,
  item: T,
  opts: { silent?: boolean } = {},
): Promise<MutationResult<T>> {
  set((s) => ({ [key]: [...getList<T>(s, key), item] }) as Partial<DataState>)
  const { error } = await supabase.from(table).insert(entityToRow(item))
  if (error) {
    set((s) => ({ [key]: getList<T>(s, key).filter((x) => x.id !== item.id) }) as Partial<DataState>)
    reportError(label, table, error, opts)
    return { ok: false, error: error.message }
  }
  return { ok: true, data: item }
}

/** Atualiza otimisticamente; se o `update` falhar, restaura o valor anterior daquele item (rollback real, não só um aviso). */
async function updateRow<T extends { id: string }>(
  set: SetFn,
  get: GetFn,
  key: ListKey,
  table: string,
  label: string,
  id: string,
  patch: Partial<T>,
  opts: { silent?: boolean } = {},
): Promise<MutationResult<T>> {
  const previous = getList<T>(get(), key).find((x) => x.id === id)
  set((s) => ({ [key]: getList<T>(s, key).map((x) => (x.id === id ? { ...x, ...patch } : x)) }) as Partial<DataState>)
  const { error } = await supabase.from(table).update(entityToRow(patch)).eq('id', id)
  if (error) {
    if (previous) set((s) => ({ [key]: getList<T>(s, key).map((x) => (x.id === id ? previous : x)) }) as Partial<DataState>)
    reportError(label, table, error, opts)
    return { ok: false, error: error.message }
  }
  return { ok: true, data: (previous ? { ...previous, ...patch } : patch) as T }
}

/** Remove otimisticamente; se o `delete` falhar (ex: FK bloqueando), restaura a lista inteira — o registro não pode sumir da tela e continuar no banco. */
async function removeRow<T extends { id: string }>(
  set: SetFn,
  get: GetFn,
  key: ListKey,
  table: string,
  label: string,
  id: string,
): Promise<MutationResult<null>> {
  const previous = getList<T>(get(), key)
  set((s) => ({ [key]: getList<T>(s, key).filter((x) => x.id !== id) }) as Partial<DataState>)
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) {
    set(() => ({ [key]: previous }) as Partial<DataState>)
    reportError(label, table, error)
    return { ok: false, error: error.message }
  }
  return { ok: true, data: null }
}

interface DataState {
  initialized: boolean
  /**
   * Identidade (`session.user.id`) DONA dos dados atualmente carregados —
   * só é setado depois que `initialize(identityId)` termina validamente
   * pra aquela geração (nunca antes, nunca por uma carga já invalidada).
   * `reset()` zera na hora. É contra ISSO, não contra `initialized`, que a
   * árvore privada deve comparar `session.user.id`: entre a sessão virar B
   * e o efeito que chama `initialize(B)` rodar, `initialized` ainda pode
   * estar `true` com dados de A — `loadedIdentityId` continua sendo A até
   * a carga de B terminar de verdade, e é essa divergência que barra o
   * render da árvore privada nesse intervalo (ver src/app/guards.tsx).
   */
  loadedIdentityId: string | null
  /**
   * Mensagem quando o carregamento inicial falhou (parcial ou totalmente) —
   * `null` quando tudo carregou (ou ainda não tentou). Existe pra separar
   * "não existem registros" (arrays vazios de verdade) de "não consegui
   * carregar os registros" (erro de rede/API): sem isso, uma falha de
   * fetch vira silenciosamente uma tela "vazia" indistinguível de dado
   * real. Ver src/app/guards.tsx — enquanto houver `loadError`, a árvore
   * privada não renderiza; aparece uma tela de erro com "tentar de novo".
   */
  loadError: string | null
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

  addUser: (data: Omit<User, 'id' | 'createdAt'>) => Promise<MutationResult<User>>
  updateUser: (id: string, patch: Partial<User>) => Promise<MutationResult<User>>
  removeUser: (id: string) => Promise<MutationResult<null>>

  addClient: (data: Omit<Client, 'id' | 'createdAt'>) => Promise<MutationResult<Client>>
  updateClient: (id: string, patch: Partial<Client>) => Promise<MutationResult<Client>>
  removeClient: (id: string) => Promise<MutationResult<null>>

  addProject: (data: Omit<Project, 'id' | 'createdAt'>) => Promise<MutationResult<Project>>
  updateProject: (id: string, patch: Partial<Project>) => Promise<MutationResult<Project>>
  removeProject: (id: string) => Promise<MutationResult<null>>

  addTask: (data: Omit<Task, 'id' | 'createdAt'>) => Promise<MutationResult<Task>>
  updateTask: (id: string, patch: Partial<Task>) => Promise<MutationResult<Task>>
  removeTask: (id: string) => Promise<MutationResult<null>>

  addCalendarEvent: (data: Omit<CalendarEvent, 'id' | 'source'>) => Promise<MutationResult<CalendarEvent>>
  updateCalendarEvent: (id: string, patch: Partial<CalendarEvent>) => Promise<MutationResult<CalendarEvent>>
  removeCalendarEvent: (id: string) => Promise<MutationResult<null>>

  addFinancialEntry: (data: Omit<FinancialEntry, 'id'>) => Promise<MutationResult<FinancialEntry>>
  updateFinancialEntry: (id: string, patch: Partial<FinancialEntry>) => Promise<MutationResult<FinancialEntry>>
  removeFinancialEntry: (id: string) => Promise<MutationResult<null>>

  addLead: (data: Omit<Lead, 'id' | 'createdAt'>) => Promise<MutationResult<Lead>>
  updateLead: (id: string, patch: Partial<Lead>) => Promise<MutationResult<Lead>>
  removeLead: (id: string) => Promise<MutationResult<null>>

  addContentItem: (data: Omit<ContentItem, 'id' | 'createdAt'>) => Promise<MutationResult<ContentItem>>
  updateContentItem: (id: string, patch: Partial<ContentItem>) => Promise<MutationResult<ContentItem>>
  removeContentItem: (id: string) => Promise<MutationResult<null>>

  addFile: (data: Omit<FileResource, 'id' | 'createdAt'>) => Promise<MutationResult<FileResource>>
  updateFile: (id: string, patch: Partial<FileResource>) => Promise<MutationResult<FileResource>>
  removeFile: (id: string) => Promise<MutationResult<null>>

  addDeliveryPlanItem: (data: Omit<DeliveryPlanItem, 'id' | 'createdAt'>) => Promise<MutationResult<DeliveryPlanItem>>
  updateDeliveryPlanItem: (id: string, patch: Partial<DeliveryPlanItem>) => Promise<MutationResult<DeliveryPlanItem>>
  removeDeliveryPlanItem: (id: string) => Promise<MutationResult<null>>

  addDeliveryUnit: (data: Omit<DeliveryUnit, 'id' | 'createdAt'>) => Promise<MutationResult<DeliveryUnit>>
  updateDeliveryUnit: (id: string, patch: Partial<DeliveryUnit>) => Promise<MutationResult<DeliveryUnit>>
  removeDeliveryUnit: (id: string) => Promise<MutationResult<null>>

  updateDashboardCard: (id: string, patch: Partial<DashboardCardDefinition>) => Promise<MutationResult<DashboardCardDefinition>>

  updateAppSettings: (patch: Partial<AppSettings>) => Promise<MutationResult<AppSettings>>
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

const EMPTY_COLLECTIONS = {
  users: [] as User[],
  clients: [] as Client[],
  projects: [] as Project[],
  tasks: [] as Task[],
  calendarEvents: [] as CalendarEvent[],
  financialEntries: [] as FinancialEntry[],
  leads: [] as Lead[],
  contentItems: [] as ContentItem[],
  files: [] as FileResource[],
  deliveryPlanItems: [] as DeliveryPlanItem[],
  deliveryUnits: [] as DeliveryUnit[],
  dashboardCards: [] as DashboardCardDefinition[],
  appSettings: FALLBACK_APP_SETTINGS,
}

export const useDataStore = create<DataState>()((set, get) => ({
  initialized: false,
  loadedIdentityId: null,
  loadError: null,
  ...EMPTY_COLLECTIONS,

  initialize: async (identityId) => {
    // Identidade nova (primeira carga, ou troca A -> B sem passar por
    // 'signed_out' no meio) -> invalida a geração anterior e limpa os dados
    // da identidade antiga ANTES de buscar qualquer coisa nova, pra nenhuma
    // informação de A ficar visível para B, nem por um instante. Chamada
    // repetida pra MESMA identidade (ex: efeito re-executando, ou um "tentar
    // de novo" depois de um loadError) não repete esse passo, pra não
    // derrubar subscriptions saudáveis à toa nem apagar dados já corretos.
    if (identityId !== currentIdentity) {
      generation += 1
      currentIdentity = identityId
      supabase.removeAllChannels()
      set({ initialized: false, loadedIdentityId: null, loadError: null, ...EMPTY_COLLECTIONS })
    } else {
      set(() => ({ loadError: null }))
    }
    const myGeneration = generation

    const [users, clients, projects, tasks, calendarEvents, financialEntries, leads, contentItems, files, deliveryPlanItems, deliveryUnits, dashboardCards, appSettingsRows] =
      await Promise.all([
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

    const results = [users, clients, projects, tasks, calendarEvents, financialEntries, leads, contentItems, files, deliveryPlanItems, deliveryUnits, dashboardCards, appSettingsRows]
    const failedCount = results.filter((r) => !r.ok).length
    if (failedCount > 0) {
      // Falha de rede/API não vira "lista vazia" — fica em loadError, e
      // `initialized` explicitamente NÃO fica true (mesmo que uma carga
      // anterior bem-sucedida tivesse deixado `true`): a tentativa atual não
      // se completou, então nada deve tratar os dados como confirmados até
      // uma nova tentativa funcionar (ver LoadErrorScreen).
      set({
        initialized: false,
        loadError:
          failedCount === results.length
            ? 'Não foi possível carregar os dados. Verifique sua conexão e tente novamente.'
            : `Não foi possível carregar todos os dados (${failedCount} de ${results.length} não vieram). Tente novamente.`,
      })
      return
    }

    set({
      users: users.data,
      clients: clients.data,
      projects: projects.data,
      tasks: tasks.data,
      calendarEvents: calendarEvents.data,
      financialEntries: financialEntries.data,
      leads: leads.data,
      contentItems: contentItems.data,
      files: files.data,
      deliveryPlanItems: deliveryPlanItems.data,
      deliveryUnits: deliveryUnits.data,
      dashboardCards: dashboardCards.data,
      appSettings: appSettingsRows.data[0] ?? FALLBACK_APP_SETTINGS,
      initialized: true,
      loadError: null,
      // Só agora, com a geração ainda válida confirmada acima, os dados
      // passam a pertencer de fato a `identityId` — antes disso (inclusive
      // durante o(s) render(s) entre a sessão virar `identityId` e este
      // `set` rodar), `loadedIdentityId` continua sendo o dono anterior.
      loadedIdentityId: identityId,
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
    return createRow(set, 'users', 'users', 'criar usuário', user)
  },
  updateUser: (id, patch) => updateRow<User>(set, get, 'users', 'users', 'atualizar usuário', id, patch),
  removeUser: (id) => removeRow<User>(set, get, 'users', 'users', 'excluir usuário', id),

  addClient: async (data) => {
    const client: Client = { ...data, id: generateId('cli'), createdAt: todayIso() }
    const result = await createRow(set, 'clients', 'clients', 'criar cliente', client)
    if (!result.ok) return result

    // Cliente com valor fixo já entra no Financeiro (e por consequência no
    // dashboard da Direção, que lê da mesma coleção) como receita prevista
    // deste mês. Cliente por percentual não tem valor conhecido de
    // antemão, então não gera lançamento — isso continua manual. Só cria a
    // receita DEPOIS que o cliente existe de fato no banco (acima) — criar
    // em paralelo arriscaria a foreign key (financial_entries.client_id
    // exige um client_id já persistido).
    //
    // Isso é uma operação composta "macia": o cliente é o resultado
    // principal e já está garantido acima: se só a mensalidade automática
    // falhar, o cliente correto não é desfeito (desfazer um cadastro válido
    // por causa de um lançamento auxiliar seria pior) — mas o usuário
    // precisa saber exatamente o que faltou, então a falha aqui é
    // silenciada no helper genérico e vira UMA mensagem específica, em vez
    // de deixar a ausência do lançamento passar despercebida.
    if (client.billingType === 'fixo' && client.monthlyValue > 0) {
      const fee: FinancialEntry = {
        id: generateId('fin'),
        type: 'receita',
        category: 'Mensalidade',
        description: `Mensalidade — ${client.name}`,
        clientId: client.id,
        amount: client.monthlyValue,
        dueDate: todayIso(),
        status: 'previsto',
        recurring: true,
      }
      const feeResult = await createRow(set, 'financialEntries', 'financial_entries', 'criar lançamento', fee, { silent: true })
      if (!feeResult.ok) {
        window.alert(
          `Cliente "${client.name}" foi criado, mas a mensalidade automática não pôde ser registrada (${feeResult.error}). Adicione o lançamento manualmente em Financeiro.`,
        )
      }
    }
    return result
  },
  updateClient: (id, patch) => updateRow<Client>(set, get, 'clients', 'clients', 'atualizar cliente', id, patch),
  removeClient: (id) => removeRow<Client>(set, get, 'clients', 'clients', 'excluir cliente', id),

  addProject: (data) => {
    const project: Project = { ...data, id: generateId('proj'), createdAt: todayIso() }
    return createRow(set, 'projects', 'projects', 'criar projeto', project)
  },
  updateProject: (id, patch) => updateRow<Project>(set, get, 'projects', 'projects', 'atualizar projeto', id, patch),
  removeProject: (id) => removeRow<Project>(set, get, 'projects', 'projects', 'excluir projeto', id),

  addTask: (data) => {
    const task: Task = { ...data, id: generateId('tsk'), createdAt: todayIso() }
    return createRow(set, 'tasks', 'tasks', 'criar tarefa', task)
  },
  updateTask: (id, patch) => updateRow<Task>(set, get, 'tasks', 'tasks', 'atualizar tarefa', id, patch),
  removeTask: (id) => removeRow<Task>(set, get, 'tasks', 'tasks', 'excluir tarefa', id),

  addCalendarEvent: (data) => {
    const event: CalendarEvent = { ...data, id: generateId('evt'), source: 'manual' }
    return createRow(set, 'calendarEvents', 'calendar_events', 'criar evento', event)
  },
  updateCalendarEvent: (id, patch) => updateRow<CalendarEvent>(set, get, 'calendarEvents', 'calendar_events', 'atualizar evento', id, patch),
  removeCalendarEvent: (id) => removeRow<CalendarEvent>(set, get, 'calendarEvents', 'calendar_events', 'excluir evento', id),

  addFinancialEntry: (data) => {
    const entry: FinancialEntry = { ...data, id: generateId('fin') }
    return createRow(set, 'financialEntries', 'financial_entries', 'criar lançamento', entry)
  },
  updateFinancialEntry: (id, patch) => updateRow<FinancialEntry>(set, get, 'financialEntries', 'financial_entries', 'atualizar lançamento', id, patch),
  removeFinancialEntry: (id) => removeRow<FinancialEntry>(set, get, 'financialEntries', 'financial_entries', 'excluir lançamento', id),

  addLead: (data) => {
    const lead: Lead = { ...data, id: generateId('lead'), createdAt: todayIso() }
    return createRow(set, 'leads', 'leads', 'criar lead', lead)
  },
  updateLead: (id, patch) => updateRow<Lead>(set, get, 'leads', 'leads', 'atualizar lead', id, patch),
  removeLead: (id) => removeRow<Lead>(set, get, 'leads', 'leads', 'excluir lead', id),

  addContentItem: (data) => {
    const item: ContentItem = { ...data, id: generateId('cnt'), createdAt: todayIso() }
    return createRow(set, 'contentItems', 'content_items', 'criar peça', item)
  },
  updateContentItem: (id, patch) => updateRow<ContentItem>(set, get, 'contentItems', 'content_items', 'atualizar peça', id, patch),
  removeContentItem: (id) => removeRow<ContentItem>(set, get, 'contentItems', 'content_items', 'excluir peça', id),

  addFile: (data) => {
    const file: FileResource = { ...data, id: generateId('file'), createdAt: todayIso() }
    return createRow(set, 'files', 'files', 'criar arquivo', file)
  },
  updateFile: (id, patch) => updateRow<FileResource>(set, get, 'files', 'files', 'atualizar arquivo', id, patch),
  removeFile: (id) => removeRow<FileResource>(set, get, 'files', 'files', 'excluir arquivo', id),

  addDeliveryPlanItem: async (data) => {
    const item: DeliveryPlanItem = { ...data, id: generateId('dplan'), createdAt: todayIso() }
    pendingPlanItemIds.add(item.id)
    const result = await createRow(set, 'deliveryPlanItems', 'delivery_plan_items', 'criar item contratado', item)
    if (!result.ok) {
      pendingPlanItemIds.delete(item.id)
      return result
    }

    // Cria de uma vez as unidades do mês corrente — item já existe de fato
    // no banco (acima), então não arrisca a foreign key
    // delivery_units.plan_item_id. As N criações rodam em paralelo e são
    // aguardadas juntas (Promise.all): se alguma falhar isoladamente (rede
    // instável), o item contratado continua válido — o que faltar é
    // relatado numa única mensagem clara, em vez de silenciosamente ficar
    // faltando ou disparar um alert por unidade. A tela de Entregas
    // (DeliveriesPage) já reconcilia sozinha qualquer unidade que ainda
    // esteja faltando pro mês corrente da próxima vez que renderizar —
    // essa reconciliação idempotente já cobre a garantia de "sem estado
    // parcial" aqui sem precisar de uma função SQL/transação dedicada.
    const month = todayIso().slice(0, 7)
    const unitResults = await Promise.all(
      Array.from({ length: item.monthlyQuantity }, () => {
        const unit: DeliveryUnit = { id: generateId('dunit'), planItemId: item.id, clientId: item.clientId, month, status: 'pendente', createdAt: todayIso() }
        return createRow(set, 'deliveryUnits', 'delivery_units', 'criar entrega', unit, { silent: true })
      }),
    )
    pendingPlanItemIds.delete(item.id)

    const failedUnits = unitResults.filter((r) => !r.ok).length
    if (failedUnits > 0) {
      window.alert(
        `Item contratado "${item.label}" criado, mas ${failedUnits} de ${item.monthlyQuantity} entrega(s) deste mês não puderam ser registradas agora. A tela de Entregas completa automaticamente o que faltar ao ser aberta.`,
      )
    }
    return result
  },
  updateDeliveryPlanItem: (id, patch) => updateRow<DeliveryPlanItem>(set, get, 'deliveryPlanItems', 'delivery_plan_items', 'atualizar item contratado', id, patch),
  removeDeliveryPlanItem: async (id) => {
    // delivery_units.plan_item_id -> delivery_plan_items.id é ON DELETE
    // CASCADE no banco: excluir o item contratado já apaga as unidades dele
    // no servidor. A atualização otimista espelha isso localmente (remove
    // dos dois arrays de uma vez) e, se o delete falhar, restaura os dois —
    // nunca só um dos dois lados.
    const previousItems = get().deliveryPlanItems
    const previousUnits = get().deliveryUnits
    set((s) => ({
      deliveryPlanItems: s.deliveryPlanItems.filter((p) => p.id !== id),
      deliveryUnits: s.deliveryUnits.filter((u) => u.planItemId !== id),
    }))
    const { error } = await supabase.from('delivery_plan_items').delete().eq('id', id)
    if (error) {
      set({ deliveryPlanItems: previousItems, deliveryUnits: previousUnits })
      reportError('excluir item contratado', 'delivery_plan_items', error)
      return { ok: false, error: error.message }
    }
    return { ok: true, data: null }
  },

  addDeliveryUnit: (data) => {
    const unit: DeliveryUnit = { ...data, id: generateId('dunit'), createdAt: todayIso() }
    return createRow(set, 'deliveryUnits', 'delivery_units', 'criar entrega', unit)
  },
  updateDeliveryUnit: (id, patch) => updateRow<DeliveryUnit>(set, get, 'deliveryUnits', 'delivery_units', 'atualizar entrega', id, patch),
  removeDeliveryUnit: (id) => removeRow<DeliveryUnit>(set, get, 'deliveryUnits', 'delivery_units', 'excluir entrega', id),

  updateDashboardCard: (id, patch) => updateRow<DashboardCardDefinition>(set, get, 'dashboardCards', 'dashboard_cards', 'atualizar card', id, patch),

  updateAppSettings: async (patch) => {
    const previous = get().appSettings
    set((s) => ({ appSettings: { ...s.appSettings, ...patch } }))
    const { error } = await supabase.from('app_settings').update(entityToRow(patch)).eq('id', 1)
    if (error) {
      set({ appSettings: previous })
      reportError('atualizar configurações', 'app_settings', error)
      return { ok: false, error: error.message }
    }
    return { ok: true, data: { ...previous, ...patch } }
  },

  reset: () => {
    generation += 1
    currentIdentity = null
    supabase.removeAllChannels()
    set({ initialized: false, loadedIdentityId: null, loadError: null, ...EMPTY_COLLECTIONS })
  },
}))
