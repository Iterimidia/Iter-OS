import type { DemandStatus } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction, getAccessibleClients } from '@/lib/permissions'
import { CONTENT_FORMAT_LABELS, DEMAND_STATUS_META } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const GROUPS: { status: DemandStatus; title: string; hint: string }[] = [
  { status: 'em_revisao_interna', title: 'Aguardando revisão interna', hint: 'Equipe criativa revisa antes de enviar ao cliente.' },
  { status: 'aguardando_cliente', title: 'Aguardando aprovação do cliente', hint: 'Já revisado internamente, esperando o cliente.' },
  { status: 'ajustes_necessarios', title: 'Ajustes solicitados', hint: 'Precisa de retrabalho antes de seguir.' },
  { status: 'aprovado', title: 'Aprovado', hint: 'Pronto para publicar.' },
]

export function ApprovalsPage() {
  const user = useCurrentUser()!
  const contentItems = useDataStore((s) => s.contentItems)
  const clients = useDataStore((s) => s.clients)
  const updateContentItem = useDataStore((s) => s.updateContentItem)
  const canApprove = canPerformAction(user, 'aprovar')

  const accessibleIds = new Set(getAccessibleClients(user, clients).map((c) => c.id))
  const items = contentItems.filter((c) => accessibleIds.has(c.clientId))
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—'

  return (
    <div className="space-y-8">
      <SectionHeader title="Aprovações" description="Fluxo de revisão interna e aprovação do cliente." />

      {GROUPS.map((group) => {
        const groupItems = items.filter((i) => i.status === group.status)
        return (
          <section key={group.status}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-iter-text">{group.title}</h3>
                <p className="text-xs text-iter-muted">{group.hint}</p>
              </div>
              <Badge tone={DEMAND_STATUS_META[group.status].tone}>{groupItems.length}</Badge>
            </div>

            {groupItems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-iter-border px-4 py-6 text-center text-xs text-iter-faint">Nada por aqui.</p>
            ) : (
              <div className="space-y-2">
                {groupItems.map((item) => (
                  <div key={item.id} className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-iter-text">{item.title}</p>
                      <p className="mt-0.5 text-xs text-iter-muted">
                        {clientName(item.clientId)} · {CONTENT_FORMAT_LABELS[item.format]}
                      </p>
                    </div>
                    {canApprove && (
                      <div className="flex flex-wrap gap-2">
                        {group.status === 'em_revisao_interna' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => updateContentItem(item.id, { internalApproval: true, status: 'aguardando_cliente' })}
                          >
                            Aprovar internamente
                          </Button>
                        )}
                        {group.status === 'aguardando_cliente' && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => updateContentItem(item.id, { status: 'ajustes_necessarios' })}>
                              Pedir ajustes
                            </Button>
                            <Button size="sm" onClick={() => updateContentItem(item.id, { clientApproval: true, status: 'aprovado' })}>
                              Cliente aprovou
                            </Button>
                          </>
                        )}
                        {group.status === 'ajustes_necessarios' && (
                          <Button size="sm" variant="secondary" onClick={() => updateContentItem(item.id, { status: 'em_revisao_interna' })}>
                            Reenviar para revisão
                          </Button>
                        )}
                        {group.status === 'aprovado' && (
                          <Button size="sm" variant="secondary" onClick={() => updateContentItem(item.id, { status: 'publicado' })}>
                            Marcar como publicado
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
