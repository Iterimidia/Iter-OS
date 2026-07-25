import type { Client, User } from '@/types'
import { CLIENT_STATUS_META, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'

interface ClientCardProps {
  client: Client
  strategicResponsible?: User
  creativeResponsible?: User
  onClick: () => void
}

export function ClientCard({ client, strategicResponsible, creativeResponsible, onClick }: ClientCardProps) {
  return (
    <button
      onClick={onClick}
      className="card-surface flex flex-col gap-3 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-iter-primary/40 hover:shadow-glow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-iter-text">{client.name}</p>
          <p className="mt-0.5 truncate text-xs text-iter-faint">{client.segment}</p>
        </div>
        <Badge tone={CLIENT_STATUS_META[client.status].tone} className="shrink-0">
          {CLIENT_STATUS_META[client.status].label}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {client.services.slice(0, 3).map((s) => (
          <Badge key={s} tone="neutral">
            {s}
          </Badge>
        ))}
        {client.services.length > 3 && <Badge tone="neutral">+{client.services.length - 3}</Badge>}
      </div>

      {client.pendencies && (
        <p className="line-clamp-2 rounded-lg bg-iter-warning/10 px-2.5 py-2 text-[11px] leading-relaxed text-iter-warning">
          {client.pendencies}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-iter-border pt-3">
        <div className="flex -space-x-2">
          {strategicResponsible && (
            <Avatar
              name={strategicResponsible.name}
              initials={strategicResponsible.avatarInitials}
              color={strategicResponsible.avatarColor}
              size="sm"
              className="ring-2 ring-iter-surface"
            />
          )}
          {creativeResponsible && creativeResponsible.id !== strategicResponsible?.id && (
            <Avatar
              name={creativeResponsible.name}
              initials={creativeResponsible.avatarInitials}
              color={creativeResponsible.avatarColor}
              size="sm"
              className="ring-2 ring-iter-surface"
            />
          )}
        </div>
        <span className="text-right text-[11px] text-iter-faint">
          {client.plan}
          {client.monthlyValue > 0 && (
            <>
              {' · '}
              <span className="font-medium text-iter-success">{formatCurrency(client.monthlyValue)}/mês</span>
            </>
          )}
        </span>
      </div>
    </button>
  )
}
