import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useAuthStore } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { makeUser } from '@/test/fixtures'
import type { Client, ContentItem } from '@/types'
import { ContentPage } from '@/features/creative/ContentPage'

const IDENTITY = 'auth_content_test'

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

function makeContentItem(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: 'cnt_1',
    clientId: 'cli_1',
    format: 'post_estatico',
    theme: 'Tema',
    title: 'Peça em produção',
    responsibleId: 'usr_1',
    status: 'em_revisao_interna',
    internalApproval: false,
    clientApproval: false,
    createdAt: '2026-01-01',
    ...overrides,
  }
}

/**
 * Role 'usuario_limitado' não dá NADA por default -- o único jeito dela ter
 * 'aprovar' e/ou 'editar' é o override que o teste passa, isolando
 * exatamente a combinação que queremos provar (mesmo padrão de
 * ApprovalsPage.test.tsx).
 */
function renderWithUser(allowedActions: ('aprovar' | 'editar')[], updateContentItem = vi.fn(async () => ({ ok: true as const, data: {} as ContentItem }))) {
  useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY } } as never })
  useDataStore.setState({
    loadedIdentityId: IDENTITY,
    users: [makeUser({ id: 'usr_1', authUserId: IDENTITY, role: 'usuario_limitado', allowedActions, allowedClientIds: 'all' })],
    clients: [makeClient()],
    contentItems: [makeContentItem()],
    updateContentItem,
  })
  render(<ContentPage />)
  return { updateContentItem }
}

function renderWithRole(role: 'direcao', updateContentItem = vi.fn(async () => ({ ok: true as const, data: {} as ContentItem }))) {
  useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY } } as never })
  useDataStore.setState({
    loadedIdentityId: IDENTITY,
    users: [makeUser({ id: 'usr_1', authUserId: IDENTITY, role, allowedClientIds: 'all' })],
    clients: [makeClient()],
    contentItems: [makeContentItem()],
    updateContentItem,
  })
  render(<ContentPage />)
  return { updateContentItem }
}

beforeEach(() => {
  resetSupabaseMock()
  useDataStore.getState().reset()
  useAuthStore.setState({ status: 'loading', session: null, lastError: null })
})

// Mesmo gate de ApprovalsPage.test.tsx ('aprovar' sozinho não basta -- a RLS
// de content_items_update exige 'editar'), mas exercitado no SEGUNDO caminho
// que calcula essa regra de forma independente: ContentPage.tsx linha 40
// (`canApprove = canPerformAction(user,'aprovar') && canEditContent`), que
// alimenta os toggles de aprovação interna/cliente de ContentCard via prop.
// ApprovalsPage.test.tsx não cobre este arquivo -- uma regressão aqui
// passaria pela suíte sem isto.
describe('ContentPage — gate de aprovação (via ContentCard) exige aprovar E editar', () => {
  it('aprovar=true, editar=false -> toggle de aprovação fica desabilitado e não executa', () => {
    const { updateContentItem } = renderWithUser(['aprovar'])
    const button = screen.getByRole('button', { name: 'Interna' })
    expect(button).toBeDisabled()
    button.click()
    expect(updateContentItem).not.toHaveBeenCalled()
  })

  it('aprovar=false, editar=true -> toggle de aprovação fica desabilitado e não executa', () => {
    const { updateContentItem } = renderWithUser(['editar'])
    const button = screen.getByRole('button', { name: 'Interna' })
    expect(button).toBeDisabled()
    button.click()
    expect(updateContentItem).not.toHaveBeenCalled()
  })

  it('aprovar=true, editar=true -> toggle de aprovação fica habilitado e executável', () => {
    const { updateContentItem } = renderWithUser(['aprovar', 'editar'])
    const button = screen.getByRole('button', { name: 'Interna' })
    expect(button).not.toBeDisabled()
    button.click()
    expect(updateContentItem).toHaveBeenCalledWith('cnt_1', { internalApproval: true })
  })

  it('perfil padrão direção (aprovar+editar por default, sem override manual) continua com o caminho positivo funcionando', () => {
    const { updateContentItem } = renderWithRole('direcao')
    const button = screen.getByRole('button', { name: 'Interna' })
    expect(button).not.toBeDisabled()
    button.click()
    expect(updateContentItem).toHaveBeenCalledWith('cnt_1', { internalApproval: true })
  })
})
