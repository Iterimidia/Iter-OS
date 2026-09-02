import { useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface KanbanColumn<S extends string> {
  id: S
  label: string
}

interface KanbanBoardProps<T, S extends string> {
  columns: KanbanColumn<S>[]
  items: T[]
  getStatus: (item: T) => S
  getId: (item: T) => string
  onStatusChange: (item: T, status: S) => void
  renderCard: (item: T) => ReactNode
  /** Fase 5: quando o usuário não tem a ação que a mudança de status exige (ex: `editar`), desliga o drag em vez de deixar arrastar algo que a RLS vai recusar depois. Default true (comportamento anterior). */
  canChangeStatus?: boolean
}

/** Kanban genérico: arrastar no desktop, mas cada card também expõe um StatusSelect (o dono do renderCard decide). */
export function KanbanBoard<T, S extends string>({
  columns,
  items,
  getStatus,
  getId,
  onStatusChange,
  renderCard,
  canChangeStatus = true,
}: KanbanBoardProps<T, S>) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<S | null>(null)

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((col) => {
        const colItems = items.filter((i) => getStatus(i) === col.id)
        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault()
              setOverCol(col.id)
            }}
            onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
            onDrop={(e) => {
              e.preventDefault()
              if (canChangeStatus) {
                const item = items.find((i) => getId(i) === dragId)
                if (item && getStatus(item) !== col.id) onStatusChange(item, col.id)
              }
              setDragId(null)
              setOverCol(null)
            }}
            className={cn(
              'flex w-72 shrink-0 flex-col rounded-2xl border bg-iter-bg-alt/40 transition-colors',
              overCol === col.id ? 'border-iter-primary/50' : 'border-iter-border',
            )}
          >
            <div className="flex items-center justify-between px-3.5 py-3">
              <h3 className="text-xs font-semibold text-iter-text">{col.label}</h3>
              <span className="rounded-full bg-iter-surface-hover px-2 py-0.5 text-[11px] text-iter-faint">{colItems.length}</span>
            </div>
            <div className="min-h-[60px] flex-1 space-y-2 overflow-y-auto px-2.5 pb-3">
              {colItems.map((item) => (
                <div
                  key={getId(item)}
                  draggable={canChangeStatus}
                  onDragStart={() => canChangeStatus && setDragId(getId(item))}
                  onDragEnd={() => {
                    setDragId(null)
                    setOverCol(null)
                  }}
                  className={canChangeStatus ? 'cursor-grab active:cursor-grabbing' : undefined}
                >
                  {renderCard(item)}
                </div>
              ))}
              {colItems.length === 0 && <p className="px-1 py-3 text-center text-[11px] text-iter-faint">Vazio</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
