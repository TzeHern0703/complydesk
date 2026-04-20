import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { TaskSection } from '../components/tasks/TaskSection'
import { ProgressBar } from '../components/ui/ProgressBar'
import { isOverdue, isDueThisWeek, daysUntil } from '../lib/dateUtils'

export function Dashboard() {
  const { tasks, clients, templates, settings } = useStore()
  const now = new Date()
  const activeClients = clients.filter((c) => c.isActive)
  const activeClientIds = new Set(activeClients.map((c) => c.id))

  const activeTasks = tasks.filter((t) => activeClientIds.has(t.clientId))

  const overdue = activeTasks.filter(
    (t) => t.status === 'pending' && isOverdue(t.deadline)
  )

  const thisWeek = activeTasks.filter(
    (t) => t.status === 'pending' && isDueThisWeek(t.deadline)
  )

  const thisMonth = activeTasks.filter(
    (t) =>
      t.status === 'pending' &&
      !isOverdue(t.deadline) &&
      !isDueThisWeek(t.deadline) &&
      daysUntil(t.deadline) <= 31
  )

  const upcoming = activeTasks.filter(
    (t) => t.status === 'pending' && daysUntil(t.deadline) > 31
  )

  const postponed = activeTasks.filter((t) => t.status === 'postponed')

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const monthTasks = activeTasks.filter((t) => {
    const d = new Date(t.deadline)
    return d >= monthStart && d <= monthEnd && t.status !== 'skipped'
  })
  const completedThisMonth = monthTasks.filter((t) => t.status === 'completed')

  // Unprocessed email widget
  const gmailConnected = !!settings?.gmailAccessToken && (settings.gmailTokenExpiry ?? 0) > Date.now()

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-lg font-medium text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-400 mt-0.5">{format(now, 'EEEE, d MMMM yyyy')}</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded p-4">
        <ProgressBar
          value={completedThisMonth.length}
          max={monthTasks.length}
          label={`This month: ${format(now, 'MMMM yyyy')}`}
        />
      </div>

      {gmailConnected && (
        <UnprocessedEmailWidget />
      )}

      {overdue.length > 0 && (
        <TaskSection
          title="Overdue"
          tasks={overdue.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())}
          clients={clients}
          templates={templates}
        />
      )}

      <TaskSection
        title="Due This Week"
        tasks={thisWeek.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())}
        clients={clients}
        templates={templates}
        emptyMessage="No tasks due this week."
      />

      <TaskSection
        title="Due This Month"
        tasks={thisMonth.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())}
        clients={clients}
        templates={templates}
        emptyMessage="No other tasks due this month."
      />

      {upcoming.length > 0 && (
        <TaskSection
          title="Upcoming"
          tasks={upcoming.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())}
          clients={clients}
          templates={templates}
          defaultCollapsed
        />
      )}

      {postponed.length > 0 && (
        <TaskSection
          title="Postponed"
          tasks={postponed}
          clients={clients}
          templates={templates}
          defaultCollapsed
        />
      )}
    </div>
  )
}

function UnprocessedEmailWidget() {
  const navigate = useNavigate()
  const { emailMessages } = useStore()
  const unprocessed = emailMessages.filter((e) => !e.isProcessed).length
  if (unprocessed === 0) return null

  return (
    <button
      onClick={() => navigate('/inbox?filter=unprocessed')}
      className="w-full text-left bg-white border border-neutral-200 rounded p-4 hover:border-neutral-400 transition-colors flex items-center justify-between"
    >
      <div>
        <p className="text-sm font-medium text-neutral-900">
          {unprocessed} unprocessed work email{unprocessed !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-neutral-400 mt-0.5">Click to review in Inbox</p>
      </div>
      <span className="text-xs font-semibold bg-neutral-900 text-white px-2 py-1 rounded">
        {unprocessed}
      </span>
    </button>
  )
}
