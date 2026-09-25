import { Trash2, TriangleAlert } from 'lucide-react'
import type { ContentItem, ContentStatus } from '@/types'
import { isContentOverdue } from '@/lib/contentWorkflow'
import { CONTENT_FORMAT_LABELS, CONTENT_STATUS_META, CONTENT_STATUS_ORDER, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { StatusSelect } from '@/components/ui/StatusSelect'

interface ContentCardProps {
  item: ContentItem
  clientName?: string
  executorName?: string
  /** Fase 5: mudar o status exige `editar` na RLS — desabilita o select em vez de deixar interagir com algo que será recusado depois. */
  canChangeStatus?: boolean
  onStatusChange: (status: ContentStatus) => void
  onOpen?: () => void
  onDelete?: () => void
}

/** Card do Conteúdo — spec §14: responde rápido "qual cliente, qual peça, quem está fazendo, para quando, em que situação". */
export function ContentCard({ item, clientName, executorName, canChangeStatus, onStatusChange, onOpen, onDelete }: ContentCardProps) {
  const overdue = isContentOverdue(item)
  const blocked = item.status === 'bloqueado'
  const awaitingApproval = item.status === 'aguardando_aprovacao'

  return (
    <div
      className="card-surface cursor-pointer p-4 transition-colors hover:border-iter-primary/40"
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-iter-text">{item.title}</p>
          {item.theme && <p className="mt-0.5 truncate text-xs text-iter-faint">{item.theme}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge tone="neutral">{CONTENT_FORMAT_LABELS[item.format]}</Badge>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="focus-ring rounded-md p-0.5 text-iter-faint hover:text-iter-danger"
              aria-label="Excluir peça"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {clientName && <Badge tone="primary">{clientName}</Badge>}
        {overdue && (
          <Badge tone="danger">
            <TriangleAlert className="mr-1 inline h-3 w-3" />
            Atrasado
          </Badge>
        )}
        {blocked && <Badge tone="danger">Bloqueado</Badge>}
        {awaitingApproval && <Badge tone="warning">Aprovação pendente</Badge>}
      </div>

      {executorName && <p className="mt-2 text-[11px] text-iter-muted">{executorName}</p>}

      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-iter-faint">
        {item.internalDueDate && <span>Entrega: {formatDate(item.internalDueDate)}</span>}
        {item.plannedPublishDate && <span>Publicação: {formatDate(item.plannedPublishDate)}</span>}
      </div>

      <div className="mt-3 border-t border-iter-border pt-3" onClick={(e) => e.stopPropagation()}>
        <StatusSelect
          value={item.status}
          onChange={onStatusChange}
          disabled={canChangeStatus === false}
          options={CONTENT_STATUS_ORDER.map((s) => ({ value: s, label: CONTENT_STATUS_META[s].label }))}
        />
      </div>
    </div>
  )
}
