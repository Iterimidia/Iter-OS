import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useAuthStore } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { makeUser } from '@/test/fixtures'
import type { Client, ContentItem } from '@/types'
import { ContentQuickCreateModal } from '@/features/creative/ContentQuickCreateModal'

const IDENTITY = 'auth_quickcreate_test'

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'cli_1',
    name: 'Cliente Teste',
    status: 'ativo',
    plan: 'x',
    billingType: 'percentual',
    monthlyValue: 0,
    services: [],
    strategicResponsibleId: 'u',
    creativeResponsibleId: 'u',
    createdAt: '2026-01-01',
    ...overrides,
  }
}

function setup(addContentItem = vi.fn(async () => ({ ok: true as const, data: { id: 'cnt_novo' } as ContentItem }))) {
  useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY } } as never })
  useDataStore.setState({
    loadedIdentityId: IDENTITY,
    users: [makeUser({ id: 'usr_1', authUserId: IDENTITY, role: 'admin' })],
    clients: [makeClient(), makeClient({ id: 'cli_2', name: 'Outro Cliente' })],
    addContentItem,
  })
  return { addContentItem }
}

beforeEach(() => {
  resetSupabaseMock()
  useDataStore.getState().reset()
  useAuthStore.setState({ status: 'loading', session: null, lastError: null })
})

describe('ContentQuickCreateModal', () => {
  it('não chama addContentItem sem cliente e título preenchidos', () => {
    const { addContentItem } = setup()
    const onCreated = vi.fn()
    render(<ContentQuickCreateModal open onClose={vi.fn()} onCreated={onCreated} />)

    fireEvent.click(screen.getByRole('button', { name: 'Criar e abrir ficha' }))
    expect(addContentItem).not.toHaveBeenCalled()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('criação rápida usa status planejado e o usuário logado como responsável editorial', async () => {
    const { addContentItem } = setup()
    const onCreated = vi.fn()
    render(<ContentQuickCreateModal open onClose={vi.fn()} onCreated={onCreated} />)

    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'cli_1' } })
    fireEvent.change(screen.getByLabelText('Tema/título'), { target: { value: 'Reel de bastidores' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar e abrir ficha' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('cnt_novo'))
    expect(addContentItem).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'cli_1', title: 'Reel de bastidores', status: 'planejado', editorialResponsibleId: 'usr_1' }),
    )
  })

  it('defaultClientId pré-seleciona e trava o campo de cliente', () => {
    setup()
    render(<ContentQuickCreateModal open onClose={vi.fn()} onCreated={vi.fn()} defaultClientId="cli_2" />)
    const select = screen.getByLabelText('Cliente') as HTMLSelectElement
    expect(select.value).toBe('cli_2')
    expect(select).toBeDisabled()
  })
})
