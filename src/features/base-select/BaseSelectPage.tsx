import { useNavigate } from 'react-router-dom'
import { ArrowRight, LogOut } from 'lucide-react'
import { useAuthStore, useCurrentUser } from '@/features/auth/useAuth'
import { getAccessibleBases, getBaseHomePath } from '@/lib/permissions'
import { getIcon } from '@/lib/icons'
import { GradientBackdrop } from '@/components/ui/GradientBackdrop'
import { Logo } from '@/components/layout/Logo'
import { Avatar } from '@/components/ui/Avatar'

export function BaseSelectPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)

  if (!user) return null

  const bases = getAccessibleBases(user)

  return (
    <div className="relative min-h-screen w-full bg-iter-bg">
      <GradientBackdrop />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar name={user.name} initials={user.avatarInitials} color={user.avatarColor} size="sm" />
              <span className="text-sm text-iter-muted">{user.name}</span>
            </div>
            <button
              onClick={logout}
              className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-iter-border px-3 py-1.5 text-xs font-medium text-iter-muted transition-colors hover:bg-iter-surface-alt hover:text-iter-text"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-iter-border bg-iter-surface/70 px-3 py-1 text-[11px] font-medium text-iter-muted backdrop-blur">
            Olá, {user.name.split(' ')[0]}
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-iter-text sm:text-3xl">
            Qual base você quer acessar?
          </h1>
          <p className="mt-2 max-w-md text-sm text-iter-muted">
            Três visões diferentes da mesma operação e da mesma base de dados — escolha por onde quer começar.
          </p>

          <div className="mt-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bases.map((base) => {
              const Icon = getIcon(base.icon)
              return (
                <button
                  key={base.id}
                  onClick={() => navigate(getBaseHomePath(user, base.id) ?? '/sem-acesso')}
                  className="group glass-panel relative flex flex-col items-start gap-4 rounded-2xl p-6 text-left transition-all hover:-translate-y-0.5 hover:border-iter-primary/40 hover:shadow-glow"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-iter-primary to-iter-secondary text-white shadow-soft">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-iter-text">{base.label}</h2>
                    <p className="mt-1.5 text-xs leading-relaxed text-iter-muted">{base.description}</p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-iter-accent opacity-0 transition-opacity group-hover:opacity-100">
                    Entrar <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
