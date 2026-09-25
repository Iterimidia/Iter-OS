import type { Client, ContentItem, ContentStatus, User } from '@/types'
import { ContentCard } from '@/components/cards/ContentCard'
import { Button } from '@/components/ui/Button'
import { currentMonthKey, formatMonthLabel, shiftMonthKey } from '@/lib/utils'

interface ContentMonthListProps {
  items: ContentItem[]
  clients: Client[]
  users: User[]
  monthsAhead: number
  onExpand: () => void
  canChangeStatus: boolean
  onStatusChange: (item: ContentItem, status: ContentStatus) => void
  onOpen: (item: ContentItem) => void
  onDelete?: (item: ContentItem) => void
}

/**
 * Lista de Conteúdo agrupada por mês de referência (spec §2: mês atual +
 * próximos, sem misturar toda a produção). Reaproveitada pela tela
 * principal de Conteúdo e pela aba Conteúdo do Client Hub — mesma entidade,
 * mesma apresentação, só escopo de itens diferente.
 */
export function ContentMonthList({ items, clients, users, monthsAhead, onExpand, canChangeStatus, onStatusChange, onOpen, onDelete }: ContentMonthListProps) {
  const months = Array.from({ length: monthsAhead + 1 }, (_, i) => shiftMonthKey(currentMonthKey(), i))
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name
  const executorName = (id?: string) => (id ? (users.find((u) => u.id === id)?.name ?? '—') : undefined)
  const outOfHorizon = items.filter((c) => !c.referenceMonth || !months.includes(c.referenceMonth))

  function renderCard(item: ContentItem) {
    return (
      <ContentCard
        key={item.id}
        item={item}
        clientName={clientName(item.clientId)}
        executorName={executorName(item.executorId)}
        canChangeStatus={canChangeStatus}
        onStatusChange={(status) => onStatusChange(item, status)}
        onOpen={() => onOpen(item)}
        onDelete={onDelete ? () => onDelete(item) : undefined}
      />
    )
  }

  return (
    <div className="space-y-8">
      {months.map((month) => {
        const monthItems = items.filter((c) => c.referenceMonth === month)
        return (
          <section key={month}>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold capitalize text-iter-text">{formatMonthLabel(month)}</h3>
              <span className="text-xs text-iter-faint">{monthItems.length} peça(s)</span>
            </div>
            {monthItems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-iter-border px-4 py-6 text-center text-xs text-iter-faint">Nada planejado ainda.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{monthItems.map(renderCard)}</div>
            )}
          </section>
        )
      })}

      {outOfHorizon.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-iter-text">Fora do horizonte / sem mês definido</h3>
            <span className="text-xs text-iter-faint">{outOfHorizon.length} peça(s)</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{outOfHorizon.map(renderCard)}</div>
        </section>
      )}

      <div className="flex justify-center">
        <Button variant="secondary" size="sm" onClick={onExpand}>
          Ver mais um mês
        </Button>
      </div>
    </div>
  )
}
