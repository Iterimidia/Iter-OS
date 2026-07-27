import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import type { Project, Task, TaskStatus } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction } from '@/lib/permissions'
import { cn, formatDate, isOverdue, PRIORITY_META, PROJECT_STATUS_META, TASK_STATUS_META, TASK_STATUS_ORDER } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatusSelect } from '@/components/ui/StatusSelect'
import { KanbanBoard } from '@/components/tables/KanbanBoard'
import { DataTable } from '@/components/tables/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { TaskFormModal } from '@/features/operational/TaskFormModal'
import { ProjectFormModal } from '@/features/operational/ProjectFormModal'

const KANBAN_COLUMNS = TASK_STATUS_ORDER.map((id) => ({ id, label: TASK_STATUS_META[id].label }))
const STATUS_OPTIONS = TASK_STATUS_ORDER.map((s) => ({ value: s, label: TASK_STATUS_META[s].label }))

export function OperationPage() {
  const user = useCurrentUser()!
  const tasks = useDataStore((s) => s.tasks.filter((t) => t.area === 'operacional'))
  const projects = useDataStore((s) => s.projects)
  const clients = useDataStore((s) => s.clients)
  const users = useDataStore((s) => s.users)
  const updateTask = useDataStore((s) => s.updateTask)
  const removeTask = useDataStore((s) => s.removeTask)
  const removeProject = useDataStore((s) => s.removeProject)

  const [tab, setTab] = useState('kanban')
  const [modalOpen, setModalOpen] = useState(false)
  const [projectModalOpen, setProjectModalOpen] = useState(false)

  const canDelete = canPerformAction(user, 'excluir')

  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? '—'

  function changeStatus(task: Task, status: TaskStatus) {
    updateTask(task.id, {
      status,
      completedAt: status === 'concluido' ? new Date().toISOString().slice(0, 10) : task.completedAt,
    })
  }

  function handleDeleteTask(task: Task) {
    if (window.confirm(`Excluir a tarefa "${task.title}"?`)) {
      removeTask(task.id)
    }
  }

  function handleDeleteProject(project: Project) {
    if (window.confirm(`Excluir o projeto "${project.title}"? Isso não apaga as tarefas já vinculadas a ele.`)) {
      removeProject(project.id)
    }
  }

  const aprovacoes = tasks.filter((t) => ['aguardando_revisao', 'aguardando_cliente', 'aprovado'].includes(t.status))

  return (
    <div>
      <SectionHeader
        title="Operação"
        description="Projetos, tarefas gerais, prazos e aprovações da execução."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
            Nova tarefa
          </Button>
        }
      />

      <Tabs
        className="mb-5 w-fit"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'kanban', label: 'Kanban Operacional', count: tasks.length },
          { id: 'projetos', label: 'Projetos', count: projects.length },
          { id: 'tarefas', label: 'Tarefas', count: tasks.length },
          { id: 'aprovacoes', label: 'Aprovações', count: aprovacoes.length },
        ]}
      />

      {tab === 'kanban' && (
        <KanbanBoard
          columns={KANBAN_COLUMNS}
          items={tasks}
          getId={(t) => t.id}
          getStatus={(t) => t.status}
          onStatusChange={changeStatus}
          renderCard={(task) => (
            <div className="card-surface space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold leading-snug text-iter-text">{task.title}</p>
                {canDelete && (
                  <button
                    onClick={() => handleDeleteTask(task)}
                    className="focus-ring shrink-0 rounded-md p-0.5 text-iter-faint hover:text-iter-danger"
                    aria-label="Excluir tarefa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {clientName(task.clientId) && <Badge tone="neutral">{clientName(task.clientId)}</Badge>}
                <Badge tone={PRIORITY_META[task.priority].tone}>{PRIORITY_META[task.priority].label}</Badge>
              </div>
              <p className="text-[11px] text-iter-muted">{userName(task.responsibleId)}</p>
              {task.dueDate && (
                <p
                  className={cn(
                    'flex items-center gap-1 text-[11px]',
                    isOverdue(task.dueDate, ['concluido', 'publicado'].includes(task.status)) ? 'text-iter-danger' : 'text-iter-faint',
                  )}
                >
                  {isOverdue(task.dueDate, ['concluido', 'publicado'].includes(task.status)) && <AlertTriangle className="h-3 w-3" />}
                  {formatDate(task.dueDate)}
                </p>
              )}
              <StatusSelect value={task.status} onChange={(status) => changeStatus(task, status)} options={STATUS_OPTIONS} />
            </div>
          )}
        />
      )}

      {tab === 'projetos' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setProjectModalOpen(true)}>
              Novo projeto
            </Button>
          </div>
          {projects.length === 0 ? (
            <EmptyState title="Nenhum projeto cadastrado" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <div key={p.id} className="card-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-iter-text">{p.title}</p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge tone={PROJECT_STATUS_META[p.status].tone}>{PROJECT_STATUS_META[p.status].label}</Badge>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteProject(p)}
                          className="focus-ring rounded-md p-0.5 text-iter-faint hover:text-iter-danger"
                          aria-label="Excluir projeto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-iter-faint">{clientName(p.clientId)}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-iter-muted">{p.description}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-iter-faint">
                    <span>Prazo: {formatDate(p.endDate)}</span>
                    <Badge tone={PRIORITY_META[p.priority].tone}>{PRIORITY_META[p.priority].label}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'tarefas' && (
        <DataTable
          data={tasks.slice().sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))}
          keyField={(t) => t.id}
          emptyTitle="Nenhuma tarefa"
          columns={[
            { key: 'titulo', header: 'Tarefa', render: (t) => <span className="font-medium text-iter-text">{t.title}</span> },
            { key: 'cliente', header: 'Cliente', render: (t) => clientName(t.clientId) ?? '—' },
            { key: 'responsavel', header: 'Responsável', render: (t) => userName(t.responsibleId) },
            { key: 'prazo', header: 'Prazo', render: (t) => (t.dueDate ? formatDate(t.dueDate) : '—') },
            {
              key: 'prioridade',
              header: 'Prioridade',
              render: (t) => <Badge tone={PRIORITY_META[t.priority].tone}>{PRIORITY_META[t.priority].label}</Badge>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (t) => <StatusSelect value={t.status} onChange={(status) => changeStatus(t, status)} options={STATUS_OPTIONS} />,
            },
            ...(canDelete
              ? [
                  {
                    key: 'acoes',
                    header: '',
                    render: (t: Task) => (
                      <button
                        onClick={() => handleDeleteTask(t)}
                        className="focus-ring rounded-md p-1 text-iter-faint hover:text-iter-danger"
                        aria-label="Excluir tarefa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}

      {tab === 'aprovacoes' &&
        (aprovacoes.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nada aguardando aprovação" />
        ) : (
          <div className="space-y-2.5">
            {aprovacoes.map((t) => (
              <div key={t.id} className="card-surface flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-iter-text">{t.title}</p>
                  <p className="mt-0.5 text-xs text-iter-muted">
                    {clientName(t.clientId) ?? 'Interno'} · {userName(t.responsibleId)}
                  </p>
                </div>
                <Badge tone={TASK_STATUS_META[t.status].tone}>{TASK_STATUS_META[t.status].label}</Badge>
              </div>
            ))}
          </div>
        ))}

      <TaskFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <ProjectFormModal open={projectModalOpen} onClose={() => setProjectModalOpen(false)} />
    </div>
  )
}
