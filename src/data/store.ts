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

/**
 * Resultado de uma releitura autoritativa de uma linha, distinguindo
 * explicitamente os três desfechos possíveis (correção pós-revisão Codex,
 * 3º round): a leitura pode ter sucesso e encontrar a linha, ter sucesso e
 * confirmar que ela não existe, ou a leitura em si pode falhar (rede, RLS,
 * permissão). Erro de leitura NUNCA pode ser tratado como "linha ausente"
 * — são desfechos diferentes com consequências diferentes.
 */
type ReadResult<T> = { kind: 'found'; row: T } | { kind: 'absent' } | { kind: 'read_failed'; error: string }

async function readRowSafely<T extends { id: string }>(table: string, id: string, columns: string): Promise<ReadResult<T>> {
  // `columns` é uma `string` em runtime (não um literal), então o supabase-js
  // cai no overload genérico de `.select()` e tiparia `data` como
  // `GenericStringError` — o cast abaixo só contorna essa limitação de
  // inferência de tipos; o valor realmente executado continua sendo a
  // projeção passada (USER_SAFE_COLUMNS para `users`, `'*'` pros demais).
  const { data, error } = await supabase.from(table).select(columns as '*').eq('id', id).maybeSingle()
  if (error) return { kind: 'read_failed', error: error.message }
  if (!data) return { kind: 'absent' }
  return { kind: 'found', row: rowToEntity<T>(data as Record<string, unknown>) }
}

/**
 * Relê uma linha específica do banco (fonte autoritativa) e reconcilia só
 * ESSA linha no array local — nunca o array inteiro. Usado quando um
 * update/delete falha (ou não afeta a linha esperada): em vez de restaurar
 * um snapshot local capturado antes da tentativa (que pode já estar
 * obsoleto — uma edição concorrente válida, ou um evento Realtime, pode
 * ter mudado a linha nesse meio-tempo), relê o estado real.
 *
 * Correção pós-revisão Codex (3º round): a releitura em si pode falhar,
 * independentemente de a linha existir ou não. Se falhar, NÃO conclui
 * ausência — usa `fallback` (o último valor CONFIRMADO que já tínhamos,
 * de antes da nossa própria tentativa) como estado seguro, sem inventar
 * nem apagar dado nenhum a partir de uma conclusão não confirmada; sem
 * `fallback` disponível, não mexe no array (o valor otimista que já
 * estava lá permanece — o retorno `confirmed:false` já deixa claro pro
 * chamador que isso NÃO é uma confirmação de sucesso). Quando outra coisa
 * (Realtime, outra chamada) já escreveu por cima da linha nesse
 * meio-tempo — detectado comparando `expectedRef` por referência — não
 * sobrescreve em nenhum dos casos: o estado atual já é mais novo que
 * qualquer coisa que estamos prestes a aplicar.
 */
async function reconcileRowFromServer<T extends { id: string }>(
  set: SetFn,
  get: GetFn,
  key: ListKey,
  table: string,
  id: string,
  expectedRef: T | undefined,
  fallback: T | undefined,
  columns: string,
): Promise<{ confirmed: true } | { confirmed: false; error: string }> {
  const result = await readRowSafely<T>(table, id, columns)
  let outcome: { confirmed: true } | { confirmed: false; error: string } = { confirmed: true }
  set((s) => {
    const list = getList<T>(s, key)
    const current = list.find((x) => x.id === id)
    if (current !== expectedRef) return {} // já mudou por outro motivo desde que a reconciliação começou — não sobrescreve

    if (result.kind === 'read_failed') {
      outcome = { confirmed: false, error: `Não foi possível confirmar o estado atual em "${table}" (${result.error}). Recarregue para verificar.` }
      if (!fallback) return {} // sem estado confirmado anterior pra usar como fallback -- não mexe (não é uma alegação de sucesso; `outcome` já sinaliza a falha)
      return { [key]: current ? list.map((x) => (x.id === id ? fallback : x)) : [...list, fallback] } as Partial<DataState>
    }
    if (result.kind === 'found') {
      return { [key]: current ? list.map((x) => (x.id === id ? result.row : x)) : [...list, result.row] } as Partial<DataState>
    }
    return { [key]: list.filter((x) => x.id !== id) } as Partial<DataState> // 'absent': leitura confirmou que a linha não existe mais de fato
  })
  return outcome
}

