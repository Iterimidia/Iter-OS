import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import type { DeliveryPlanItem, DeliveryUnitStatus } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { isDeliveryPlanItemPending, useDataStore } from '@/data/store'
import { canAccessClient, canPerformAction } from '@/lib/permissions'
import {
  cn,
  currentMonthKey,
  DELIVERY_UNIT_STATUS_META,
  formatMonthLabel,
  nextDeliveryUnitStatus,
  shiftMonthKey,
} from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { DeliveryPlanItemFormModal } from '@/features/operational/DeliveryPlanItemFormModal'

export function DeliveriesPage() {
  const user = useCurrentUser()!
  const clients = useDataStore((s) => s.clients)
  const deliveryPlanItems = useDataStore((s) => s.deliveryPlanItems)
  const deliveryUnits = useDataStore((s) => s.deliveryUnits)
  const reconcileDeliveryUnits = useDataStore((s) => s.reconcileDeliveryUnits)
  const updateDeliveryUnit = useDataStore((s) => s.updateDeliveryUnit)
  const removeDeliveryPlanItem = useDataStore((s) => s.removeDeliveryPlanItem)

  const [month, setMonth] = useState(() => currentMonthKey())
  const [planModalClientId, setPlanModalClientId] = useState<string | null>(null)
  const [editingPlanItem, setEditingPlanItem] = useState<DeliveryPlanItem | null>(null)

  const canDelete = canPerformAction(user, 'excluir')
  const canCreate = canPerformAction(user, 'criar')

  const accessibleClients = clients.filter((c) => canAccessClient(user, c.id))

  // Garante as unidades do mês corrente pra cada item contratado, até a
  // quantidade vigente. `reconcileDeliveryUnits` roda inteira numa RPC que
  // trava a linha do item contratado e lê `monthlyQuantity` dentro da
  // transação (correção pós-revisão Codex, 4ª rodada) — rodar de novo,
  // inclusive ao mesmo tempo em outra aba/sessão ou concorrendo com uma
  // redução de quantidade, nunca cria unidades a mais do que o contratado
  // nem deixa a quantidade cair abaixo do que já existe. Pula itens ainda
  // pendentes de confirmação no Supabase (evita a foreign key
  // delivery_units_plan_item_id_fkey: addDeliveryPlanItem já cuida desse
  // caso sozinho depois que o item é confirmado).
  useEffect(() => {
    for (const item of deliveryPlanItems) {
      if (isDeliveryPlanItemPending(item.id)) continue
      reconcileDeliveryUnits(item.id, month)
    }
  }, [month, deliveryPlanItems, deliveryUnits, reconcileDeliveryUnits])

  function handleToggleUnit(unitId: string, status: DeliveryUnitStatus) {
    updateDeliveryUnit(unitId, { status: nextDeliveryUnitStatus(status) })
  }

  function handleDeletePlanItem(item: DeliveryPlanItem) {
    if (window.confirm(`Remover "${item.label}" da lista de contratados de ${clients.find((c) => c.id === item.clientId)?.name}?`)) {
      removeDeliveryPlanItem(item.id)
    }
  }

  return (
    <div>
      <SectionHeader
        title="Controle de Entregas"
        description="O que cada cliente contratou por mês — clique num número pra alternar entre pendente, em produção e entregue."
        action={
          <div className="flex items-center gap-1 rounded-lg border border-iter-border bg-iter-surface px-1 py-1">
            <button
              onClick={() => setMonth((m) => shiftMonthKey(m, -1))}
              className="focus-ring rounded-md p-1.5 text-iter-muted hover:text-iter-text"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[150px] text-center text-sm font-medium capitalize text-iter-text">{formatMonthLabel(month)}</span>
            <button
              onClick={() => setMonth((m) => shiftMonthKey(m, 1))}
              className="focus-ring rounded-md p-1.5 text-iter-muted hover:text-iter-text"
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {accessibleClients.length === 0 ? (
        <EmptyState title="Nenhum cliente disponível" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {accessibleClients.map((client) => {
            const items = deliveryPlanItems.filter((p) => p.clientId === client.id)
            return (
              <div key={client.id} className="card-surface p-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-iter-text">{client.name}</h3>
                    <p className="text-xs text-iter-faint">{client.plan}</p>
                  </div>
                  {canCreate && (
                    <Button variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setPlanModalClientId(client.id)}>
                      Item contratado
                    </Button>
                  )}
                </div>

                {items.length === 0 ? (
                  <p className="mt-3 text-xs text-iter-muted">Nenhum item contratado configurado para este cliente ainda.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {items.map((item) => {
                      const units = deliveryUnits.filter((u) => u.planItemId === item.id && u.month === month).sort((a, b) => a.unitIndex - b.unitIndex)
                      const delivered = units.filter((u) => u.status === 'entregue').length
                      const inProduction = units.filter((u) => u.status === 'em_producao').length
                      const pending = units.length - delivered - inProduction
                      return (
                        <div key={item.id} className="rounded-xl border border-iter-border bg-iter-surface-alt p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-iter-text">{item.label}</p>
                              <Badge tone="neutral">{item.monthlyQuantity}/mês</Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingPlanItem(item)}
                                className="focus-ring rounded-md p-0.5 text-iter-faint hover:text-iter-text"
                                aria-label="Editar item contratado"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => handleDeletePlanItem(item)}
                                  className="focus-ring rounded-md p-0.5 text-iter-faint hover:text-iter-danger"
                                  aria-label="Excluir item contratado"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {units.map((unit, idx) => (
                              <button
                                key={unit.id}
                                onClick={() => handleToggleUnit(unit.id, unit.status)}
                                title={DELIVERY_UNIT_STATUS_META[unit.status].label}
                                className={cn(
                                  'focus-ring flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] font-semibold transition-colors',
                                  unit.status === 'pendente' && 'border-iter-border bg-iter-surface text-iter-faint',
                                  unit.status === 'em_producao' && 'border-iter-info/30 bg-iter-info/15 text-iter-info',
                                  unit.status === 'entregue' && 'border-iter-success/30 bg-iter-success/15 text-iter-success',
                                )}
                              >
                                {idx + 1}
                              </button>
                            ))}
                          </div>
                          <p className="mt-2 text-[11px] text-iter-faint">
                            {delivered} entregue{delivered === 1 ? '' : 's'} · {inProduction} em produção · {pending} pendente{pending === 1 ? '' : 's'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <DeliveryPlanItemFormModal
        open={planModalClientId !== null}
        onClose={() => setPlanModalClientId(null)}
        clientId={planModalClientId ?? ''}
      />
      <DeliveryPlanItemFormModal
        open={editingPlanItem !== null}
        onClose={() => setEditingPlanItem(null)}
        clientId={editingPlanItem?.clientId ?? ''}
        item={editingPlanItem ?? undefined}
      />
    </div>
  )
}
