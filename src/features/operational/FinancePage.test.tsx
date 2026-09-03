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

// Bug real encontrado na Fase 7: mudar o status pra "pago" pelo dropdown
// rápido da tabela (statusColumn) só mandava `{status}`, sem carimbar
// `paidDate` -- diferente do que o próprio FinancialEntryFormModal já fazia
// ao editar pelo modal. Como "Receita recebida" soma por `paidDate` (caindo
// pra `dueDate` só na ausência dele), uma receita com vencimento em mês
// passado marcada como paga HOJE pelo dropdown ficava atribuída ao mês
// errado -- confirmado ao vivo em staging antes da correção.
describe('FinancePage — marcar "pago" pelo dropdown rápido carimba paidDate', () => {
  it('entrada sem paidDate: mudar status pra pago inclui paidDate (hoje) no payload', () => {
    const entry = makeEntry({ status: 'pendente', paidDate: undefined })
    const { updateFinancialEntry } = renderFinancePage(entry)

    // A tela também tem um <select> de filtro por cliente acima da tabela --
    // o da linha (StatusSelect) é sempre o último no DOM.
    const select = screen.getAllByRole('combobox').at(-1)!
    fireEvent.change(select, { target: { value: 'pago' } })

    expect(updateFinancialEntry).toHaveBeenCalledTimes(1)
    const [id, patch] = updateFinancialEntry.mock.calls[0]
    expect(id).toBe('fin_1')
    expect(patch.status).toBe('pago')
    expect(patch.paidDate).toBe(new Date().toISOString().slice(0, 10))
  })

  it('entrada que já tem paidDate: reafirmar "pago" não sobrescreve a data original com a de hoje', () => {
    const entry = makeEntry({ status: 'previsto', paidDate: '2025-03-01' })
    const { updateFinancialEntry } = renderFinancePage(entry)

    // A tela também tem um <select> de filtro por cliente acima da tabela --
    // o da linha (StatusSelect) é sempre o último no DOM.
    const select = screen.getAllByRole('combobox').at(-1)!
    fireEvent.change(select, { target: { value: 'pago' } })

    expect(updateFinancialEntry).toHaveBeenCalledTimes(1)
    const [, patch] = updateFinancialEntry.mock.calls[0]
    // `entry.paidDate` já era truthy -- o guard `!entry.paidDate` não deve
    // incluir um novo paidDate no patch, preservando o valor existente em
    // vez de sempre sobrescrever com a data de hoje.
    expect(patch.paidDate).toBeUndefined()
  })
})
