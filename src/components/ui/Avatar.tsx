import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  initials: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-11 w-11 text-sm' }

export function Avatar({ name, initials, color = '#7C6BFF', size = 'md', className }: AvatarProps) {
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-1 ring-white/10',
        sizeClasses[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  )
}