/**
 * Atualiza otimisticamente; confirma que a linha foi REALMENTE afetada
 * (`.select(columns).maybeSingle()` depois do update — ausência de `error`
 * não basta, o PostgREST não erra quando o `.eq('id', id)` não bate com
 * nenhuma linha, só devolve 0 resultados) e só então considera sucesso. Em
 * falha (erro real ou zero linhas afetadas), não restaura cegamente o
 * snapshot local anterior — relê a linha do banco (fonte autoritativa),
 * pra uma edição concorrente válida ou um evento Realtime não serem
 * apagados por um rollback defasado; se a própria releitura falhar, cai
 * pro último valor CONFIRMADO antes desta tentativa (`previousConfirmed`),
 * nunca conclui ausência (ver `reconcileRowFromServer`).
 *
 * `opts.columns`: projeção usada tanto no `.select()` de confirmação
 * quanto na releitura de reconciliação — pra `users`, é OBRIGATÓRIO passar
 * `USER_SAFE_COLUMNS` (nunca `'*'`/vazio), porque `password` não tem GRANT
 * de SELECT e um `select('*')`/`select()` na tabela inteira falha por
 * completo (não só omite a coluna) — o que faria até um UPDATE/DELETE que
 * teve sucesso de fato parecer uma falha aqui.
 */
async function updateRow<T extends { id: string }>(
  set: SetFn,
  get: GetFn,
  key: ListKey,
  table: string,
  label: string,
  id: string,
  patch: Partial<T>,
  opts: { silent?: boolean; columns?: string } = {},
): Promise<MutationResult<T>> {
  const columns = opts.columns ?? '*'
  const previousConfirmed = getList<T>(get(), key).find((x) => x.id === id)
  let optimisticRef: T | undefined
  set((s) => ({
    [key]: getList<T>(s, key).map((x) => {
      if (x.id !== id) return x
      optimisticRef = { ...x, ...patch } as T
      return optimisticRef
    }),
  }) as Partial<DataState>)
  const { data, error } = await supabase.from(table).update(entityToRow(patch)).eq('id', id).select(columns as '*').maybeSingle()
  if (error || !data) {
    const reconcile = await reconcileRowFromServer<T>(set, get, key, table, id, optimisticRef, previousConfirmed, columns)
    const baseErr = error ? error.message : 'Nenhuma linha foi afetada — o registro pode ter sido excluído ou alterado por outra sessão.'
    const finalErr = reconcile.confirmed ? baseErr : `${baseErr} ${reconcile.error}`
    reportError(label, table, { message: finalErr }, opts)
    return { ok: false, error: finalErr }
  }
  const authoritative = rowToEntity<T>(data)
  set((s) => ({ [key]: getList<T>(s, key).map((x) => (x.id === id ? authoritative : x)) }) as Partial<DataState>)
  return { ok: true, data: authoritative }
}

/**
 * Remove otimisticamente; confirma que uma linha foi REALMENTE excluída
 * (mesma lógica do `updateRow`: `.select(columns).maybeSingle()` depois do
 * delete — zero linhas afetadas sem `error` conta como falha). Em falha,
 * não restaura a lista inteira antiga (que pode já ter mudado por outra
 * ação/Realtime enquanto isso corria) — relê só essa linha do banco e
 * reconcilia apenas ela (`expectedRef: undefined` porque a otimista já
 * removeu a linha; se algo já a recolocou lá — ex: Realtime — não mexe);
 * se a própria releitura falhar, cai pro valor de antes da exclusão
 * (`beforeDelete`) em vez de aceitar a ausência sem confirmação real.
 *
 * `opts.columns`: mesma exigência do `updateRow` — para `users`, sempre
 * `USER_SAFE_COLUMNS`.
 */
