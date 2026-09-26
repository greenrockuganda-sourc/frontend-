import * as React from "react"

import { cn } from "@/lib/utils"

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: 'inline-flex items-center rounded-full border-transparent bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-semibold',
  secondary: 'inline-flex items-center rounded-full border-transparent bg-secondary text-secondary-foreground px-2.5 py-0.5 text-xs font-semibold',
  destructive: 'inline-flex items-center rounded-full border-transparent bg-destructive text-destructive-foreground px-2.5 py-0.5 text-xs font-semibold',
  outline: 'inline-flex items-center rounded-full text-foreground px-2.5 py-0.5 text-xs font-semibold border',
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return <div className={cn(badgeVariantClasses[variant], className)} {...props} />
}

export { Badge }
