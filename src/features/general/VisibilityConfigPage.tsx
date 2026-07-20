import type { RoleId } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction } from '@/lib/permissions'
import { groupBy, ROLE_LABELS } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Switch } from '@/components/ui/Switch'
import { Badge } from '@/components/ui/Badge'

const SECTION_LABELS: Record<string, string> = {
  financeiro: 'Financeiro',
  comercial: 'Comercial',
  clientes: 'Clientes',
  operacao: 'Operação',
  criativo: 'Criativo',
  calendario: 'Calendário',
}

const ROLE_ORDER: RoleId[] = [
  'admin',
  'direcao',
  'conselho',
  'gestao_criativa',
  'criativo',
  'operacional',
  'financeiro',
  'usuario_limitado',
]

export function VisibilityConfigPage() {
  const user = useCurrentUser()!
  const dashboardCards = useDataStore((s) => s.dashboardCards)
  const updateDashboardCard = useDataStore((s) => s.updateDashboardCard)
  const canEdit = canPerformAction(user, 'gerenciar_usuarios')

  const grouped = groupBy(dashboardCards, (c) => c.section)

  function toggleRole(cardId: string, role: RoleId) {
    if (!canEdit) return
    const card = dashboardCards.find((c) => c.id === cardId)
    if (!card) return
    const has = card.visibleToRoles.includes(role)
    updateDashboardCard(cardId, {
      visibleToRoles: has ? card.visibleToRoles.filter((r) => r !== role) : [...card.visibleToRoles, role],
    })
  }

  return (
    <div>
      <SectionHeader
        title="Configuração de Visibilidade"
        description={
          canEdit
            ? 'Decida quais papéis enxergam cada card do Dashboard Geral.'
            : 'Quais papéis enxergam cada card do Dashboard Geral (somente leitura).'
        }
      />

      {!canEdit && (
        <div className="mb-4 rounded-lg border border-iter-border bg-iter-surface-alt px-3.5 py-2.5 text-xs text-iter-muted">
          Apenas administradores podem alterar esta matriz. O Admin sempre vê todos os cards, independente dela.
        </div>
      )}

      <div className="space-y-8">
        {Object.entries(grouped).map(([section, cards]) => (
          <div key={section}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-iter-faint">
              {SECTION_LABELS[section] ?? section}
            </h3>
            <div className="card-surface overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-iter-border text-left text-xs text-iter-muted">
                    <th className="px-4 py-3 font-medium">Card</th>
                    {ROLE_ORDER.map((role) => (
                      <th key={role} className="px-3 py-3 text-center font-medium">
                        {ROLE_LABELS[role]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cards.map((card) => (
                    <tr key={card.id} className="border-b border-iter-border/60 last:border-0">
                      <td className="px-4 py-3 text-xs font-medium text-iter-text">{card.title}</td>
                      {ROLE_ORDER.map((role) => (
                        <td key={role} className="px-3 py-3 text-center">
                          {role === 'admin' ? (
                            <Badge tone="primary">sempre</Badge>
                          ) : (
                            <Switch
                              checked={card.visibleToRoles.includes(role)}
                              onChange={() => toggleRole(card.id, role)}
                              disabled={!canEdit}
                              label={`${card.title} para ${ROLE_LABELS[role]}`}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
