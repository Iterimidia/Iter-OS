import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type PgResponse, calls, deferred, enqueue, resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useDataStore } from '@/data/store'
import type { Client, FinancialEntry } from '@/types'

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'cli_test',
    name: 'Cliente Teste',
    status: 'ativo',
    plan: 'Plano X',
    billingType: 'percentual',
    monthlyValue: 0,
    services: [],
    strategicResponsibleId: 'usr_x',
    creativeResponsibleId: 'usr_x',
    createdAt: '2026-01-01',
    ...overrides,
  }
}

function snakeClientRow(client: Client) {
  return {
    id: client.id,
    name: client.name,
    status: client.status,
    plan: client.plan,
    billing_type: client.billingType,
    monthly_value: client.monthlyValue,
    services: client.services,
    strategic_responsible_id: client.strategicResponsibleId,
    creative_responsible_id: client.creativeResponsibleId,
    created_at: client.createdAt,
  }
}

beforeEach(() => {
  resetSupabaseMock()
  useDataStore.getState().reset()
})

// ---------------------------------------------------------------------------
// Estas são as garantias de integridade que já custaram rodadas inteiras de
// correção pós-revisão nas Fases 3-4 (ver histórico de commits) — proteger
// contra regressão aqui vale mais do que testar cada tela que usa o mesmo
// helper genérico (createRow/updateRow/removeRow).
// ---------------------------------------------------------------------------

describe('createRow — create falhando não deixa item fantasma', () => {
  it('addClient: insert recusado pelo Supabase reverte o item otimista do estado', async () => {
    enqueue('clients', { data: null, error: { message: 'insert recusado' } })

    const result = await useDataStore.getState().addClient({
      name: 'Cliente Fantasma',
      status: 'ativo',
      plan: 'x',
      billingType: 'percentual',
      monthlyValue: 0,
      services: [],
      strategicResponsibleId: 'u',
      creativeResponsibleId: 'u',
    })

    expect(result.ok).toBe(false)
    expect(useDataStore.getState().clients).toHaveLength(0)
  })
})

describe('updateRow — update falhando converge com o banco', () => {
  it('updateClient: update recusado relê a linha real em vez de manter o otimista ou reverter pro snapshot antigo', async () => {
    const original = makeClient({ name: 'Nome Original' })
    useDataStore.setState({ clients: [original] })

    // update falha...
    enqueue('clients', { data: null, error: { message: 'update recusado' } })
    // ...mas a releitura confirma que OUTRA sessão já tinha mudado o nome
    // nesse meio-tempo — o valor "correto" não é o otimista, nem o
    // snapshot de antes da nossa tentativa, e sim o que está no banco agora.
    const concurrentName = 'Nome Mudado Por Outra Sessão'
    enqueue('clients', { data: snakeClientRow({ ...original, name: concurrentName }), error: null })

    const result = await useDataStore.getState().updateClient(original.id, { name: 'Nome Que Eu Tentei Salvar' })

    expect(result.ok).toBe(false)
    const stored = useDataStore.getState().clients.find((c) => c.id === original.id)
    expect(stored?.name).toBe(concurrentName)
  })
})

describe('removeRow — delete + releitura falhando exige reload', () => {
  it('removeClient: delete recusado E a releitura de confirmação também falha -> loadError (não restaura snapshot obsoleto)', async () => {
    const original = makeClient()
    useDataStore.setState({ clients: [original] })

    enqueue('clients', { data: null, error: { message: 'delete recusado' } })
    enqueue('clients', { data: null, error: { message: 'rede caiu na releitura também' } })

    const result = await useDataStore.getState().removeClient(original.id)

    expect(result.ok).toBe(false)
    expect(useDataStore.getState().loadError).toBeTruthy()
  })
})

describe('zero linhas afetadas nunca é sucesso', () => {
  it('updateClient: sem error mas sem data (0 linhas afetadas) retorna ok:false', async () => {
    const original = makeClient()
    useDataStore.setState({ clients: [original] })

    // Supabase não erra quando o .eq('id', id) não bate com nada -- só
    // devolve 0 resultados. maybeSingle() então resolve como {data: null, error: null}.
    enqueue('clients', { data: null, error: null })
    // Reconciliação confirma que a linha continua exatamente como estava.
    enqueue('clients', { data: snakeClientRow(original), error: null })

    const result = await useDataStore.getState().updateClient(original.id, { name: 'Não Deveria Aplicar' })

    expect(result.ok).toBe(false)
    expect(useDataStore.getState().clients.find((c) => c.id === original.id)?.name).toBe(original.name)
  })

  it('removeClient: sem error mas sem data (0 linhas afetadas) retorna ok:false, não "excluído"', async () => {
    const original = makeClient()
    useDataStore.setState({ clients: [original] })

    enqueue('clients', { data: null, error: null })
    enqueue('clients', { data: snakeClientRow(original), error: null })

    const result = await useDataStore.getState().removeClient(original.id)

    expect(result.ok).toBe(false)
  })
})

describe('users nunca depende de leitura da coluna password', () => {
  it('updateUser nunca pede a coluna password na projeção de confirmação/releitura', async () => {
    enqueue('users', {
      data: { id: 'usr_1', name: 'Novo Nome', email: 'a@b.com', role: 'admin', active: true },
      error: null,
    })

    await useDataStore.getState().updateUser('usr_1', { name: 'Novo Nome' })

    const userSelects = calls.filter((c) => c.table === 'users' && c.method === 'select')
    expect(userSelects.length).toBeGreaterThan(0)
    for (const call of userSelects) {
      const columns = String(call.args[0] ?? '')
      expect(columns).not.toContain('password')
      expect(columns).not.toBe('*')
    }
  })
})

