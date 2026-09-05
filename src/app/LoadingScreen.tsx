import { Loader2 } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-iter-bg">
      <Logo />
      <Loader2 className="h-5 w-5 animate-spin text-iter-muted" />
      <p className="text-xs text-iter-faint">Carregando dados...</p>
    </div>
  )
}
