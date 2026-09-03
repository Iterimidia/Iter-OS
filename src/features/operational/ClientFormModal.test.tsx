import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useDataStore } from '@/data/store'
import { ClientFormModal } from '@/features/operational/ClientFormModal'

beforeEach(() => {
  resetSupabaseMock()
  useDataStore.getState().reset()
})

// Bug real encontrado na Fase 7 (confirmado ao vivo em staging: clicar 2x em
// "Criar cliente" criava 2 clientes de verdade): nenhum modal de
// criar/editar desabilitava o botão de submit enquanto a mutation estava em
// voo. Este teste prova o comportamento correto no modal onde o bug foi
// confirmado -- os demais modais de criar/editar seguem exatamente o mesmo
// padrão (estado `submitting` + `loading` no botão), então não há
// necessidade de repetir o mesmo teste em cada um deles.
describe('ClientFormModal — não permite duplo-submit', () => {
  it('clicar três vezes em "Criar cliente" antes da mutation resolver só dispara UMA chamada', () => {
    let resolveAdd: (v: unknown) => void = () => {}
    const addClient = vi.fn(() => new Promise((resolve) => { resolveAdd = resolve }))
    useDataStore.setState({
      addClient: addClient as never,
      users: [],
      appSettings: { ...useDataStore.getState().appSettings, plans: ['Plano X'] },
    })

    render(<ClientFormModal open onClose={() => {}} />)

    fireEvent.change(screen.getByLabelText('Nome do cliente'), { target: { value: 'Cliente Teste Duplo Clique' } })

    const submitButton = screen.getByRole('button', { name: 'Criar cliente' })
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)

    expect(addClient).toHaveBeenCalledTimes(1)
    expect(submitButton).toBeDisabled()

    resolveAdd({ ok: true, data: {} })
  })
})
