import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useDataStore } from '@/data/store'
import type { FinancialEntry } from '@/types'
import { FinancialEntryFormModal } from '@/features/operational/FinancialEntryFormModal'

function makeEntry(overrides: Partial<FinancialEntry> = {}): FinancialEntry {
  return {
    id: 'fin_1',
    type: 'receita',
    category: 'Mensalidade',
    description: 'Mensalidade Cliente Teste',
    amount: 1000,
    dueDate: '2026-01-10',
    status: 'previsto',
    ...overrides,
  }
}

beforeEach(() => {
  resetSupabaseMock()
  useDataStore.getState().reset()
})

// Mesma regra de paidDate (src/lib/utils.ts, resolvePaidDateOnStatusChange),
// agora no segundo caminho que a altera: o modal de edição, não só o
// dropdown rápido da tabela (ver FinancePage.test.tsx).
describe('FinancialEntryFormModal — aplica a regra de paidDate ao salvar', () => {
  it('mudar o status pra pago pelo modal, mesmo com paidDate antigo/stale, carimba hoje', async () => {
    const entry = makeEntry({ status: 'previsto', paidDate: '2020-01-01' })
    const updateFinancialEntry = vi.fn(async (_id: string, _patch: Partial<FinancialEntry>) => ({ ok: true as const, data: entry }))
    useDataStore.setState({ updateFinancialEntry })

    render(<FinancialEntryFormModal open onClose={() => {}} type="receita" entry={entry} />)
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'pago' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await vi.waitFor(() => expect(updateFinancialEntry).toHaveBeenCalledTimes(1))
    const [, patch] = updateFinancialEntry.mock.calls[0]
    expect(patch.paidDate).toBe(new Date().toISOString().slice(0, 10))
    expect(patch.paidDate).not.toBe('2020-01-01')
  })

  it('mudar o status de pago pra pendente pelo modal envia paidDate: null', async () => {
    const entry = makeEntry({ status: 'pago', paidDate: '2026-01-05' })
    const updateFinancialEntry = vi.fn(async (_id: string, _patch: Partial<FinancialEntry>) => ({ ok: true as const, data: entry }))
    useDataStore.setState({ updateFinancialEntry })

    render(<FinancialEntryFormModal open onClose={() => {}} type="receita" entry={entry} />)
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'pendente' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await vi.waitFor(() => expect(updateFinancialEntry).toHaveBeenCalledTimes(1))
    const [, patch] = updateFinancialEntry.mock.calls[0]
    expect(patch.paidDate).toBeNull()
  })

  it('editar outro campo permanecendo pago preserva o paidDate existente', async () => {
    const entry = makeEntry({ status: 'pago', paidDate: '2025-03-01' })
    const updateFinancialEntry = vi.fn(async (_id: string, _patch: Partial<FinancialEntry>) => ({ ok: true as const, data: entry }))
    useDataStore.setState({ updateFinancialEntry })

    render(<FinancialEntryFormModal open onClose={() => {}} type="receita" entry={entry} />)
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Mensalidade Cliente Teste (ajustada)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await vi.waitFor(() => expect(updateFinancialEntry).toHaveBeenCalledTimes(1))
    const [, patch] = updateFinancialEntry.mock.calls[0]
    expect(patch.paidDate).toBe('2025-03-01')
  })
})