describe('Financeiro — falha de mutation não deixa estado financeiro incorreto no frontend', () => {
  function makeEntry(overrides: Partial<FinancialEntry> = {}): FinancialEntry {
    return {
      id: 'fin_test',
      type: 'receita',
      category: 'Mensalidade',
      description: 'Teste',
      amount: 1000,
      dueDate: '2026-01-10',
      status: 'previsto',
      ...overrides,
    }
  }

  it('updateFinancialEntry: falha na escrita relê o valor real em vez de aceitar o otimista como verdade', async () => {
    const entry = makeEntry()
    useDataStore.setState({ financialEntries: [entry] })

    enqueue('financial_entries', { data: null, error: { message: 'negado' } })
    enqueue('financial_entries', {
      data: { id: entry.id, type: entry.type, category: entry.category, description: entry.description, amount: entry.amount, due_date: entry.dueDate, status: entry.status },
      error: null,
    })

    const result = await useDataStore.getState().updateFinancialEntry(entry.id, { status: 'pago' })

    expect(result.ok).toBe(false)
    // continua "previsto" (valor real do banco), nunca "pago" (otimista de uma escrita recusada)
    expect(useDataStore.getState().financialEntries.find((e) => e.id === entry.id)?.status).toBe('previsto')
  })
})

describe('initialize()', () => {
  const TABLES = [
    'clients',
    'projects',
    'tasks',
    'calendar_events',
    'financial_entries',
    'leads',
    'content_items',
    'files',
    'delivery_plan_items',
    'delivery_units',
    'dashboard_cards',
    'app_settings',
  ]

  function enqueueAllTablesSuccess() {
    enqueue('users', { data: [], error: null })
    for (const t of TABLES) enqueue(t, { data: [], error: null })
  }

  it('carga bem-sucedida marca loadedIdentityId e nunca seleciona a coluna password de users', async () => {
    enqueueAllTablesSuccess()

    await useDataStore.getState().initialize('identity_a')

    expect(useDataStore.getState().initialized).toBe(true)
    expect(useDataStore.getState().loadError).toBeNull()
    expect(useDataStore.getState().loadedIdentityId).toBe('identity_a')

    const userSelects = calls.filter((c) => c.table === 'users' && c.method === 'select')
    expect(userSelects.length).toBe(1)
    expect(String(userSelects[0].args[0])).not.toContain('password')
  })

  it('falha parcial no carregamento vira loadError explícito, não uma lista vazia silenciosa', async () => {
    enqueue('users', { data: [], error: null })
    for (const t of TABLES) {
      if (t === 'financial_entries') {
        enqueue(t, { data: null, error: { message: 'timeout' } })
      } else {
        enqueue(t, { data: [], error: null })
      }
    }

    await useDataStore.getState().initialize('identity_b')

    expect(useDataStore.getState().initialized).toBe(false)
    expect(useDataStore.getState().loadError).toBeTruthy()
  })

  // Reproduz o cenário de invalidação por `generation` (Fase 3/4): uma
  // chamada de initialize() de uma identidade A que fica pendurada na rede
  // não pode "ganhar" e sobrescrever o estado depois que o usuário já
  // trocou pra B — nem dado, nem loadedIdentityId, nem loadError.
  it('resultado tardio de initialize(A), resolvido só depois da troca pra B, não publica dados nem mexe no estado de B', async () => {
    // A começa a carregar; toda tabela resolve na hora, exceto 'clients',
    // que fica deliberadamente pendurada -- é o suficiente pra manter o
    // Promise.all inteiro de A em voo enquanto B assume.
    const aClientsDeferred = deferred<PgResponse>()
    enqueue('users', { data: [{ id: 'usr_a', name: 'Usuário A', email: 'a@a.com', role: 'admin', active: true }], error: null })
    enqueue('clients', aClientsDeferred.promise)
    for (const t of TABLES.filter((t) => t !== 'clients')) enqueue(t, { data: [], error: null })

    const initA = useDataStore.getState().initialize('identity_a')
    // Dá tempo das 12 tabelas não-pendentes de A já terem sido "puxadas" da
    // fila antes de preparar as respostas de B (mesma tabela, fila própria).
    await new Promise((r) => setTimeout(r, 0))

    // B assume enquanto A ainda está pendurado em 'clients'.
    enqueueAllTablesSuccess()
    await useDataStore.getState().initialize('identity_b')
    expect(useDataStore.getState().loadedIdentityId).toBe('identity_b')
    expect(useDataStore.getState().initialized).toBe(true)
    expect(useDataStore.getState().loadError).toBeNull()

    // SÓ AGORA a consulta antiga de A finalmente responde (com um cliente
    // que, se aplicado, provaria o vazamento).
    aClientsDeferred.resolve({ data: [{ id: 'cli_from_a', name: 'Cliente vazado de A', status: 'ativo', plan: 'x', billing_type: 'percentual', monthly_value: 0, services: [], strategic_responsible_id: 'u', creative_responsible_id: 'u', created_at: '2026-01-01' }], error: null })
    await initA
    await new Promise((r) => setTimeout(r, 0))

    // O resultado tardio de A não conseguiu nada: nem trocar a identidade
    // dona dos dados, nem reintroduzir o cliente "vazado", nem sujar B com
    // um loadError.
    expect(useDataStore.getState().loadedIdentityId).toBe('identity_b')
    expect(useDataStore.getState().loadError).toBeNull()
    expect(useDataStore.getState().clients.some((c) => c.id === 'cli_from_a')).toBe(false)
  })
})
