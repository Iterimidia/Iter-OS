import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  description?: string
  action?: ReactNode
}

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-iter-text">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-iter-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
