import React from 'react'
import { cn } from '../../lib/utils'

function Button({ className, children, style, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-[0_18px_28px_-18px_rgba(99,102,241,0.9)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60'
  const defaultClasses = 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:brightness-110'

  return (
    <button
      data-slot="button"
      className={cn(baseClasses, defaultClasses, className || '')}
      style={{
        background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}

export { Button }
