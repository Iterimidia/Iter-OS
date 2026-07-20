import { CheckCircle2, Circle } from 'lucide-react'
import type { ContentItem, DemandStatus } from '@/types'
import { CONTENT_FORMAT_LABELS, DEMAND_STATUS_META, DEMAND_STATUS_ORDER, cn, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { StatusSelect } from '@/components/ui/StatusSelect'

interface ContentCardProps {
  item: ContentItem
  clientName?: string
  responsibleName?: string
  canApprove: boolean
  onStatusChange: (status: DemandStatus) => void
  onToggleInternalApproval: () => void
  onToggleClientApproval: () => void
}

export function ContentCard({
  item,
  clientName,
  responsibleName,
  canApprove,
  onStatusChange,
  onToggleInternalApproval,
  onToggleClientApproval,
}: ContentCardProps) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-iter-text">{item.title}</p>
          {item.theme && <p className="mt-0.5 truncate text-xs text-iter-faint">{item.theme}</p>}
        </div>
        <Badge tone="neutral" className="shrink-0">
          {CONTENT_FORMAT_LABELS[item.format]}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {clientName && <Badge tone="primary">{clientName}</Badge>}
        {item.dueDate && <span className="text-[11px] text-iter-faint">Prazo: {formatDate(item.dueDate)}</span>}
      </div>

      <p className="mt-2 text-[11px] text-iter-muted">{responsibleName}</p>

      <div className="mt-3 flex items-center gap-3 border-t border-iter-border pt-3">
        <button
          type="button"
          onClick={onToggleInternalApproval}
          disabled={!canApprove}
          title="Aprovação interna"
          className={cn(
            'flex items-center gap-1 text-[11px]',
            item.internalApproval ? 'text-iter-success' : 'text-iter-faint',
            !canApprove && 'cursor-not-allowed opacity-60',
          )}
        >
          {item.internalApproval ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
          Interna
        </button>
        <button
          type="button"
          onClick={onToggleClientApproval}
          disabled={!canApprove}
          title="Aprovação do cliente"
          className={cn(
            'flex items-center gap-1 text-[11px]',
            item.clientApproval ? 'text-iter-success' : 'text-iter-faint',
            !canApprove && 'cursor-not-allowed opacity-60',
          )}
        >
          {item.clientApproval ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
          Cliente
        </button>
      </div>

      <div className="mt-2.5">
        <StatusSelect value={item.status} onChange={onStatusChange} options={DEMAND_STATUS_ORDER.map((s) => ({ value: s, label: DEMAND_STATUS_META[s].label }))} />
      </div>
    </div>
  )
}
