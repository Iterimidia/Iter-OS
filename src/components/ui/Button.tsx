import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-iter-primary text-white hover:bg-iter-primary-hover shadow-soft',
  secondary: 'bg-iter-surface-alt text-iter-text hover:bg-iter-surface-hover border border-iter-border',
  outline: 'bg-transparent text-iter-text border border-iter-border hover:bg-iter-surface-alt',
  ghost: 'bg-transparent text-iter-muted hover:bg-iter-surface-alt hover:text-iter-text',
  danger: 'bg-iter-danger/10 text-iter-danger border border-iter-danger/30 hover:bg-iter-danger/20',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'h-9 w-9 justify-center px-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          'focus-ring inline-flex items-center rounded-lg font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
