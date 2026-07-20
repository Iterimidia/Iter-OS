import { cn } from '@/lib/utils'

interface TabItem {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: TabItem[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div
      className={cn('flex items-center gap-1 overflow-x-auto rounded-xl border border-iter-border bg-iter-surface-alt p-1', className)}
      style={{ maskImage: 'linear-gradient(to right, black 94%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, black 94%, transparent 100%)' }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'focus-ring flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            active === tab.id
              ? 'bg-iter-primary text-white shadow-soft'
              : 'text-iter-muted hover:bg-iter-surface-hover hover:text-iter-text',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn('rounded-full px-1.5 text-[10px]', active === tab.id ? 'bg-white/20' : 'bg-iter-surface-hover')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
