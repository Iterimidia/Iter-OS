import { Trash2 } from 'lucide-react'
import type { ContentItem, DemandStatus } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction, getAccessibleClients } from '@/lib/permissions'
import { CONTENT_FORMAT_LABELS, DEMAND_STATUS_META, DEMAND_STATUS_ORDER, formatDate } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Badge } from '@/components/ui/Badge'
import { StatusSelect } from '@/components/ui/StatusSelect'
import { KanbanBoard } from '@/components/tables/KanbanBoard'

const KANBAN_COLUMNS = DEMAND_STATUS_ORDER.map((id) => ({ id, label: DEMAND_STATUS_META[id].label }))
const STATUS_OPTIONS = DEMAND_STATUS_ORDER.map((s) => ({ value: s, label: DEMAND_STATUS_META[s].label }))

export function DemandsPage() {
  const user = useCurrentUser()!
  const contentItems = useDataStore((s) => s.contentItems)
  const clients = useDataStore((s) => s.clients)
  const users = useDataStore((s) => s.users)
  const updateContentItem = useDataStore((s) => s.updateContentItem)
  const removeContentItem = useDataStore((s) => s.removeContentItem)

  const accessibleIds = new Set(getAccessibleClients(user, clients).map((c) => c.id))
  const items = contentItems.filter((c) => accessibleIds.has(c.clientId))

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? '—'
  const canDelete = canPerformAction(user, 'excluir')

  function changeStatus(item: ContentItem, status: DemandStatus) {
    updateContentItem(item.id, { status })
  }

  function handleDelete(item: ContentItem) {
    if (window.confirm(`Excluir a demanda "${item.title}"?`)) {
      removeContentItem(item.id)
    }
  }

  return (
    <div>
      <SectionHeader title="Demandas" description="Kanban criativo — do briefing até a publicação." />
      <KanbanBoard
        columns={KANBAN_COLUMNS}
        items={items}
        getId={(i) => i.id}
        getStatus={(i) => i.status}
        onStatusChange={changeStatus}
        renderCard={(item) => (
          <div className="card-surface space-y-2 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold leading-snug text-iter-text">{item.title}</p>
              {canDelete && (
                <button
                  onClick={() => handleDelete(item)}
                  className="focus-ring shrink-0 rounded-md p-0.5 text-iter-faint hover:text-iter-danger"
                  aria-label="Excluir demanda"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="neutral">{CONTENT_FORMAT_LABELS[item.format]}</Badge>
              {clientName(item.clientId) && <Badge tone="primary">{clientName(item.clientId)}</Badge>}
            </div>
            <p className="text-[11px] text-iter-muted">{userName(item.responsibleId)}</p>
            {item.dueDate && <p className="text-[11px] text-iter-faint">Prazo: {formatDate(item.dueDate)}</p>}
            <StatusSelect value={item.status} onChange={(status) => changeStatus(item, status)} options={STATUS_OPTIONS} />
          </div>
        )}
      />
    </div>
  )
}
