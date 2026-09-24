import { Pencil, Trash2 } from 'lucide-react'
import type { ContentItem, ContentStatus } from '@/types'
import { CONTENT_FORMAT_LABELS, CONTENT_STATUS_META, CONTENT_STATUS_ORDER, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { StatusSelect } from '@/components/ui/StatusSelect'

interface ContentCardProps {
  item: ContentItem
  clientName?: string
  responsibleName?: string
  /** Fase 5: mudar o status exige `editar` na RLS — desabilita o select em vez de deixar interagir com algo que será recusado depois. */
  canChangeStatus?: boolean
  onStatusChange: (status: ContentStatus) => void
  onEdit?: () => void
  onDelete?: () => void
}

export function ContentCard({ item, clientName, responsibleName, canChangeStatus, onStatusChange, onEdit, onDelete }: ContentCardProps) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-iter-text">{item.title}</p>
          {item.theme && <p className="mt-0.5 truncate text-xs text-iter-faint">{item.theme}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge tone="neutral">{CONTENT_FORMAT_LABELS[item.format]}</Badge>
          {onEdit && (
            <button onClick={onEdit} className="focus-ring rounded-md p-0.5 text-iter-faint hover:text-iter-text" aria-label="Editar peça">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="focus-ring rounded-md p-0.5 text-iter-faint hover:text-iter-danger" aria-label="Excluir peça">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {clientName && <Badge tone="primary">{clientName}</Badge>}
        {item.internalDueDate && <span className="text-[11px] text-iter-faint">Prazo: {formatDate(item.internalDueDate)}</span>}
      </div>

      <p className="mt-2 text-[11px] text-iter-muted">{responsibleName}</p>

      <div className="mt-3 border-t border-iter-border pt-3">
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
