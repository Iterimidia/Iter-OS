import { useParams } from 'react-router-dom'
import { mockReports } from '@/data/mockData'
import { useCurrentUser } from '@/features/auth/useAuth'
import { canExport } from '@/lib/permissions'
import { PrintPageChrome } from '@/components/reports/PrintPageChrome'
import { PrintableReport } from '@/components/reports/PrintableReport'

export function PrintReportPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const user = useCurrentUser()
  const report = mockReports.find((r) => r.id === reportId)

  if (!user) return null

  if (!report) {
    return (
      <PrintPageChrome>
        <p className="p-10 text-center text-sm text-gray-500">Relatório não encontrado.</p>
      </PrintPageChrome>
    )
  }

  if (!canExport(user, report)) {
    return (
      <PrintPageChrome>
        <p className="p-10 text-center text-sm text-gray-500">Você não tem permissão para exportar este relatório.</p>
      </PrintPageChrome>
    )
  }

  return (
    <PrintPageChrome>
      <PrintableReport report={report} />
    </PrintPageChrome>
  )
}
