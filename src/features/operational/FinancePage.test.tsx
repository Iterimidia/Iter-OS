import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useAuthStore } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { makeUser } from '@/test/fixtures'
import type { FinancialEntry } from '@/types'
import { FinancePage } from '@/features/operational/FinancePage'

const IDENTITY = 'auth_finance_test'

function makeEntry(overrides: Partial<FinancialEntry> = {}): FinancialEntry {
  return {
    id: 'fin_1',
    type: 'receita',
    category: 'Mensalidade',
    description: 'Mensalidade Cliente Teste',
    amount: 1000,
    dueDate: '2026-01-10',
    status: 'pendente',
    ...overrides,
  }
}

function renderFinancePage(
  entry: FinancialEntry,
  updateFinancialEntry = vi.fn(async (_id: string, _patch: Partial<FinancialEntry>) => ({ ok: true as const, data: entry })),
) {
  useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY } } as never })
  useDataStore.setState({
    loadedIdentityId: IDENTITY,
    users: [makeUser({ id: 'usr_1', authUserId: IDENTITY, role: 'admin' })],
    clients: [],
    financialEntries: [entry],
    updateFinancialEntry,
  })
  render(<FinancePage />)
  fireEvent.click(screen.getByRole('button', { name: /^Receitas/ }))
  return { updateFinancialEntry }
}

beforeEach(() => {
  resetSupabaseMock()
  useDataStore.getState().reset()
  useAuthStore.setState({ status: 'loading', session: null, lastError: null })
})

// Bug real encontrado na Fase 7 e corrigido em duas rodadas: (1) mudar o
// status pra "pago" pelo dropdown rápido da tabela (statusColumn) só
// mandava `{status}`, sem carimbar `paidDate`; (2) a 1ª correção só
// carimbava a data quando `paidDate` ainda estava vazio -- um lançamento
// que já tinha ido pago -> pendente -> pago de novo reaproveitava a data
// antiga (stale), atribuindo o recebimento ao mês errado, e sair de "pago"
// nunca limpava `paidDate` de verdade (mandava `undefined`, que o Supabase
// nunca persiste). A regra final vive em `resolvePaidDateOnStatusChange`
// (src/lib/utils.ts, com testes próprios); aqui só confirmamos que
// FinancePage liga o dropdown a ela corretamente.
describe('FinancePage — dropdown rápido de status aplica a regra de paidDate', () => {
  it('entrando em pago (sem paidDate prévio) -> carimba hoje', () => {
    const entry = makeEntry({ status: 'pendente', paidDate: undefined })
    const { updateFinancialEntry } = renderFinancePage(entry)

    const select = screen.getAllByRole('combobox').at(-1)!
    fireEvent.change(select, { target: { value: 'pago' } })

    expect(updateFinancialEntry).toHaveBeenCalledTimes(1)
    const [id, patch] = updateFinancialEntry.mock.calls[0]
    expect(id).toBe('fin_1')
    expect(patch.status).toBe('pago')
    expect(patch.paidDate).toBe(new Date().toISOString().slice(0, 10))
  })

  it('entrando em pago vindo de outro status, mesmo com paidDate antigo/stale no registro -> carimba hoje (não reaproveita)', () => {
    // Simula exatamente o cenário do bug: um ciclo pago -> pendente anterior
    // deixou (ou deixaria, sem a correção) um paidDate velho no registro,
    // mas o status ATUAL é 'previsto' -- entrar em pago agora não pode usar
    // essa data de 2020.
    const entry = makeEntry({ status: 'previsto', paidDate: '2020-01-01' })
    const { updateFinancialEntry } = renderFinancePage(entry)

    const select = screen.getAllByRole('combobox').at(-1)!
    fireEvent.change(select, { target: { value: 'pago' } })

    const [, patch] = updateFinancialEntry.mock.calls[0]
    expect(patch.paidDate).toBe(new Date().toISOString().slice(0, 10))
    expect(patch.paidDate).not.toBe('2020-01-01')
  })

  it('saindo de pago -> envia paidDate: null explicitamente (nunca undefined)', () => {
    const entry = makeEntry({ status: 'pago', paidDate: '2026-01-05' })
    const { updateFinancialEntry } = renderFinancePage(entry)

    const select = screen.getAllByRole('combobox').at(-1)!
    fireEvent.change(select, { target: { value: 'pendente' } })

    const [, patch] = updateFinancialEntry.mock.calls[0]
    expect(patch.status).toBe('pendente')
    expect(patch.paidDate).toBeNull()
  })
})
