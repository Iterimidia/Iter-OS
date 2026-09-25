import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useAuthStore } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { makeUser } from '@/test/fixtures'
import type { Client, ContentItem } from '@/types'
import { currentMonthKey, shiftMonthKey } from '@/lib/utils'
import { ContentPage } from '@/features/creative/ContentPage'

const IDENTITY = 'auth_contentpage_test'
const THIS_MONTH = currentMonthKey()
const NEXT_MONTH = shiftMonthKey(THIS_MONTH, 1)

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
    theme: '',
    title: 'Peça padrão',
    editorialResponsibleId: 'usr_1',
    status: 'planejado',
    referenceMonth: THIS_MONTH,
    createdAt: '2026-01-01',
    ...overrides,
  }
}

function renderPage(items: ContentItem[], allowedActions: ('criar' | 'editar' | 'excluir')[] = ['criar', 'editar', 'excluir']) {
  useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY } } as never })
  useDataStore.setState({
    loadedIdentityId: IDENTITY,
    users: [makeUser({ id: 'usr_1', authUserId: IDENTITY, role: 'usuario_limitado', allowedActions, allowedClientIds: 'all' })],
    clients: [makeClient()],
    contentItems: items,
    updateContentItem: vi.fn(async () => ({ ok: true as const, data: {} as ContentItem })),
    removeContentItem: vi.fn(async () => ({ ok: true as const, data: null })),
  })
  return render(
    <MemoryRouter>
      <ContentPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  resetSupabaseMock()
  useDataStore.getState().reset()
  useAuthStore.setState({ status: 'loading', session: null, lastError: null })
})

describe('ContentPage — visão por mês (padrão)', () => {
  it('agrupa cada peça sob o bloco do seu mês de referência', () => {
    renderPage([
      makeContentItem({ id: 'cnt_1', title: 'Peça deste mês', referenceMonth: THIS_MONTH }),
      makeContentItem({ id: 'cnt_2', title: 'Peça do mês seguinte', referenceMonth: NEXT_MONTH }),
    ])
    expect(screen.getByText('Peça deste mês')).toBeInTheDocument()
    expect(screen.getByText('Peça do mês seguinte')).toBeInTheDocument()
  })

  it('filtro de formato esconde peças de outros formatos', () => {
    renderPage([
      makeContentItem({ id: 'cnt_1', title: 'É um Reel', format: 'reel' }),
      makeContentItem({ id: 'cnt_2', title: 'É um Post', format: 'post_estatico' }),
    ])
    fireEvent.change(screen.getByDisplayValue('Todos os formatos'), { target: { value: 'reel' } })
    expect(screen.getByText('É um Reel')).toBeInTheDocument()
    expect(screen.queryByText('É um Post')).not.toBeInTheDocument()
  })

  it('sem a ação "criar", o botão Nova peça não aparece', () => {
    renderPage([makeContentItem()], ['editar', 'excluir'])
    expect(screen.queryByRole('button', { name: 'Nova peça' })).not.toBeInTheDocument()
  })

  it('com a ação "criar", o botão Nova peça aparece', () => {
    renderPage([makeContentItem()], ['criar'])
    expect(screen.getByRole('button', { name: 'Nova peça' })).toBeInTheDocument()
  })
})

describe('ContentPage — alternância Kanban', () => {
  it('troca pra Kanban mostra as colunas de status sem perder os itens', () => {
    renderPage([makeContentItem({ title: 'Peça no board' })])
    fireEvent.click(screen.getByRole('button', { name: 'Kanban' }))
    expect(screen.getByText('Peça no board')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Planejado' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Publicado' })).toBeInTheDocument()
  })
})
