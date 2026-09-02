/**
 * Fake mínimo do client Supabase para os testes unitários de src/data/store.ts.
 *
 * Não reimplementa o query builder real — só o suficiente pra suportar as
 * cadeias que store.ts de fato usa (select/insert/update/delete/eq/maybeSingle,
 * sempre resolvidas no `await` final da cadeia). Cada chamada a `.from(table)`
 * consome a PRÓXIMA resposta enfileirada para aquela tabela com `enqueue` — os
 * testes enfileiram na mesma ordem em que o código sob teste realmente chama
 * o banco, o que também serve de documentação de quantas idas ao banco cada
 * fluxo faz.
 */
import { vi } from 'vitest'

export interface PgResponse {
  data?: unknown
  error?: { message: string; code?: string } | null
}

const queues = new Map<string, PgResponse[]>()

export interface RecordedCall {
  table: string
  method: string
  args: unknown[]
}

/** Log de toda chamada de método na cadeia (select/insert/update/.../eq) — usado para
 * asserções do tipo "esta tabela nunca foi lida com a coluna X" sem reimplementar o builder real. */
export const calls: RecordedCall[] = []

function nextFor(table: string): PgResponse {
  const q = queues.get(table)
  if (!q || q.length === 0) {
    throw new Error(
      `[supabaseMock] nenhuma resposta enfileirada para a tabela "${table}" — chame enqueue('${table}', {...}) antes de disparar a action testada.`,
    )
  }
  return q.shift()!
}

/** Enfileira a resposta que a PRÓXIMA chamada a `.from(table)` deve resolver. */
export function enqueue(table: string, response: PgResponse) {
  const q = queues.get(table) ?? []
  q.push(response)
  queues.set(table, q)
}

function makeBuilder(table: string) {
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'order', 'gte', 'lte', 'limit'] as const
  const builder: Record<string, unknown> = {}
  for (const method of chainMethods) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push({ table, method, args })
      return builder
    })
  }
  builder.maybeSingle = vi.fn(() => {
    calls.push({ table, method: 'maybeSingle', args: [] })
    return builder
  })
  builder.single = vi.fn(() => {
    calls.push({ table, method: 'single', args: [] })
    return builder
  })
  // supabase-js builders são "thenable": awaitar a cadeia sem chamar nenhum
  // método terminal (ex: fetchTable faz só `.select('*')`) já dispara a
  // requisição. É esse `.then` que faz nosso fake resolver certo nos dois casos.
  builder.then = (onFulfilled: (v: PgResponse) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve()
      .then(() => nextFor(table))
      .then(onFulfilled, onRejected)
  return builder
}

function makeChannel() {
  const channel: Record<string, unknown> = {}
  channel.on = vi.fn(() => channel)
  channel.subscribe = vi.fn(() => channel)
  return channel
}

export const supabase = {
  from: vi.fn((table: string) => makeBuilder(table)),
  rpc: vi.fn(),
  channel: vi.fn(() => makeChannel()),
  removeAllChannels: vi.fn(),
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(async () => ({ error: null })),
    onAuthStateChange: vi.fn((_callback: (event: string, session: unknown) => void) => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
}

/** Limpa filas e histórico de chamadas entre testes (chamar em `beforeEach`). */
export function resetSupabaseMock() {
  queues.clear()
  calls.length = 0
  supabase.from.mockClear()
  supabase.rpc.mockReset()
  supabase.channel.mockClear()
  supabase.removeAllChannels.mockClear()
  supabase.auth.signInWithPassword.mockReset()
  supabase.auth.signOut.mockReset()
  supabase.auth.signOut.mockImplementation(async () => ({ error: null }))
  supabase.auth.onAuthStateChange.mockClear()
}
