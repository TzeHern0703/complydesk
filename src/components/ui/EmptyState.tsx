import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-3 text-stone-300">{icon}</div>}
      <p className="text-sm font-medium text-stone-500">{title}</p>
      {description && <p className="mt-1 text-xs text-stone-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
