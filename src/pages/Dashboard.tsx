import { format, isBefore } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { TaskSection } from '../components/tasks/TaskSection'
import { ProgressBar } from '../components/ui/ProgressBar'
import { DashboardBanner } from '../components/notifications/DashboardBanner'
import { NotificationPermissionCard } from '../components/notifications/NotificationPermissionCard'
import { isOverdue, isDueThisWeek, isDueThisMonth, daysUntil } from '../lib/dateUtils'
import { getWeekStart, weekStartToString, formatTime12h } from '../lib/weekUtils'
import { supportsNotifications, getNotificationPermission, formatTodayDate } from '../lib/notificationUtils'
import type { PersonalTask } from '../types'

export function Dashboard() {
  const { tasks, clients, templates, settings, updateSettings } = useStore()
  const now = new Date()
  const activeClients = clients.filter((c) => c.isActive)
  const activeClientIds = new Set(activeClients.map((c) => c.id))

  const [bannerDismissed, setBannerDismissed] = useState(
    settings?.notificationBannerDismissedDate === formatTodayDate()
  )
  const [permissionCardDismissed, setPermissionCardDismissed] = useState(false)

  // Track dashboard visits for soft permission ask timing
  useEffect(() => {
    const visitCount = (settings?.dashboardVisitCount ?? 0) + 1
    updateSettings({ dashboardVisitCount: visitCount })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDismissBanner() {
    setBannerDismissed(true)
    await updateSettings({ notificationBannerDismissedDate: formatTodayDate() })
  }

  const showPermissionCard =
    !permissionCardDismissed &&
    supportsNotifications() &&
    getNotificationPermission() === 'default' &&
    (settings?.dashboardVisitCount ?? 0) >= 2 &&
    !settings?.notificationPermissionDismissedAt

  const activeTasks = tasks.filter((t) => {
    if (!activeClientIds.has(t.clientId)) return false
    if (t.hiddenUntil && new Date(t.hiddenUntil) > now) return false
    return true
  })

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
      isDueThisMonth(t.deadline)
  )

  const upcoming = activeTasks.filter(
    (t) => t.status === 'pending' && !isOverdue(t.deadline) && !isDueThisWeek(t.deadline) && !isDueThisMonth(t.deadline)
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

      {!bannerDismissed && (
        <DashboardBanner
          overdueCount={overdue.length}
          thisWeekCount={thisWeek.length}
          onDismiss={handleDismissBanner}
        />
      )}

      {showPermissionCard && (
        <NotificationPermissionCard onDismiss={() => setPermissionCardDismissed(true)} />
      )}

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

      <MyWeekWidget />
    </div>
  )
}

function MyWeekWidget() {
  const navigate = useNavigate()
  const { personalTasks, recurringInstances } = useStore()
  const now = new Date()
  const todayWd = now.getDay()
  const tomorrowWd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getDay()
  const currentWeekStart = weekStartToString(getWeekStart(now))

  const todayInstances = recurringInstances.filter(
    (i) => i.weekStart === currentWeekStart && i.weekday === todayWd && i.status === 'pending'
  )
  const todayOnce = personalTasks.filter(
    (t) => t.type === 'one-time-weekly' && t.weekStart === currentWeekStart && t.scheduledWeekday === todayWd && t.status === 'pending'
  )
  const tomorrowInstances = recurringInstances.filter(
    (i) => i.weekStart === currentWeekStart && i.weekday === tomorrowWd && i.status === 'pending'
  )
  const tomorrowOnce = personalTasks.filter(
    (t) => t.type === 'one-time-weekly' && t.weekStart === currentWeekStart && t.scheduledWeekday === tomorrowWd && t.status === 'pending'
  )
  const unscheduled = personalTasks.filter(
    (t) => t.type === 'one-time-weekly' && t.weekStart === currentWeekStart && t.scheduledWeekday === undefined && t.status === 'pending'
  )
  const overdueTodos = personalTasks.filter(
    (t) => t.type === 'todo' && t.deadline && t.status === 'pending' && isBefore(new Date(t.deadline + 'T23:59:59'), now)
  )

  const allEmpty =
    todayInstances.length === 0 &&
    todayOnce.length === 0 &&
    tomorrowInstances.length === 0 &&
    tomorrowOnce.length === 0 &&
    unscheduled.length === 0 &&
    overdueTodos.length === 0

  const recurringMap = new Map<string, PersonalTask>(
    personalTasks.filter((t) => t.type === 'recurring-weekly').map((t) => [t.id, t])
  )

  function renderItem(label: string, time?: string) {
    return (
      <div key={label} className="flex items-center gap-2 text-sm text-neutral-700 py-0.5">
        <span className="w-3.5 h-3.5 rounded border border-neutral-300 flex-shrink-0" />
        <span>{label}</span>
        {time && <span className="text-xs text-neutral-400">{formatTime12h(time)}</span>}
      </div>
    )
  }

  return (
    <div className="border border-neutral-200 rounded p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">My Week</h2>
        <button
          onClick={() => navigate('/my-week')}
          className="text-xs text-neutral-400 hover:text-neutral-900 underline underline-offset-2"
        >
          Open My Week →
        </button>
      </div>

      {allEmpty ? (
        <p className="text-sm text-neutral-400">Nothing scheduled for today.</p>
      ) : (
        <div className="space-y-3">
          {(todayInstances.length > 0 || todayOnce.length > 0) && (
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">
                Today ({todayInstances.length + todayOnce.length} pending)
              </p>
              {todayInstances.map((i) => {
                const rt = recurringMap.get(i.recurringTaskId)
                return rt ? renderItem(rt.title, rt.recurringTime) : null
              })}
              {todayOnce.map((t) => renderItem(t.title, t.scheduledTime))}
            </div>
          )}

          {(tomorrowInstances.length > 0 || tomorrowOnce.length > 0) && (
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">
                Tomorrow ({tomorrowInstances.length + tomorrowOnce.length})
              </p>
              {tomorrowInstances.map((i) => {
                const rt = recurringMap.get(i.recurringTaskId)
                return rt ? renderItem(rt.title, rt.recurringTime) : null
              })}
              {tomorrowOnce.map((t) => renderItem(t.title, t.scheduledTime))}
            </div>
          )}

          {unscheduled.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">
                Unscheduled this week ({unscheduled.length})
              </p>
              {unscheduled.map((t) => renderItem(t.title))}
            </div>
          )}

          {overdueTodos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-500 mb-1">
                Overdue to-dos ({overdueTodos.length})
              </p>
              {overdueTodos.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm text-neutral-700 py-0.5">
                  <span className="w-3.5 h-3.5 rounded border border-red-300 flex-shrink-0" />
                  <span>{t.title}</span>
                  {t.deadline && (
                    <span className="text-xs text-red-400">
                      due {format(new Date(t.deadline + 'T00:00:00'), 'd MMM')}
                    </span>
                  )}
                </div>
              ))}
              {overdueTodos.length > 3 && (
                <p className="text-xs text-neutral-400 pl-5">+{overdueTodos.length - 3} more</p>
              )}
            </div>
          )}
        </div>
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
