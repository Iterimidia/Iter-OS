import { useState } from 'react'
import { Building2, Check, Plug, Save, ShieldAlert } from 'lucide-react'
import { useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canPerformAction } from '@/lib/permissions'
import { INTEGRATION_STATUS_META } from '@/lib/utils'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Input, Label, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { EditableTagList } from '@/components/forms/EditableTagList'

export function SettingsPage() {
  const user = useCurrentUser()!
  const appSettings = useDataStore((s) => s.appSettings)
  const updateAppSettings = useDataStore((s) => s.updateAppSettings)

  const [tab, setTab] = useState('geral')
  const [companyName, setCompanyName] = useState(appSettings.companyName)
  const [loginSlogan, setLoginSlogan] = useState(appSettings.loginSlogan)
  const [dashboardSlogan, setDashboardSlogan] = useState(appSettings.dashboardSlogan)
  const [saved, setSaved] = useState(false)

  const canEdit = canPerformAction(user, 'editar')

  if (!canEdit) {
    return <EmptyState icon={ShieldAlert} title="Sem permissão" description="Fale com um administrador para alterar as configurações." />
  }

  function saveGeneral() {
    updateAppSettings({ companyName, loginSlogan, dashboardSlogan })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <SectionHeader title="Configurações" description="Dados da empresa, catálogos e integrações futuras." />

      <Tabs
        className="mb-6 w-fit"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'geral', label: 'Geral' },
          { id: 'catalogos', label: 'Catálogos' },
          { id: 'integracoes', label: 'Integrações' },
        ]}
      />

      {tab === 'geral' && (
        <div className="max-w-xl space-y-4">
          <div className="card-surface space-y-4 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-iter-faint">
              <Building2 className="h-3.5 w-3.5" /> Dados da empresa
            </div>
            <div>
              <Label htmlFor="companyName">Nome da empresa</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="loginSlogan">Slogan da tela de login</Label>
              <Textarea id="loginSlogan" rows={2} value={loginSlogan} onChange={(e) => setLoginSlogan(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dashboardSlogan">Slogan do dashboard</Label>
              <Textarea id="dashboardSlogan" rows={2} value={dashboardSlogan} onChange={(e) => setDashboardSlogan(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button icon={saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} onClick={saveGeneral}>
                {saved ? 'Salvo!' : 'Salvar alterações'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'catalogos' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card-surface p-5">
            <EditableTagList label="Planos" items={appSettings.plans} onChange={(plans) => updateAppSettings({ plans })} />
          </div>
          <div className="card-surface p-5">
            <EditableTagList label="Serviços" items={appSettings.services} onChange={(services) => updateAppSettings({ services })} />
          </div>
          <div className="card-surface p-5">
            <EditableTagList label="Status de cliente" items={appSettings.clientStatuses} onChange={(clientStatuses) => updateAppSettings({ clientStatuses })} />
          </div>
          <div className="card-surface p-5">
            <EditableTagList label="Tipos de tarefa" items={appSettings.taskTypes} onChange={(taskTypes) => updateAppSettings({ taskTypes })} />
          </div>
        </div>
      )}

      {tab === 'integracoes' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {appSettings.integrations.map((integration) => (
            <div key={integration.id} className="card-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-lg bg-iter-surface-alt p-2 text-iter-muted">
                  <Plug className="h-4 w-4" />
                </span>
                <Badge tone={INTEGRATION_STATUS_META[integration.status].tone}>{INTEGRATION_STATUS_META[integration.status].label}</Badge>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-iter-text">{integration.name}</h3>
              <p className="mt-1 text-xs text-iter-muted">{integration.description}</p>
              <Button variant="secondary" size="sm" className="mt-4 w-full justify-center" disabled>
                Conectar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
