import { NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, LogOut } from 'lucide-react'
import type { BaseId } from '@/types'
import { useAuthStore, useCurrentUser } from '@/features/auth/useAuth'
import { getAccessibleAreas, getAccessibleBases } from '@/lib/permissions'
import { BASES } from '@/lib/navigation'
import { getIcon } from '@/lib/icons'
import { cn, ROLE_LABELS } from '@/lib/utils'
import { Logo } from '@/components/layout/Logo'
import { Avatar } from '@/components/ui/Avatar'

export function Sidebar({ base }: { base: BaseId }) {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  if (!user) return null

  const areas = getAccessibleAreas(user, base)
  const bases = getAccessibleBases(user)
  const baseMeta = BASES.find((b) => b.id === base)!
  const BaseIcon = getIcon(baseMeta.icon)

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-iter-border bg-iter-bg-alt/60 backdrop-blur-xl lg:flex">
      <div className="p-5">
        <Logo />
      </div>

      {bases.length > 1 ? (
        <button
          onClick={() => navigate('/selecionar-base')}
          className="focus-ring mx-4 mb-2 flex items-center gap-2.5 rounded-xl border border-iter-border bg-iter-surface px-3 py-2.5 text-left transition-colors hover:border-iter-primary/40"
        >
          <BaseIcon className="h-4 w-4 shrink-0 text-iter-accent" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-iter-text">{baseMeta.label}</span>
          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-iter-faint" />
        </button>
      ) : (
        <div className="mx-4 mb-2 flex items-center gap-2.5 rounded-xl border border-iter-border bg-iter-surface px-3 py-2.5">
          <BaseIcon className="h-4 w-4 shrink-0 text-iter-accent" />
          <span className="truncate text-xs font-medium text-iter-text">{baseMeta.label}</span>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {areas.map((area) => {
          const Icon = getIcon(area.icon)
          return (
            <NavLink
              key={area.id}
              to={area.path}
              end={area.path === `/${base}`}
              className={({ isActive }) =>
                cn(
                  'focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-iter-primary/12 text-iter-primary'
                    : 'text-iter-muted hover:bg-iter-surface-alt hover:text-iter-text',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {area.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-iter-border p-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={user.name} initials={user.avatarInitials} color={user.avatarColor} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-iter-text">{user.name}</p>
            <p className="truncate text-[11px] text-iter-faint">{ROLE_LABELS[user.role]}</p>
          </div>
          <button
            onClick={logout}
            className="focus-ring shrink-0 rounded-lg p-1.5 text-iter-faint hover:bg-iter-surface-alt hover:text-iter-danger"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
