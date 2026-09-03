import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { resetSupabaseMock, supabase } from '@/test/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({ supabase }))

import { useDataStore } from '@/data/store'
import { makeUser } from '@/test/fixtures'
import type { Task } from '@/types'
import { TaskFormModal } from '@/features/operational/TaskFormModal'

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

beforeEach(() => {
  resetSupabaseMock()
  useDataStore.getState().reset()
  useDataStore.setState({ users: [makeUser({ id: 'usr_1', name: 'Responsável Teste' })], clients: [], projects: [] })
})

// Bug real encontrado na Fase 7: OperationPage.tsx tem uma função
// `changeStatus` só usada pelo Kanban/StatusSelect que carimba
// `completedAt` ao marcar "concluído" -- mas editar a MESMA tarefa pelo
// modal "Editar tarefa" ia por um caminho totalmente diferente
// (TaskFormModal.handleSubmit) que nunca tocava `completedAt`. Isso é
// exatamente "comportamento diferente entre telas relacionadas": a mesma
// ação (marcar tarefa como concluída) tinha efeito colateral em um caminho
// e não no outro, e DirectionPage/TeamPage leem `completedAt` (não `status`)
// pra "tarefas concluídas esta semana" -- uma tarefa concluída só pelo modal
// nunca aparecia nessa métrica.
describe('TaskFormModal — editar status pra "concluído" carimba completedAt (mesma regra do Kanban)', () => {
  it('mudar o status pra concluído pelo modal inclui completedAt no payload', async () => {
    const task = makeTask({ status: 'em_andamento', completedAt: undefined })
    const updateTask = vi.fn(async (_id: string, _payload: Partial<Task>) => ({ ok: true as const, data: task }))
    useDataStore.setState({ updateTask })

    render(<TaskFormModal open onClose={() => {}} task={task} />)
    fireEvent.change(screen.getByLabelText('Status inicial'), { target: { value: 'concluido' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await vi.waitFor(() => expect(updateTask).toHaveBeenCalledTimes(1))
    const [id, payload] = updateTask.mock.calls[0]
    expect(id).toBe('tsk_1')
    expect(payload.completedAt).toBe(new Date().toISOString().slice(0, 10))
  })

  it('editar outro campo sem tocar o status (já concluído) preserva o completedAt original', async () => {
    const task = makeTask({ status: 'concluido', completedAt: '2025-05-10' })
    const updateTask = vi.fn(async (_id: string, _payload: Partial<Task>) => ({ ok: true as const, data: task }))
    useDataStore.setState({ updateTask })

    render(<TaskFormModal open onClose={() => {}} task={task} />)
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await vi.waitFor(() => expect(updateTask).toHaveBeenCalledTimes(1))
    const [, payload] = updateTask.mock.calls[0]
    expect(payload.completedAt).toBe('2025-05-10')
  })
})
