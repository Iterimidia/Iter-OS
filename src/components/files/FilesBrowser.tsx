import { useState } from 'react'
import type { MouseEvent } from 'react'
import { ExternalLink, Plus, Search, Trash2 } from 'lucide-react'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction, canViewFile } from '@/lib/permissions'
import { formatDate, groupBy } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileFormModal } from '@/features/operational/FileFormModal'

interface FilesBrowserProps {
  title: string
  description: string
}

export function FilesBrowser({ title, description }: FilesBrowserProps) {
  const user = useCurrentUser()!
  const files = useDataStore((s) => s.files)
  const clients = useDataStore((s) => s.clients)
  const removeFile = useDataStore((s) => s.removeFile)

  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name
  const canDelete = canPerformAction(user, 'excluir')

  const visible = files.filter((f) => canViewFile(user, f) && f.name.toLowerCase().includes(query.toLowerCase()))
  const grouped = groupBy(visible, (f) => f.category)

  function handleDelete(e: MouseEvent, file: { id: string; name: string }) {
    e.preventDefault()
    e.stopPropagation()
    if (window.confirm(`Excluir o arquivo "${file.name}"?`)) {
      removeFile(file.id)
    }
  }

  return (
    <div>
      <SectionHeader
        title={title}
        description={description}
        action={
          canPerformAction(user, 'criar') && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
              Novo arquivo
            </Button>
          )
        }
      />

      <div className="relative mb-5 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iter-faint" />
        <Input placeholder="Buscar arquivo..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      {visible.length === 0 ? (
        <EmptyState title="Nenhum arquivo encontrado" description="Ajuste a busca ou cadastre um novo link." />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-iter-faint">{category}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="card-surface flex items-start justify-between gap-2 p-4 transition-colors hover:border-iter-primary/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-iter-text">{file.name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {clientName(file.clientId) && <Badge tone="neutral">{clientName(file.clientId)}</Badge>}
                        <span className="text-[11px] text-iter-faint">{formatDate(file.createdAt)}</span>
                      </div>
                      {file.description && <p className="mt-1.5 line-clamp-2 text-xs text-iter-muted">{file.description}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {canDelete && (
                        <button
                          onClick={(e) => handleDelete(e, file)}
                          className="focus-ring rounded-md p-0.5 text-iter-faint hover:text-iter-danger"
                          aria-label="Excluir arquivo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <ExternalLink className="h-4 w-4 text-iter-faint" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <FileFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
