import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useAuthStore } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { makeUser } from '@/test/fixtures'
import type { Task } from '@/types'
import { OperationPage } from '@/features/operational/OperationPage'

const IDENTITY = 'auth_operation_test'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'tsk_1',
    title: 'Tarefa existente',
    responsibleId: 'usr_1',
    priority: 'media',
    status: 'em_andamento',
    type: 'Geral',
    area: 'operacional',
    createdAt: '2026-01-01',
    ...overrides,
  }
}

function renderOperationPage(task: Task, updateTask: ReturnType<typeof vi.fn>) {
  useAuthStore.setState({ status: 'signed_in', session: { user: { id: IDENTITY } } as never })
  useDataStore.setState({
    loadedIdentityId: IDENTITY,
    users: [makeUser({ id: 'usr_1', authUserId: IDENTITY, role: 'admin' })],
    clients: [],
    tasks: [task],
    updateTask,
  })
  render(<OperationPage />)
}

beforeEach(() => {
  resetSupabaseMock()
  useDataStore.getState().reset()
  useAuthStore.setState({ status: 'loading', session: null, lastError: null })
})

// Segundo caminho que muda o status de tarefa (o primeiro é o modal, ver
// TaskFormModal.test.tsx) -- o Kanban/StatusSelect desta tela usa a mesma
// `changeStatus`, que por sua vez usa `resolveCompletedAtOnStatusChange`
// (src/lib/utils.ts). Os dois caminhos têm lógica de wiring separada, então
// os dois precisam de teste (pedido explícito pós-revisão Codex).
describe('OperationPage — Kanban/StatusSelect aplica a regra de completedAt', () => {
  it('mudar o status pra concluído pelo StatusSelect, mesmo com completedAt antigo/stale, carimba hoje', () => {
    const task = makeTask({ status: 'em_andamento', completedAt: '2020-01-01' })
    const updateTask = vi.fn(async (_id: string, _payload: Partial<Task>) => ({ ok: true as const, data: task }))
    renderOperationPage(task, updateTask)

    // Além dos filtros de responsável/prioridade, o card da tarefa tem seu
    // próprio StatusSelect -- é sempre o último <select> no DOM.
    const select = screen.getAllByRole('combobox').at(-1)!
    fireEvent.change(select, { target: { value: 'concluido' } })

    expect(updateTask).toHaveBeenCalledTimes(1)
    const [id, payload] = updateTask.mock.calls[0]
    expect(id).toBe('tsk_1')
    expect(payload.completedAt).toBe(new Date().toISOString().slice(0, 10))
    expect(payload.completedAt).not.toBe('2020-01-01')
  })

  it('reabrir (mudar de concluído pra outro status) pelo StatusSelect envia completedAt: null', () => {
    const task = makeTask({ status: 'concluido', completedAt: '2025-05-10' })
    const updateTask = vi.fn(async (_id: string, _payload: Partial<Task>) => ({ ok: true as const, data: task }))
    renderOperationPage(task, updateTask)

    const select = screen.getAllByRole('combobox').at(-1)!
    fireEvent.change(select, { target: { value: 'em_andamento' } })

    const [, payload] = updateTask.mock.calls[0]
    expect(payload.completedAt).toBeNull()
  })
})
