/** Fundo tecnológico usado nas telas fora do app (login, seleção de base). */
export function GradientBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-iter-bg">
      <div className="absolute inset-0 bg-iter-mesh" />
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-iter-primary/20 blur-[120px]" />
      <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-iter-secondary/15 blur-[120px]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgb(var(--iter-border) / 0.6) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--iter-border) / 0.6) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)',
        }}
      />
    </div>
  )
}
