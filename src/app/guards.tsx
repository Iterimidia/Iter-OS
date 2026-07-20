import { Navigate, Outlet } from 'react-router-dom'
import type { BaseId } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { canAccessBase, canViewArea, getBaseHomePath, getHomePathForUser } from '@/lib/permissions'
import { AREAS } from '@/lib/navigation'
import { AppShell } from '@/components/layout/AppShell'

/** Bloqueia tudo que exige sessão. */
export function RequireAuth() {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

/** Rota "/" — manda o usuário logado direto pra base certa (ou seleção, ou sem-acesso). */
export function RootRedirect() {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={getHomePathForUser(user)} replace />
}

/** Garante acesso à base e monta o shell (sidebar/topbar) com a navegação certa. */
export function RequireBase({ base }: { base: BaseId }) {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  if (!canAccessBase(user, base)) return <Navigate to={getHomePathForUser(user)} replace />
  return (
    <AppShell base={base}>
      <Outlet />
    </AppShell>
  )
}

/** Redireciona a raiz de uma base (ex: "/operacional") pra primeira área liberada. */
export function BaseIndexRedirect({ base }: { base: BaseId }) {
  const user = useCurrentUser()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={getBaseHomePath(user, base) ?? '/sem-acesso'} replace />
}

/** Garante acesso a uma área específica dentro da base já montada. */
export function RequireArea({ areaId }: { areaId: string }) {
  const user = useCurrentUser()
  const area = AREAS.find((a) => a.id === areaId)
  if (!user) return <Navigate to="/login" replace />
  if (!area || !canViewArea(user, areaId)) {
    return <Navigate to={(area && getBaseHomePath(user, area.baseId)) || '/sem-acesso'} replace />
  }
  return <Outlet />
}
