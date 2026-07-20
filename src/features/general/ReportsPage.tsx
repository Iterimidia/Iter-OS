import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, FileBarChart2, FileText, Lock } from 'lucide-react'
import { mockReports } from '@/data/mockData'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canExport, getAccessibleClients } from '@/lib/permissions'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

export function ReportsPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()!
  const clients = useDataStore((s) => s.clients)
  const accessibleClients = getAccessibleClients(user, clients)
  const [selectedClientId, setSelectedClientId] = useState(accessibleClients[0]?.id ?? '')

  return (
    <div>
      <SectionHeader
        title="Relatórios Exportáveis"
        description="Exportação via impressão do navegador (salvar como PDF). Cada pessoa só exporta o que tem permissão para ver."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockReports
          .filter((r) => r.id !== 'rep_cliente')
          .map((report) => {
            const allowed = canExport(user, report)
            return (
              <div key={report.id} className="card-surface flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <span className="w-fit rounded-lg bg-iter-primary/10 p-2 text-iter-primary">
                    <FileBarChart2 className="h-4 w-4" />
                  </span>
                  {!allowed && <Lock className="h-3.5 w-3.5 text-iter-faint" />}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-iter-text">{report.title}</h3>
                <p className="mt-1 flex-1 text-xs text-iter-muted">{report.description}</p>
                <Button
                  variant={allowed ? 'secondary' : 'ghost'}
                  size="sm"
                  className="mt-4 w-full justify-center"
                  disabled={!allowed}
                  icon={<Download className="h-3.5 w-3.5" />}
                  onClick={() => navigate(`/relatorios/imprimir/${report.id}`)}
                >
                  {allowed ? 'Exportar' : 'Sem permissão'}
                </Button>
              </div>
            )
          })}

        <div className="card-surface flex flex-col p-5">
          <span className="w-fit rounded-lg bg-iter-primary/10 p-2 text-iter-primary">
            <FileText className="h-4 w-4" />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-iter-text">Relatório por Cliente</h3>
          <p className="mt-1 text-xs text-iter-muted">Visão consolidada de um cliente específico.</p>
          {accessibleClients.length === 0 ? (
            <Badge tone="neutral" className="mt-4 w-fit">
              Nenhum cliente liberado
            </Badge>
          ) : (
            <>
              <Select className="mt-4" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
                {accessibleClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2 w-full justify-center"
                icon={<Download className="h-3.5 w-3.5" />}
                onClick={() => navigate(`/relatorios/imprimir/cliente/${selectedClientId}`)}
              >
                Exportar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
