import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useAuthStore } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { makeUser } from '@/test/fixtures'
import type { Client, ContentItem } from '@/types'
import { ApprovalsPage } from '@/features/creative/ApprovalsPage'

const IDENTITY = 'auth_approvals_test'

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

function makePendingContentItem(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: 'cnt_1',
    clientId: 'cli_1',
    format: 'post_estatico',
    theme: 'Tema',
    title: 'Peça em revisão',
    responsibleId: 'u',
    status: 'em_revisao_interna',
    internalApproval: false,
    clientApproval: false,
    createdAt: '2026-01-01',
    ...overrides,
  }
}

/**
 * Renderiza ApprovalsPage com um usuário cujas ações são controladas
 * explicitamente via `allowedActions` (role usuario_limitado não dá NADA por
 * default, então o único jeito de ele ter 'aprovar' e/ou 'editar' é o
 * override que o teste passa) -- isola exatamente a combinação que queremos
 * provar, sem depender de nenhum papel pré-configurado.
 */
function renderWithUser(allowedActions: ('aprovar' | 'editar')[], updateContentItem = vi.fn(async () => ({ ok: true as const, data: {} as ContentItem }))) {
  useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY } } as never })
  useDataStore.setState({
    loadedIdentityId: IDENTITY,
    users: [makeUser({ id: 'usr_1', authUserId: IDENTITY, role: 'usuario_limitado', allowedActions, allowedClientIds: 'all' })],
    clients: [makeClient()],
    contentItems: [makePendingContentItem()],
    updateContentItem,
  })
  render(<ApprovalsPage />)
  return { updateContentItem }
}

function renderWithRole(role: 'admin' | 'gestao_criativa', updateContentItem = vi.fn(async () => ({ ok: true as const, data: {} as ContentItem }))) {
  useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY } } as never })
  useDataStore.setState({
    loadedIdentityId: IDENTITY,
    users: [makeUser({ id: 'usr_1', authUserId: IDENTITY, role, allowedClientIds: 'all' })],
    clients: [makeClient()],
    contentItems: [makePendingContentItem()],
    updateContentItem,
  })
  render(<ApprovalsPage />)
  return { updateContentItem }
}

beforeEach(() => {
  resetSupabaseMock()
  useDataStore.getState().reset()
  useAuthStore.setState({ status: 'loading', session: null, lastError: null })
})

// Estes testes existem especificamente porque `permissions.test.ts` só prova
// que o HELPER `canPerformAction` distingue 'aprovar' de 'editar' -- não que
// a TELA realmente usa os dois juntos. Uma regressão que trocasse
// `canPerformAction(user,'aprovar') && canPerformAction(user,'editar')` de
// volta por só `canPerformAction(user,'aprovar')` (o bug real corrigido na
// Fase 5) passaria pela suíte de permissions.ts inalterada, porque aquele
// arquivo não renderiza nenhum componente. Aqui SIM: cada caso renderiza
// ApprovalsPage de verdade e clica no botão.
describe('ApprovalsPage — gate de aprovação exige aprovar E editar', () => {
  it('aprovar=true, editar=false -> nenhum controle de aprovação é renderizado', () => {
    renderWithUser(['aprovar'])
    // Confirma que o item ESTÁ mesmo na tela (senão a ausência do botão
    // provaria só que a lista está vazia, não que o gate funcionou).
    expect(screen.getByText('Peça em revisão')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprovar internamente' })).not.toBeInTheDocument()
  })

  it('aprovar=false, editar=true -> nenhum controle de aprovação é renderizado', () => {
    renderWithUser(['editar'])
    expect(screen.getByText('Peça em revisão')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprovar internamente' })).not.toBeInTheDocument()
  })

  it('aprovar=true, editar=true -> o controle aparece E é executável (chama updateContentItem de verdade)', async () => {
    const { updateContentItem } = renderWithUser(['aprovar', 'editar'])
    const button = screen.getByRole('button', { name: 'Aprovar internamente' })
    button.click()
    expect(updateContentItem).toHaveBeenCalledWith('cnt_1', { internalApproval: true, status: 'aguardando_cliente' })
  })

  it('perfil admin (tem as duas por ser admin) continua com o caminho positivo funcionando', () => {
    const { updateContentItem } = renderWithRole('admin')
    const button = screen.getByRole('button', { name: 'Aprovar internamente' })
    button.click()
    expect(updateContentItem).toHaveBeenCalledTimes(1)
  })

  it('perfil gestao_criativa (aprovar+editar por default, sem nenhum override manual) continua com o caminho positivo funcionando', () => {
    const { updateContentItem } = renderWithRole('gestao_criativa')
    const button = screen.getByRole('button', { name: 'Aprovar internamente' })
    button.click()
    expect(updateContentItem).toHaveBeenCalledTimes(1)
  })
})
