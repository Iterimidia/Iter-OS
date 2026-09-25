import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useAuthStore } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { makeUser } from '@/test/fixtures'
import type { Client, ContentItem } from '@/types'
import { ContentDetailPage } from '@/features/creative/ContentDetailPage'

const IDENTITY = 'auth_contentdetail_test'

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
    title: 'Peça de teste',
    editorialResponsibleId: 'usr_1',
    status: 'planejado',
    referenceMonth: '2026-10',
    createdAt: '2026-01-01',
    ...overrides,
  }
}

function renderDetail(item: ContentItem, updateContentItem = vi.fn(async () => ({ ok: true as const, data: {} as ContentItem }))) {
  useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY } } as never })
  useDataStore.setState({
    loadedIdentityId: IDENTITY,
    users: [makeUser({ id: 'usr_1', authUserId: IDENTITY, role: 'admin' })],
    clients: [makeClient()],
    contentItems: [item],
    updateContentItem,
    removeContentItem: vi.fn(async () => ({ ok: true as const, data: null })),
  })
  render(
    <MemoryRouter initialEntries={[`/criativo/conteudo/${item.id}`]}>
      <Routes>
        <Route path="/criativo/conteudo/:contentId" element={<ContentDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return { updateContentItem }
}

beforeEach(() => {
  resetSupabaseMock()
  useDataStore.getState().reset()
  useAuthStore.setState({ status: 'loading', session: null, lastError: null })
})

describe('ContentDetailPage — blocos específicos por formato', () => {
  it('carrossel mostra o editor de slides, não o roteiro', () => {
    renderDetail(makeContentItem({ format: 'carrossel', slides: [{ id: 's1', text: 'Slide 1' }] }))
    expect(screen.getByRole('heading', { name: 'Slides' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Roteiro' })).not.toBeInTheDocument()
  })

  it('reel mostra o roteiro, não o editor de slides', () => {
    renderDetail(makeContentItem({ format: 'reel', script: 'Fala isso, mostra aquilo.' }))
    expect(screen.getByRole('heading', { name: 'Roteiro' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Slides' })).not.toBeInTheDocument()
  })

  it('post estático não mostra nem slides nem roteiro', () => {
    renderDetail(makeContentItem({ format: 'post_estatico' }))
    expect(screen.queryByRole('heading', { name: 'Slides' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Roteiro' })).not.toBeInTheDocument()
  })
})

describe('ContentDetailPage — workflow', () => {
  it('mudar o status no seletor aplica na hora (não espera o Salvar)', () => {
    const { updateContentItem } = renderDetail(makeContentItem({ status: 'planejado' }))
    fireEvent.change(screen.getByDisplayValue('Planejado'), { target: { value: 'em_producao' } })
    expect(updateContentItem).toHaveBeenCalledWith('cnt_1', { status: 'em_producao' })
  })

  it('bloquear registra motivo e observação junto com o status', () => {
    const { updateContentItem } = renderDetail(makeContentItem({ status: 'em_producao' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear' }))
    fireEvent.change(screen.getByLabelText('Motivo do bloqueio'), { target: { value: 'Aguardando material do cliente' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar bloqueio' }))
    expect(updateContentItem).toHaveBeenCalledWith('cnt_1', {
      status: 'bloqueado',
      blockedReason: 'Aguardando material do cliente',
      blockedNote: undefined,
    })
  })

  it('mostra o que falta pro briefing ficar pronto quando o conteúdo está planejado', () => {
    renderDetail(makeContentItem({ status: 'planejado', executorId: undefined, internalDueDate: undefined }))
    expect(screen.getByText('Falta para "Briefing pronto":')).toBeInTheDocument()
    expect(screen.getByText('Canal, Data de entrega interna, Data prevista de publicação, Executora, Conteúdo principal')).toBeInTheDocument()
  })
})

describe('ContentDetailPage — acesso', () => {
  it('conteúdo inexistente mostra estado vazio em vez de quebrar', () => {
    useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY } } as never })
    useDataStore.setState({
      loadedIdentityId: IDENTITY,
      users: [makeUser({ id: 'usr_1', authUserId: IDENTITY, role: 'admin' })],
      clients: [makeClient()],
      contentItems: [],
    })
    render(
      <MemoryRouter initialEntries={['/criativo/conteudo/nao_existe']}>
        <Routes>
          <Route path="/criativo/conteudo/:contentId" element={<ContentDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Conteúdo não encontrado')).toBeInTheDocument()
  })
})
