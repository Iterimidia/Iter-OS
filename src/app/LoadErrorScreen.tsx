import { TriangleAlert } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'

/**
 * Mostrada quando o carregamento inicial dos dados falha (rede/API) — nunca
 * quando os dados simplesmente estão vazios. Ver useDataStore.loadError.
 */
export function LoadErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-iter-bg px-6 text-center">
      <Logo />
      <TriangleAlert className="h-6 w-6 text-iter-danger" />
      <p className="max-w-sm text-sm text-iter-muted">{message}</p>
      <Button onClick={onRetry}>Tentar novamente</Button>
    </div>
  )
}
