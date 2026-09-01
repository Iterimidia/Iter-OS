import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import type { BaseId } from '@/types'
import { useAuthStore, useCurrentUser } from '@/features/auth/useAuth'
import { useDataStore } from '@/data/store'
import { canAccessBase, canViewArea, getBaseHomePath, getHomePathForUser } from '@/lib/permissions'
import { AREAS } from '@/lib/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { LoadingScreen } from '@/app/LoadingScreen'

/**
 * Bloqueia tudo que exige sessão. `status` já veio resolvido de App.tsx
 * (nunca é 'loading' aqui) — o que falta cobrir é: sem sessão -> /login;
 * com sessão mas dados/perfil ainda carregando -> loading; com sessão mas
 * SEM perfil interno válido (auth_user_id sem linha, ou active=false) ->
 * a RLS já devolve zero linhas em `users` pra esse caso (Fase 2, B4a), então
 * `user` fica null mesmo autenticado — nesse caso encerra a sessão e manda
 * pro login com uma mensagem, em vez de deixar a pessoa presa numa tela em
 * branco.
 */
export function RequireAuth() {
  const status = useAuthStore((s) => s.status)
  const initialized = useDataStore((s) => s.initialized)
  const user = useCurrentUser()

  useEffect(() => {
    if (status === 'signed_in' && initialized && !user) {
      useAuthStore.getState().logoutWithError('Sua conta está inativa ou sem perfil liberado no sistema. Fale com o administrador.')
    }
  }, [status, initialized, user])

  if (status === 'signed_out') return <Navigate to="/login" replace />
  if (status === 'signed_in' && (!initialized || !user)) return <LoadingScreen />
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
