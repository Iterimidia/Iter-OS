import { useLocation } from 'react-router-dom'
import { Bell, Menu } from 'lucide-react'
import type { BaseId } from '@/types'
import { useCurrentUser } from '@/features/auth/useAuth'
import { BASES, findAreaByPath } from '@/lib/navigation'
import { Logo } from '@/components/layout/Logo'
import { Avatar } from '@/components/ui/Avatar'

interface TopbarProps {
  base: BaseId
  onOpenMobileNav: () => void
}

export function Topbar({ base, onOpenMobileNav }: TopbarProps) {
  const location = useLocation()
  const user = useCurrentUser()
  const area = findAreaByPath(location.pathname)
  const baseMeta = BASES.find((b) => b.id === base)!

  if (!user) return null

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-iter-border bg-iter-bg/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <button
        onClick={onOpenMobileNav}
        className="focus-ring rounded-lg p-2 text-iter-muted hover:bg-iter-surface-alt lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2 lg:hidden">
        <Logo markOnly />
      </div>

      <div className="hidden min-w-0 flex-1 lg:block">
        <p className="truncate text-[11px] text-iter-faint">{baseMeta.label}</p>
        <h1 className="truncate text-sm font-semibold text-iter-text">{area?.label ?? baseMeta.label}</h1>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          className="focus-ring relative rounded-lg p-2 text-iter-muted hover:bg-iter-surface-alt hover:text-iter-text disabled:opacity-50"
          aria-label="Notificações (em breve)"
          title="Notificações — em breve"
          disabled
        >
          <Bell className="h-4 w-4" />
        </button>
        <Avatar name={user.name} initials={user.avatarInitials} color={user.avatarColor} size="sm" className="lg:hidden" />
      </div>
    </header>
  )
}
