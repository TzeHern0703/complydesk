import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'overdue' | 'soon' | 'completed' | 'postponed' | 'skipped'
}

const variants = {
  default: 'bg-indigo-50 text-indigo-700 dark:bg-purple-900/30 dark:text-purple-300',
  overdue: 'bg-red-50 text-red-700 font-semibold dark:bg-red-900/30 dark:text-red-400',
  soon: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'text-neutral-400 dark:text-zinc-500',
  postponed: 'bg-neutral-100 text-neutral-500 dark:bg-zinc-800 dark:text-zinc-400',
  skipped: 'text-neutral-400 dark:text-zinc-500',
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${variants[variant]}`}>
      {variant === 'overdue' && <span className="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-red-500" />}
      {children}
    </span>
  )
}
