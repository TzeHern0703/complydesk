import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'overdue' | 'soon' | 'completed' | 'postponed' | 'skipped'
}

const variants = {
  default: 'bg-neutral-100 text-neutral-600',
  overdue: 'bg-neutral-100 text-neutral-900 font-semibold',
  soon: 'bg-neutral-100 text-neutral-700',
  completed: 'text-neutral-400',
  postponed: 'bg-neutral-100 text-neutral-600',
  skipped: 'text-neutral-400',
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${variants[variant]}`}>
      {variant === 'overdue' && <span className="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-neutral-900" />}
      {children}
    </span>
  )
}
