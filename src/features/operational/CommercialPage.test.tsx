import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useAuthStore } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { makeUser } from '@/test/fixtures'
import { CommercialPage } from '@/features/operational/CommercialPage'

const IDENTITY = 'auth_commercial_test'

function renderCommercialPage(addLead: ReturnType<typeof vi.fn>) {
  useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY } } as never })
  useDataStore.setState({
    loadedIdentityId: IDENTITY,
    users: [makeUser({ id: 'usr_1', authUserId: IDENTITY, role: 'admin' })],
    leads: [],
    addLead: addLead as never,
  })
  render(<CommercialPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Novo lead' }))
  fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'Empresa Teste Fase 7' } })
}

beforeEach(() => {
  resetSupabaseMock()
  useDataStore.getState().reset()
  useAuthStore.setState({ status: 'loading', session: null, lastError: null })
})

// Bug real encontrado na Fase 7: diferente de TODOS os outros modais de
// criar/editar do app, o formulário de lead desta tela chamava
// addLead/updateLead sem `await` e fechava o modal incondicionalmente logo
// em seguida -- em falha (rede, RLS), a tela dava a impressão de que o lead
// tinha sido salvo, e o que a pessoa digitou era perdido junto com o modal.
describe('CommercialPage — modal de lead só fecha quando a persistência confirma', () => {
  it('addLead falhando MANTÉM o modal aberto (não finge sucesso)', async () => {
    const addLead = vi.fn(async () => ({ ok: false as const, error: 'falha simulada' }))
    renderCommercialPage(addLead)

    fireEvent.click(screen.getByRole('button', { name: 'Criar lead' }))
    await vi.waitFor(() => expect(addLead).toHaveBeenCalledTimes(1))

    // Se o modal tivesse fechado (bug antigo), este campo não existiria mais.
    expect(screen.getByLabelText('Empresa')).toBeInTheDocument()
  })

  it('addLead com sucesso fecha o modal', async () => {
    const addLead = vi.fn(async () => ({ ok: true as const, data: {} }))
    renderCommercialPage(addLead)

    fireEvent.click(screen.getByRole('button', { name: 'Criar lead' }))
    await vi.waitFor(() => expect(screen.queryByLabelText('Empresa')).not.toBeInTheDocument())
  })

  it('não permite duplo-submit: clicar várias vezes antes da mutation resolver dispara só UMA chamada', () => {
    let resolveAdd: (v: unknown) => void = () => {}
    const addLead = vi.fn(() => new Promise((resolve) => { resolveAdd = resolve }))
    renderCommercialPage(addLead)

    const submitButton = screen.getByRole('button', { name: 'Criar lead' })
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)
    fireEvent.click(submitButton)

    expect(addLead).toHaveBeenCalledTimes(1)
    expect(submitButton).toBeDisabled()

    resolveAdd({ ok: true, data: {} })
  })
})
