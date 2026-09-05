interface StatusOption<S extends string> {
  value: S
  label: string
}

interface StatusSelectProps<S extends string> {
  value: S
  options: StatusOption<S>[]
  onChange: (value: S) => void
  /** Fase 5: quando o usuário não tem a ação que a mudança de status exige (ex: `editar`), desabilita em vez de deixar interagir com algo que a RLS vai recusar depois. */
  disabled?: boolean
}

/** Select compacto usado dentro de cards de kanban — garante que mudar status funcione sem drag (mobile/acessibilidade). */
export function StatusSelect<S extends string>({ value, options, onChange, disabled }: StatusSelectProps<S>) {
  return (
    <select
      value={value}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as S)}
      className="focus-ring w-full rounded-md border border-iter-border bg-iter-surface-alt px-1.5 py-1 text-[11px] text-iter-text disabled:cursor-not-allowed disabled:opacity-60"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
