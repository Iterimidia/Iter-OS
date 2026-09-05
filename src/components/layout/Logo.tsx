import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  markOnly?: boolean
}

/**
 * Wordmark da Iter Mídia — recriado em código a partir da referência de marca
 * (ainda sem o arquivo oficial da logo). Badge roxo escuro auto-contido para
 * funcionar em qualquer fundo: "ITER" em degradê magenta→roxo, "MÍDIA" no
 * off-white da marca. Trocar pelo SVG/PNG oficial assim que for enviado.
 */
export function Logo({ className, markOnly = false }: LogoProps) {
  if (markOnly) {
    return (
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3A2361] text-sm font-black italic text-iter-bg shadow-soft',
          className,
        )}
      >
        I
      </span>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl bg-[#3A2361] px-3.5 py-2 shadow-soft',
        className,
      )}
    >
      <span className="bg-gradient-to-r from-[#D0559E] to-[#6B3AA0] bg-clip-text text-lg font-black italic tracking-tight text-transparent">
        ITER
      </span>
      <span className="text-lg font-black italic tracking-tight text-iter-bg">MÍDIA</span>
    </div>
  )
}
