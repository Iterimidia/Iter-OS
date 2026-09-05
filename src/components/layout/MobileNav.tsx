import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, LogOut, X } from 'lucide-react'
import type { BaseId } from '@/types'
import { useAuthStore, useCurrentUser } from '@/features/auth/useAuth'
import { getAccessibleAreas, getAccessibleBases } from '@/lib/permissions'
import { getIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/layout/Logo'

interface MobileNavProps {
  base: BaseId
  open: boolean
  onClose: () => void
}

export function MobileNav({ base, open, onClose }: MobileNavProps) {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!user) return null

  const areas = getAccessibleAreas(user, base)
  const bases = getAccessibleBases(user)

  return createPortal(
    <div className={cn('fixed inset-0 z-50 lg:hidden', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div
        className={cn('absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-iter-border bg-iter-bg-alt shadow-popover transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between p-5">
          <Logo />
          <button onClick={onClose} className="focus-ring rounded-lg p-1.5 text-iter-muted hover:bg-iter-surface-alt" aria-label="Fechar menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        {bases.length > 1 && (
          <button
            onClick={() => {
              onClose()
              navigate('/selecionar-base')
            }}
            className="focus-ring mx-4 mb-2 flex items-center gap-2.5 rounded-xl border border-iter-border bg-iter-surface px-3 py-2.5 text-left"
          >
            <ArrowLeftRight className="h-4 w-4 text-iter-accent" />
            <span className="text-xs font-medium text-iter-text">Trocar de base</span>
          </button>
        )}

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {areas.map((area) => {
            const Icon = getIcon(area.icon)
            return (
              <NavLink
                key={area.id}
                to={area.path}
                onClick={onClose}
                end={area.path === `/${base}`}
                className={({ isActive }) =>
                  cn(
                    'focus-ring flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
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
          <button
            onClick={logout}
            className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-iter-muted hover:bg-iter-surface-alt hover:text-iter-danger"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