async function removeRow<T extends { id: string }>(
  set: SetFn,
  get: GetFn,
  key: ListKey,
  table: string,
  label: string,
  id: string,
  opts: { columns?: string } = {},
): Promise<MutationResult<null>> {
  const columns = opts.columns ?? '*'
  const beforeDelete = getList<T>(get(), key).find((x) => x.id === id)
  set((s) => ({ [key]: getList<T>(s, key).filter((x) => x.id !== id) }) as Partial<DataState>)
  const { data, error } = await supabase.from(table).delete().eq('id', id).select(columns as '*').maybeSingle()
  if (error || !data) {
    const reconcile = await reconcileRowFromServer<T>(set, get, key, table, id, undefined, beforeDelete, columns)
    const baseErr = error ? error.message : 'Nenhuma linha foi afetada — o registro pode já ter sido excluído por outra sessão.'
    const finalErr = reconcile.confirmed ? baseErr : `${baseErr} ${reconcile.error}`
    reportError(label, table, { message: finalErr })
    return { ok: false, error: finalErr }
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
  /**
   * Garante que existem exatamente `monthlyQuantity` unidades pro
   * (planItemId, month) dado — idempotente no servidor (upsert com
   * UNIQUE(plan_item_id,month,unit_index) + ON CONFLICT DO NOTHING), então
   * chamar duas vezes (simultâneo ou repetido) nunca cria unidades a mais.
   * Usada tanto na criação de um item contratado quanto na tela de
   * Entregas (DeliveriesPage) pra completar o mês corrente.
   */
  reconcileDeliveryUnits: (planItemId: string, clientId: string, month: string, monthlyQuantity: number) => Promise<MutationResult<DeliveryUnit[]>>

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
 * Reconciliação idempotente de delivery_units (correção pós-revisão Codex,
 * Fase 4): duas chamadas simultâneas/repetidas pra "garanta que existem N
 * unidades pro plano X no mês Y" não podem, juntas, criar mais do que N.
 *
 * A idempotência de verdade é da constraint UNIQUE (plan_item_id, month,
 * unit_index) no banco (migration
 * 20260901190000_delivery_units_idempotent_reconciliation.sql) + upsert com
 * `ON CONFLICT DO NOTHING`: tentar criar "a unidade Nº 2 do plano X em
 * setembro" duas vezes ao mesmo tempo, de duas abas, dois usuários ou dois
 * retries, sempre resulta em NO MÁXIMO uma linha — a segunda tentativa é
 * simplesmente ignorada pelo Postgres, não é uma corrida "quem chega
 * primeiro no client". Isso vale mesmo que o guard local abaixo (o `Map`)
 * falhe por qualquer motivo — duas abas são dois processos JS diferentes,
 * sem como um enxergar o `Map` do outro.
 *
 * O `Map` guarda a PROMISE em voo (não só um booleano) por
 * (planItemId, month): uma segunda chamada concorrente pro MESMO plano+mês,
 * dentro do MESMO processo (ex: DeliveriesPage e addDeliveryPlanItem
 * disputando o mesmo plano recém-criado), espera o resultado real da
 * primeira em vez de (a) disparar outra tentativa à toa ou (b) desistir
 * cedo com uma resposta vazia que poderia ser mal interpretada como
 * "faltou completar".
 */
const reconcilingDeliveryUnits = new Map<string, Promise<MutationResult<DeliveryUnit[]>>>()

function reconcileDeliveryUnitsInternal(
  set: SetFn,
  get: GetFn,
  planItemId: string,
  clientId: string,
  month: string,
  monthlyQuantity: number,
): Promise<MutationResult<DeliveryUnit[]>> {
  const guardKey = `${planItemId}:${month}`
  const currentUnits = get().deliveryUnits.filter((u) => u.planItemId === planItemId && u.month === month)
  if (currentUnits.length >= monthlyQuantity) return Promise.resolve({ ok: true, data: currentUnits })

  const inFlight = reconcilingDeliveryUnits.get(guardKey)
  if (inFlight) return inFlight

  const attempt = (async (): Promise<MutationResult<DeliveryUnit[]>> => {
    const rows = Array.from({ length: monthlyQuantity }, (_, i) => ({
      id: generateId('dunit'),
      plan_item_id: planItemId,
      client_id: clientId,
      month,
      unit_index: i + 1,
      status: 'pendente' as const,
      created_at: todayIso(),
    }))
    const { error: upsertError } = await supabase
      .from('delivery_units')
      .upsert(rows, { onConflict: 'plan_item_id,month,unit_index', ignoreDuplicates: true })
    if (upsertError) {
      reportError('reconciliar entregas do mês', 'delivery_units', upsertError)
      return { ok: false, error: upsertError.message }
    }
    // A verdade agora é o banco (não importa se fomos nós, uma aba
    // concorrente ou um retry quem efetivamente inseriu cada linha) — relê
    // exatamente esse plano+mês e substitui no store, nem mais nem menos
    // do que existe de fato.
    const { data: freshUnits, error: selectError } = await supabase.from('delivery_units').select('*').eq('plan_item_id', planItemId).eq('month', month)
    if (selectError) {
      reportError('reconciliar entregas do mês', 'delivery_units', selectError)
      return { ok: false, error: selectError.message }
    }
    const authoritative = (freshUnits ?? []).map((row) => rowToEntity<DeliveryUnit>(row))
    set((s) => ({ deliveryUnits: [...s.deliveryUnits.filter((u) => !(u.planItemId === planItemId && u.month === month)), ...authoritative] }))
    return { ok: true, data: authoritative }
  })()

  reconcilingDeliveryUnits.set(guardKey, attempt)
  void attempt.finally(() => reconcilingDeliveryUnits.delete(guardKey))
  return attempt
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
  updateUser: (id, patch) => updateRow<User>(set, get, 'users', 'users', 'atualizar usuário', id, patch, { columns: USER_SAFE_COLUMNS }),
  removeUser: (id) => removeRow<User>(set, get, 'users', 'users', 'excluir usuário', id, { columns: USER_SAFE_COLUMNS }),

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

    // Garante as unidades do mês corrente — item já existe de fato no
    // banco (acima), então não arrisca a foreign key
    // delivery_units.plan_item_id. Usa a mesma reconciliação idempotente
    // da tela de Entregas (upsert com UNIQUE(plan_item_id,month,unit_index)
    // + ON CONFLICT DO NOTHING no servidor): se DeliveriesPage também
    // tentar reconciliar esse mesmo plano+mês ao mesmo tempo (ex: a tela já
    // está aberta quando o item é criado), as duas tentativas convergem
    // pro mesmo resultado sem duplicar nada.
    const month = todayIso().slice(0, 7)
    const unitsResult = await reconcileDeliveryUnitsInternal(set, get, item.id, item.clientId, month, item.monthlyQuantity)
    pendingPlanItemIds.delete(item.id)

    if (!unitsResult.ok || unitsResult.data.length < item.monthlyQuantity) {
      window.alert(
        `Item contratado "${item.label}" criado, mas nem todas as entregas deste mês puderam ser registradas agora. A tela de Entregas completa automaticamente o que faltar ao ser aberta.`,
      )
    }
    return result
  },
  updateDeliveryPlanItem: async (id, patch) => {
    // Correção pós-revisão Codex (3º round, ponto 3B): reduzir
    // monthlyQuantity não pode deixar mais unidades já existentes no
    // período relevante do que a nova quantidade, silenciosamente. Não há
    // como saber se a quantidade contratada era diferente em meses
    // PASSADOS (monthly_quantity não é versionado por mês), então a
    // checagem fica restrita ao MÊS CORRENTE — o único período em que
    // "nova quantidade < unidades já existentes" é inequivocamente um
    // conflito, sem precisar adivinhar histórico. Bloqueia com uma
    // mensagem clara e preserva as unidades existentes intactas, em vez de
    // apagar/ignorar qualquer coisa ou fingir que ficou tudo reconciliado.
    if (patch.monthlyQuantity !== undefined) {
      const month = todayIso().slice(0, 7)
      const existingUnitsThisMonth = get().deliveryUnits.filter((u) => u.planItemId === id && u.month === month).length
      if (patch.monthlyQuantity < existingUnitsThisMonth) {
        const currentItem = get().deliveryPlanItems.find((p) => p.id === id)
        const message = `Não é possível reduzir a quantidade mensal${currentItem ? ` de "${currentItem.label}"` : ''} para ${patch.monthlyQuantity}: já existem ${existingUnitsThisMonth} entrega(s) registrada(s) para o mês corrente (${month}). Ajuste ou remova manualmente as entregas existentes antes de reduzir a quantidade.`
        window.alert(message)
        return { ok: false, error: message }
      }
    }
    return updateRow<DeliveryPlanItem>(set, get, 'deliveryPlanItems', 'delivery_plan_items', 'atualizar item contratado', id, patch)
  },
  removeDeliveryPlanItem: async (id) => {
    // delivery_units.plan_item_id -> delivery_plan_items.id é ON DELETE
    // CASCADE no banco: excluir o item contratado já apaga as unidades dele
    // no servidor. A atualização otimista espelha isso localmente (remove
    // dos dois arrays de uma vez).
    const previousItem = get().deliveryPlanItems.find((p) => p.id === id)
    const previousUnits = get().deliveryUnits.filter((u) => u.planItemId === id)
    set((s) => ({
      deliveryPlanItems: s.deliveryPlanItems.filter((p) => p.id !== id),
      deliveryUnits: s.deliveryUnits.filter((u) => u.planItemId !== id),
    }))
    const { data, error } = await supabase.from('delivery_plan_items').delete().eq('id', id).select().maybeSingle()
    if (error || !data) {
      // Confirma o estado real em vez de restaurar um snapshot antigo por
      // padrão: o item pode ainda existir de fato (falha real) ou já ter
      // sido removido por outra sessão. Correção pós-revisão Codex (3º
      // round): se a PRÓPRIA releitura falhar, isso NUNCA é tratado como
      // "confirmado excluído" — restaura o item e as unidades de antes da
      // tentativa (último estado confirmado) em vez de deixar a exclusão
      // "vencer" sem nenhuma confirmação real.
      const itemRead = await readRowSafely<DeliveryPlanItem>('delivery_plan_items', id, '*')
      let reconcileNote = ''
      if (itemRead.kind === 'read_failed') {
        reconcileNote = ` Não foi possível confirmar se a exclusão funcionou (${itemRead.error}). Recarregue para verificar.`
        if (previousItem) {
          set((s) => {
            if (s.deliveryPlanItems.some((p) => p.id === id)) return {} // já foi recolocado por outro motivo (ex: Realtime) -- não sobrescreve
            return {
              deliveryPlanItems: [...s.deliveryPlanItems, previousItem],
              deliveryUnits: [...s.deliveryUnits.filter((u) => u.planItemId !== id), ...previousUnits],
            }
          })
        }
      } else if (itemRead.kind === 'found') {
        // Confirmado que o item ainda existe de fato -- relê também as
        // unidades dele; nunca restaura os arrays a partir de um valor
        // capturado antes da tentativa quando temos algo mais fresco.
        const { data: freshUnits, error: unitsError } = await supabase.from('delivery_units').select('*').eq('plan_item_id', id)
        if (unitsError) {
          reconcileNote = ` O item continua existindo mas não foi possível reler as entregas dele (${unitsError.message}). Recarregue para verificar.`
          set((s) => (s.deliveryPlanItems.some((p) => p.id === id) ? {} : { deliveryPlanItems: [...s.deliveryPlanItems, itemRead.row] }))
        } else {
          const restoredUnits = (freshUnits ?? []).map((row) => rowToEntity<DeliveryUnit>(row))
          set((s) => {
            if (s.deliveryPlanItems.some((p) => p.id === id)) return {}
            return {
              deliveryPlanItems: [...s.deliveryPlanItems, itemRead.row],
              deliveryUnits: [...s.deliveryUnits.filter((u) => u.planItemId !== id), ...restoredUnits],
            }
          })
        }
      }
      // 'absent': leitura confirmou que o item não existe mais -- a remoção otimista já é a verdade, nada a reconciliar.
      const baseErr = error ? error.message : 'Nenhuma linha foi afetada — o item pode já ter sido excluído por outra sessão.'
      const finalErr = baseErr + reconcileNote
      reportError('excluir item contratado', 'delivery_plan_items', { message: finalErr })
      return { ok: false, error: finalErr }
    }
    return { ok: true, data: null }
  },

  addDeliveryUnit: (data) => {
    const unit: DeliveryUnit = { ...data, id: generateId('dunit'), createdAt: todayIso() }
    return createRow(set, 'deliveryUnits', 'delivery_units', 'criar entrega', unit)
  },
  updateDeliveryUnit: (id, patch) => updateRow<DeliveryUnit>(set, get, 'deliveryUnits', 'delivery_units', 'atualizar entrega', id, patch),
  removeDeliveryUnit: (id) => removeRow<DeliveryUnit>(set, get, 'deliveryUnits', 'delivery_units', 'excluir entrega', id),
  reconcileDeliveryUnits: (planItemId, clientId, month, monthlyQuantity) => reconcileDeliveryUnitsInternal(set, get, planItemId, clientId, month, monthlyQuantity),

  updateDashboardCard: (id, patch) => updateRow<DashboardCardDefinition>(set, get, 'dashboardCards', 'dashboard_cards', 'atualizar card', id, patch),

  updateAppSettings: async (patch) => {
    const previousConfirmed = get().appSettings
    let optimisticRef: AppSettings | undefined
    set((s) => {
      optimisticRef = { ...s.appSettings, ...patch }
      return { appSettings: optimisticRef }
    })
    const { data, error } = await supabase.from('app_settings').update(entityToRow(patch)).eq('id', 1).select().maybeSingle()
    if (error || !data) {
      const { data: fresh, error: readError } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle()
      let reconcileNote = ''
      set((s) => {
        if (s.appSettings !== optimisticRef) return {} // já mudou por outro motivo desde a tentativa -- não sobrescreve
        if (readError) {
          // Correção pós-revisão Codex (3º round): erro na releitura NUNCA
          // significa "linha ausente" -- volta pro último estado
          // CONFIRMADO (antes desta tentativa), nunca para o
          // FALLBACK_APP_SETTINGS genérico, que apagaria configurações
          // reais com base numa leitura que nem chegou a acontecer.
          reconcileNote = ` Não foi possível confirmar o estado atual (${readError.message}). Recarregue para verificar.`
          return { appSettings: previousConfirmed }
        }
        // app_settings é uma linha singleton (id=1); se a leitura confirmar
        // mesmo assim que sumiu, o último valor confirmado ainda é mais
        // seguro que um fallback genérico apagando personalização real.
        return { appSettings: fresh ? rowToEntity<AppSettings>(fresh) : previousConfirmed }
      })
      const baseErr = error ? error.message : 'Nenhuma linha foi afetada.'
      const finalErr = baseErr + reconcileNote
      reportError('atualizar configurações', 'app_settings', { message: finalErr })
      return { ok: false, error: finalErr }
    }
    const authoritative = rowToEntity<AppSettings>(data)
    set({ appSettings: authoritative })
    return { ok: true, data: authoritative }
  },

  reset: () => {
    generation += 1
    currentIdentity = null
    supabase.removeAllChannels()
    set({ initialized: false, loadedIdentityId: null, loadError: null, ...EMPTY_COLLECTIONS })
  },
}))
