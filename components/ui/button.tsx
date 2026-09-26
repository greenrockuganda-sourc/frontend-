import React from 'react'
import { cn } from '../../lib/utils'

type Variant = 'default' | 'ghost' | 'outline'
type Size = 'default' | 'icon' | 'sm'

function Button({ className, children, style, variant = 'default', size = 'default', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string; variant?: Variant; size?: Size }) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'

  const sizeClasses = {
    default: 'px-4 py-2.5',
    sm: 'px-3 py-2 text-sm',
    icon: 'p-2 h-8 w-8',
  }

  const variantClasses: Record<Variant, string> = {
    default: 'shadow-[0_18px_28px_-18px_rgba(99,102,241,0.9)] bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:brightness-110',
    ghost: 'bg-transparent hover:bg-muted text-foreground',
    outline: 'bg-transparent border border-border text-foreground',
  }

  return (
    <button
      data-slot="button"
      className={cn(baseClasses, sizeClasses[size] ?? '', variantClasses[variant], className || '')}
      style={style}
      {...props}
    >
      {children}
    </button>
  )
}

export { Button }
