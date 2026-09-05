import { useParams } from 'react-router-dom'
import { mockReports } from '@/data/mockData'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canAccessClient, canExport } from '@/lib/permissions'
import { PrintPageChrome } from '@/components/reports/PrintPageChrome'
import { PrintableClientReport } from '@/components/reports/PrintableClientReport'

export function PrintClientReportPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const user = useCurrentUser()
  const client = useDataStore((s) => s.clients.find((c) => c.id === clientId))
  const report = mockReports.find((r) => r.id === 'rep_cliente')!

  if (!user) return null

  if (!client) {
    return (
      <PrintPageChrome>
        <p className="p-10 text-center text-sm text-gray-500">Cliente não encontrado.</p>
      </PrintPageChrome>
    )
  }

  if (!canExport(user, report) || !canAccessClient(user, client.id)) {
    return (
      <PrintPageChrome>
        <p className="p-10 text-center text-sm text-gray-500">Você não tem permissão para exportar o relatório deste cliente.</p>
      </PrintPageChrome>
    )
  }

  return (
    <PrintPageChrome>
      <PrintableClientReport clientId={client.id} />
    </PrintPageChrome>
  )
}
