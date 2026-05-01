import { format, addDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { TaskSection } from '../components/tasks/TaskSection'
import { TaskRow } from '../components/tasks/TaskRow'
import { ProgressBar } from '../components/ui/ProgressBar'
import { DashboardBanner } from '../components/notifications/DashboardBanner'
import { NotificationPermissionCard } from '../components/notifications/NotificationPermissionCard'
import { isOverdue, isDueThisWeek, isDueThisMonth } from '../lib/dateUtils'
import { getWeekStart, weekStartToString, formatTime12h } from '../lib/weekUtils'
import { supportsNotifications, getNotificationPermission, formatTodayDate } from '../lib/notificationUtils'
import type { Task, Client, TaskTemplate, PersonalTask, RecurringWeeklyInstance } from '../types'

// ── Unified task item for mixed sections ──────────────────────────────────────

type DashboardItemType = 'compliance' | 'todo' | 'scheduled' | 'recurring'

interface DashboardItem {
  id: string
  type: DashboardItemType
  title: string
  deadline: Date
  // compliance
  complianceTask?: Task
  client?: Client
  template?: TaskTemplate
  // personal
  personalTask?: PersonalTask
  recurringInstance?: RecurringWeeklyInstance
  recurringParent?: PersonalTask
}

const TYPE_ORDER: Record<DashboardItemType, number> = {
  compliance: 0, scheduled: 1, todo: 2, recurring: 3,
}

function sortItems(items: DashboardItem[]): DashboardItem[] {
  return [...items].sort((a, b) => {
    const dateDiff = a.deadline.getTime() - b.deadline.getTime()
    if (dateDiff !== 0) return dateDiff
    const typeDiff = TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
    if (typeDiff !== 0) return typeDiff
    return a.title.localeCompare(b.title)
  })
}

// ── Personal task row in dashboard sections ───────────────────────────────────

const TYPE_LABELS: Record<DashboardItemType, string> = {
  compliance: 'Compliance', todo: 'To-Do', scheduled: 'Scheduled', recurring: 'Recurring',
}

function DashboardPersonalRow({
  item,
  onComplete,
}: {
  item: DashboardItem
  onComplete: (item: DashboardItem) => void
}) {
  const navigate = useNavigate()
  const task = item.personalTask ?? item.recurringParent
  const isDone = item.recurringInstance
    ? item.recurringInstance.status === 'completed'
    : item.personalTask?.status === 'completed'

  const deadlineLabel = (() => {
    const d = item.deadline
    const now = new Date()
    const diff = Math.round((d.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000)
    if (diff < 0) return `${Math.abs(diff)}d overdue`
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return format(d, 'd MMM yyyy')
  })()

  const isOv = item.deadline < new Date(new Date().setHours(0, 0, 0, 0))

  return (
    <div className={`border border-neutral-200 rounded bg-white transition-opacity ${isDone ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => onComplete(item)}
          className={`flex-shrink-0 w-4 h-4 rounded border transition-colors ${
            isDone ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300 hover:border-neutral-900'
          }`}
          aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
        >
          {isDone && (
            <svg viewBox="0 0 12 12" fill="none" className="w-full h-full">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium truncate ${isDone ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
            {item.title}
          </span>
          <span className="text-xs bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">
            {TYPE_LABELS[item.type]}
          </span>
          {task?.recurringMonths && (
            <span className="text-xs text-neutral-400">↻ every {task.recurringMonths}mo</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded ${isOv ? 'bg-red-50 text-red-600' : 'bg-neutral-100 text-neutral-500'}`}>
            {deadlineLabel}
          </span>
          <button
            onClick={() => navigate('/my-week')}
            className="text-xs text-neutral-400 hover:text-neutral-700 underline underline-offset-2"
          >
            view
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Mixed section (compliance + personal) ─────────────────────────────────────

function MixedSection({
  title,
  complianceTasks,
  personalItems,
  clients,
  templates,
  emptyMessage,
  defaultCollapsed,
  onPersonalComplete,
}: {
  title: string
  complianceTasks: Task[]
  personalItems: DashboardItem[]
  clients: Client[]
  templates: TaskTemplate[]
  emptyMessage?: string
  defaultCollapsed?: boolean
  onPersonalComplete: (item: DashboardItem) => void
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false)
  const totalCount = complianceTasks.length + personalItems.length
  if (totalCount === 0 && !emptyMessage) return null

  // Build a merged sorted list for rendering order
  const mergedItems = useMemo(() => {
    const complianceItems: DashboardItem[] = complianceTasks.map((t) => ({
      id: t.id,
      type: 'compliance' as const,
      title: templates.find((tmpl) => tmpl.id === t.templateId)?.name ?? '',
      deadline: new Date(t.deadline),
      complianceTask: t,
      client: clients.find((c) => c.id === t.clientId),
      template: templates.find((tmpl) => tmpl.id === t.templateId),
    }))
    return sortItems([...complianceItems, ...personalItems])
  }, [complianceTasks, personalItems, clients, templates])

  return (
    <div>
      <button
        className="flex items-center gap-2 mb-3 w-full text-left"
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</span>
        <span className="text-xs text-neutral-400">({totalCount})</span>
        <span className="ml-auto text-neutral-400 text-xs">{collapsed ? '▾' : '▴'}</span>
      </button>
      {!collapsed && (
        <div className="space-y-2">
          {totalCount === 0 && emptyMessage ? (
            <p className="text-sm text-neutral-400">{emptyMessage}</p>
          ) : (
            mergedItems.map((item) => {
              if (item.type === 'compliance' && item.complianceTask && item.client && item.template) {
                return (
                  <TaskRow
                    key={item.id}
                    task={item.complianceTask}
                    client={item.client}
                    template={item.template}
                    showClient
                  />
                )
              }
              return (
                <DashboardPersonalRow
                  key={item.id}
                  item={item}
                  onComplete={onPersonalComplete}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export function Dashboard() {
  const { tasks, clients, templates, settings, updateSettings, personalTasks, recurringInstances, updatePersonalTaskStatus, updateRecurringInstanceStatus } = useStore()
  const now = new Date()
  const activeClients = clients.filter((c) => c.isActive)
  const activeClientIds = new Set(activeClients.map((c) => c.id))

  const [bannerDismissed, setBannerDismissed] = useState(
    settings?.notificationBannerDismissedDate === formatTodayDate()
  )
  const [permissionCardDismissed, setPermissionCardDismissed] = useState(false)

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

  // ── Compliance tasks ──────────────────────────────────────────────────────

  const activeTasks = tasks.filter((t) => {
    if (!activeClientIds.has(t.clientId)) return false
    if (t.hiddenUntil && new Date(t.hiddenUntil) > now) return false
    return true
  })

  const compOverdue = activeTasks.filter((t) => t.status === 'pending' && isOverdue(t.deadline))
  const compThisWeek = activeTasks.filter((t) => t.status === 'pending' && isDueThisWeek(t.deadline))
  const compThisMonth = activeTasks.filter((t) => t.status === 'pending' && !isOverdue(t.deadline) && !isDueThisWeek(t.deadline) && isDueThisMonth(t.deadline))
  const compUpcoming = activeTasks.filter((t) => t.status === 'pending' && !isOverdue(t.deadline) && !isDueThisWeek(t.deadline) && !isDueThisMonth(t.deadline))
  const postponed = activeTasks.filter((t) => t.status === 'postponed')

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const monthTasks = activeTasks.filter((t) => {
    const d = new Date(t.deadline)
    return d >= monthStart && d <= monthEnd && t.status !== 'skipped' && t.status !== 'postponed'
  })
  const completedThisMonth = monthTasks.filter((t) => t.status === 'completed')

  // ── Personal task date computation ────────────────────────────────────────

  const currentWeekStart = getWeekStart(now)
  const currentWeekStartStr = weekStartToString(currentWeekStart)

  const recurringParentMap = useMemo(() => {
    const m = new Map<string, PersonalTask>()
    personalTasks.filter((t) => t.type === 'recurring-weekly').forEach((t) => m.set(t.id, t))
    return m
  }, [personalTasks])

  // Convert weekday (0=Sun..6=Sat) to a Date in the current Mon-based week
  function weekdayToDate(weekday: number): Date {
    // weekStart is Monday; offset = (weekday + 6) % 7
    return addDays(currentWeekStart, (weekday + 6) % 7)
  }

  const personalDashboardItems = useMemo((): DashboardItem[] => {
    const items: DashboardItem[] = []

    // To-do with deadline
    for (const t of personalTasks) {
      if (t.type !== 'todo' || t.status !== 'pending' || !t.deadline) continue
      items.push({
        id: t.id,
        type: 'todo',
        title: t.title,
        deadline: new Date(t.deadline + 'T00:00:00'),
        personalTask: t,
      })
    }

    // One-time-weekly with a scheduled day this week
    for (const t of personalTasks) {
      if (t.type !== 'one-time-weekly' || t.weekStart !== currentWeekStartStr || t.status !== 'pending') continue
      if (t.scheduledWeekday === undefined) continue
      items.push({
        id: t.id,
        type: 'scheduled',
        title: t.title,
        deadline: weekdayToDate(t.scheduledWeekday),
        personalTask: t,
      })
    }

    // Recurring weekly instances this week
    for (const inst of recurringInstances) {
      if (inst.weekStart !== currentWeekStartStr || inst.status !== 'pending') continue
      const parent = recurringParentMap.get(inst.recurringTaskId)
      if (!parent) continue
      items.push({
        id: inst.id,
        type: 'recurring',
        title: parent.title,
        deadline: weekdayToDate(inst.weekday),
        recurringInstance: inst,
        recurringParent: parent,
      })
    }

    return items
  }, [personalTasks, recurringInstances, currentWeekStartStr, recurringParentMap])

  function bucketPersonalItems(
    filter: (d: DashboardItem) => boolean
  ): DashboardItem[] {
    return personalDashboardItems.filter(filter)
  }

  const personalOverdue = bucketPersonalItems((i) => isOverdue(i.deadline))
  const personalThisWeek = bucketPersonalItems((i) => isDueThisWeek(i.deadline))
  const personalThisMonth = bucketPersonalItems(
    (i) => !isOverdue(i.deadline) && !isDueThisWeek(i.deadline) && isDueThisMonth(i.deadline)
  )
  const personalUpcoming = bucketPersonalItems(
    (i) => !isOverdue(i.deadline) && !isDueThisWeek(i.deadline) && !isDueThisMonth(i.deadline)
  )

  async function handlePersonalComplete(item: DashboardItem) {
    if (item.recurringInstance) {
      const newStatus = item.recurringInstance.status === 'completed' ? 'pending' : 'completed'
      await updateRecurringInstanceStatus(item.recurringInstance.id, newStatus)
    } else if (item.personalTask) {
      const newStatus = item.personalTask.status === 'completed' ? 'pending' : 'completed'
      await updatePersonalTaskStatus(item.personalTask.id, newStatus)
    }
  }

  const gmailConnected = !!settings?.gmailAccessToken && (settings.gmailTokenExpiry ?? 0) > Date.now()
  const hasOverdue = compOverdue.length + personalOverdue.length > 0

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-lg font-medium text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-400 mt-0.5">{format(now, 'EEEE, d MMMM yyyy')}</p>
      </div>

      {!bannerDismissed && (
        <DashboardBanner
          overdueCount={compOverdue.length + personalOverdue.length}
          thisWeekCount={compThisWeek.length + personalThisWeek.length}
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

      {gmailConnected && <UnprocessedEmailWidget />}

      {hasOverdue && (
        <MixedSection
          title="Overdue"
          complianceTasks={compOverdue.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())}
          personalItems={personalOverdue}
          clients={clients}
          templates={templates}
          onPersonalComplete={handlePersonalComplete}
        />
      )}

      <MixedSection
        title="Due This Week"
        complianceTasks={compThisWeek.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())}
        personalItems={personalThisWeek}
        clients={clients}
        templates={templates}
        emptyMessage="No tasks due this week."
        onPersonalComplete={handlePersonalComplete}
      />

      <MixedSection
        title="Due This Month"
        complianceTasks={compThisMonth.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())}
        personalItems={personalThisMonth}
        clients={clients}
        templates={templates}
        emptyMessage="No other tasks due this month."
        onPersonalComplete={handlePersonalComplete}
      />

      {(compUpcoming.length + personalUpcoming.length) > 0 && (
        <MixedSection
          title="Upcoming"
          complianceTasks={compUpcoming.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())}
          personalItems={personalUpcoming}
          clients={clients}
          templates={templates}
          defaultCollapsed
          onPersonalComplete={handlePersonalComplete}
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

// ── MyWeek widget (undated items only) ────────────────────────────────────────

function MyWeekWidget() {
  const navigate = useNavigate()
  const { personalTasks, recurringInstances } = useStore()
  const now = new Date()
  const todayWd = now.getDay()
  const currentWeekStart = weekStartToString(getWeekStart(now))

  const todayInstances = recurringInstances.filter(
    (i) => i.weekStart === currentWeekStart && i.weekday === todayWd && i.status === 'pending'
  )
  const unscheduled = personalTasks.filter(
    (t) => t.type === 'one-time-weekly' && t.weekStart === currentWeekStart && t.scheduledWeekday === undefined && t.status === 'pending'
  )
  const undatedTodos = personalTasks.filter(
    (t) => t.type === 'todo' && !t.deadline && t.status === 'pending'
  )

  const allEmpty = todayInstances.length === 0 && unscheduled.length === 0 && undatedTodos.length === 0

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
        <p className="text-sm text-neutral-400">No unscheduled or undated tasks this week.</p>
      ) : (
        <div className="space-y-3">
          {todayInstances.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">
                Today's recurring ({todayInstances.length} pending)
              </p>
              {todayInstances.map((i) => {
                const rt = recurringMap.get(i.recurringTaskId)
                return rt ? renderItem(rt.title, rt.recurringTime) : null
              })}
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

          {undatedTodos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-500 mb-1">
                To-dos without deadline ({undatedTodos.length})
              </p>
              {undatedTodos.map((t) => renderItem(t.title))}
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
