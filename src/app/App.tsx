import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { useAuthStore } from '@/features/auth/useAuth'
import { BaseSelectPage } from '@/features/base-select/BaseSelectPage'
import { NoAccessPage } from '@/app/NoAccessPage'
import { RequireArea, RequireAuth, RequireBase, RootRedirect, BaseIndexRedirect } from '@/app/guards'
import { LoadingScreen } from '@/app/LoadingScreen'
import { useDataStore } from '@/data/store'
import { PrintReportPage } from '@/features/reports/PrintReportPage'
import { PrintClientReportPage } from '@/features/reports/PrintClientReportPage'

import { GeneralDashboardPage } from '@/features/general/GeneralDashboardPage'
import { GeneralCalendarPage } from '@/features/general/GeneralCalendarPage'
import { ReportsPage } from '@/features/general/ReportsPage'
import { VisibilityConfigPage } from '@/features/general/VisibilityConfigPage'

import { DirectionPage } from '@/features/operational/DirectionPage'
import { CommercialPage } from '@/features/operational/CommercialPage'
import { ClientsListPage } from '@/features/operational/ClientsListPage'
import { ClientDetailPage } from '@/features/operational/ClientDetailPage'
import { ProjectsPage } from '@/features/operational/ProjectsPage'
import { DeliveriesPage } from '@/features/operational/DeliveriesPage'
import { OperationPage } from '@/features/operational/OperationPage'
import { OperationalCalendarPage } from '@/features/operational/OperationalCalendarPage'
import { FinancePage } from '@/features/operational/FinancePage'
import { TeamPage } from '@/features/operational/TeamPage'
import { FilesPage } from '@/features/operational/FilesPage'
import { SettingsPage } from '@/features/operational/SettingsPage'

import { CreativePanelPage } from '@/features/creative/CreativePanelPage'
import { ContentPage } from '@/features/creative/ContentPage'
import { DemandsPage } from '@/features/creative/DemandsPage'
import { CreativeCalendarPage } from '@/features/creative/CreativeCalendarPage'
import { CreativeFilesPage } from '@/features/creative/CreativeFilesPage'
import { ApprovalsPage } from '@/features/creative/ApprovalsPage'

export function App() {
  const authStatus = useAuthStore((s) => s.status)

  // Dado privado só é buscado depois que a sessão Auth está resolvida E
  // autenticada; ao deslogar, o estado local é limpo por inteiro — nenhum
  // dado do usuário anterior deve sobreviver na memória/UI.
  useEffect(() => {
    if (authStatus === 'signed_in') useDataStore.getState().initialize()
    if (authStatus === 'signed_out') useDataStore.getState().reset()
  }, [authStatus])

  // 'loading' é só a resolução inicial da sessão (ou sua restauração após
  // recarregar a página) — não depende de nenhum dado privado, então não há
  // flash de conteúdo protegido aqui, só a tela de carregamento.
  if (authStatus === 'loading') return <LoadingScreen />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/selecionar-base" element={<BaseSelectPage />} />
        <Route path="/sem-acesso" element={<NoAccessPage />} />
        <Route path="/relatorios/imprimir/cliente/:clientId" element={<PrintClientReportPage />} />
        <Route path="/relatorios/imprimir/:reportId" element={<PrintReportPage />} />

        {/* Base Geral */}
        <Route element={<RequireBase base="geral" />}>
          <Route element={<RequireArea areaId="geral:dashboard" />}>
            <Route path="/geral" element={<GeneralDashboardPage />} />
          </Route>
          <Route element={<RequireArea areaId="geral:calendario" />}>
            <Route path="/geral/calendario" element={<GeneralCalendarPage />} />
          </Route>
          <Route element={<RequireArea areaId="geral:relatorios" />}>
            <Route path="/geral/relatorios" element={<ReportsPage />} />
          </Route>
          <Route element={<RequireArea areaId="geral:visibilidade" />}>
            <Route path="/geral/visibilidade" element={<VisibilityConfigPage />} />
          </Route>
        </Route>

        {/* Base Operacional */}
        <Route element={<RequireBase base="operacional" />}>
          <Route path="/operacional" element={<BaseIndexRedirect base="operacional" />} />
          <Route element={<RequireArea areaId="operacional:direcao" />}>
            <Route path="/operacional/direcao" element={<DirectionPage />} />
          </Route>
          <Route element={<RequireArea areaId="operacional:comercial" />}>
            <Route path="/operacional/comercial" element={<CommercialPage />} />
          </Route>
          <Route element={<RequireArea areaId="operacional:clientes" />}>
            <Route path="/operacional/clientes" element={<ClientsListPage />} />
            <Route path="/operacional/clientes/:clientId" element={<ClientDetailPage />} />
          </Route>
          <Route element={<RequireArea areaId="operacional:projetos" />}>
            <Route path="/operacional/projetos" element={<ProjectsPage />} />
          </Route>
          <Route element={<RequireArea areaId="operacional:entregas" />}>
            <Route path="/operacional/entregas" element={<DeliveriesPage />} />
          </Route>
          <Route element={<RequireArea areaId="operacional:operacao" />}>
            <Route path="/operacional/operacao" element={<OperationPage />} />
          </Route>
          <Route element={<RequireArea areaId="operacional:calendario" />}>
            <Route path="/operacional/calendario" element={<OperationalCalendarPage />} />
          </Route>
          <Route element={<RequireArea areaId="operacional:financeiro" />}>
            <Route path="/operacional/financeiro" element={<FinancePage />} />
          </Route>
          <Route element={<RequireArea areaId="operacional:equipe" />}>
            <Route path="/operacional/equipe" element={<TeamPage />} />
          </Route>
          <Route element={<RequireArea areaId="operacional:arquivos" />}>
            <Route path="/operacional/arquivos" element={<FilesPage />} />
          </Route>
          <Route element={<RequireArea areaId="operacional:configuracoes" />}>
            <Route path="/operacional/configuracoes" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Base Criativa */}
        <Route element={<RequireBase base="criativo" />}>
          <Route element={<RequireArea areaId="criativo:painel" />}>
            <Route path="/criativo" element={<CreativePanelPage />} />
          </Route>
          <Route element={<RequireArea areaId="criativo:conteudo" />}>
            <Route path="/criativo/conteudo" element={<ContentPage />} />
          </Route>
          <Route element={<RequireArea areaId="criativo:demandas" />}>
            <Route path="/criativo/demandas" element={<DemandsPage />} />
          </Route>
          <Route element={<RequireArea areaId="criativo:calendario" />}>
            <Route path="/criativo/calendario" element={<CreativeCalendarPage />} />
          </Route>
          <Route element={<RequireArea areaId="criativo:arquivos" />}>
            <Route path="/criativo/arquivos" element={<CreativeFilesPage />} />
          </Route>
          <Route element={<RequireArea areaId="criativo:aprovacoes" />}>
            <Route path="/criativo/aprovacoes" element={<ApprovalsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
