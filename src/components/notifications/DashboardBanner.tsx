import { X, AlertTriangle } from 'lucide-react'

interface DashboardBannerProps {
  overdueCount: number
  thisWeekCount: number
  onDismiss: () => void
}

export function DashboardBanner({ overdueCount, thisWeekCount, onDismiss }: DashboardBannerProps) {
  if (overdueCount === 0 && thisWeekCount === 0) return null

  const parts: string[] = []
  if (overdueCount > 0) parts.push(`${overdueCount} overdue ${overdueCount === 1 ? 'task' : 'tasks'}`)
  if (thisWeekCount > 0) parts.push(`${thisWeekCount} due this week`)

  return (
    <div className="flex items-center justify-between rounded border border-neutral-300 bg-neutral-50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-neutral-700 min-w-0">
        <AlertTriangle size={14} className="flex-shrink-0 text-neutral-500" />
        <span>
          {overdueCount > 0 && (
            <span className="font-semibold text-neutral-900">{overdueCount} overdue {overdueCount === 1 ? 'task' : 'tasks'}</span>
          )}
          {overdueCount > 0 && thisWeekCount > 0 && (
            <span className="text-neutral-400 mx-1.5">•</span>
          )}
          {thisWeekCount > 0 && (
            <span>{thisWeekCount} due this week</span>
          )}
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="ml-3 flex-shrink-0 text-neutral-300 hover:text-neutral-600 transition-colors"
        aria-label="Dismiss for today"
      >
        <X size={14} />
      </button>
    </div>
  )
}
