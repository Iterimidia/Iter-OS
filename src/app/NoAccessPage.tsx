import { ShieldAlert } from 'lucide-react'
import { useAuthStore, useCurrentUser } from '@/features/auth/useAuth'
import { GradientBackdrop } from '@/components/ui/GradientBackdrop'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'

export function NoAccessPage() {
  const user = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="relative min-h-screen w-full bg-iter-bg">
      <GradientBackdrop />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 text-center">
        <Logo className="mb-8" />
        <span className="rounded-full bg-iter-surface-alt p-3">
          <ShieldAlert className="h-5 w-5 text-iter-warning" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-iter-text">Nenhuma área liberada</h1>
        <p className="mt-2 text-sm text-iter-muted">
          {user
            ? `A conta de ${user.name} ainda não tem nenhuma base ou área liberada. Fale com um administrador para revisar suas permissões.`
            : 'Sua conta ainda não tem nenhuma base ou área liberada.'}
        </p>
        <Button variant="secondary" className="mt-6" onClick={logout}>
          Sair e tentar outra conta
        </Button>
      </div>
    </div>
  )
}
