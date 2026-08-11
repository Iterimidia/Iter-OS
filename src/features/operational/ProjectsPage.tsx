import { useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { Project } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction } from '@/lib/permissions'
import { formatDate, PRIORITY_META, PROJECT_STATUS_META } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProjectFormModal } from '@/features/operational/ProjectFormModal'

export function ProjectsPage() {
  const user = useCurrentUser()!
  const projects = useDataStore((s) => s.projects)
  const clients = useDataStore((s) => s.clients)
  const removeProject = useDataStore((s) => s.removeProject)

  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const canDelete = canPerformAction(user, 'excluir')
  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name

  const filteredProjects = projects.filter((p) => {
    if (!query) return true
    const q = query.toLowerCase()
    return p.title.toLowerCase().includes(q) || (clientName(p.clientId) ?? '').toLowerCase().includes(q)
  })

  function handleDeleteProject(project: Project) {
    if (window.confirm(`Excluir o projeto "${project.title}"? Isso não apaga as tarefas já vinculadas a ele.`)) {
      removeProject(project.id)
    }
  }

  return (
    <div>
      <SectionHeader
        title="Projetos"
        description="Projetos vinculados a clientes — as tarefas podem apontar pra eles."
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
            Novo projeto
          </Button>
        }
      />

      <div className="relative mb-5 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iter-faint" />
        <Input placeholder="Buscar projeto ou cliente..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      {filteredProjects.length === 0 ? (
        <EmptyState title="Nenhum projeto encontrado" description="Ajuste a busca ou cadastre um novo projeto." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((p) => (
            <div key={p.id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-iter-text">{p.title}</p>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge tone={PROJECT_STATUS_META[p.status].tone}>{PROJECT_STATUS_META[p.status].label}</Badge>
                  <button
                    onClick={() => setEditingProject(p)}
                    className="focus-ring rounded-md p-0.5 text-iter-faint hover:text-iter-text"
                    aria-label="Editar projeto"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
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

      <ProjectFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <ProjectFormModal open={editingProject !== null} onClose={() => setEditingProject(null)} project={editingProject ?? undefined} />
    </div>
  )
}
