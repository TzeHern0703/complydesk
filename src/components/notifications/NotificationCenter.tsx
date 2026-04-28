import { useState, useRef, useEffect } from 'react'
import { Bell, X, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useStore } from '../../store/useStore'
import { isOverdue, daysUntil } from '../../lib/dateUtils'
import type { Task, Client, TaskTemplate } from '../../types'

type NotifType = 'overdue' | 'due_today' | 'due_week'

interface NotifItem {
  id: string
  taskId: string
  type: NotifType
  clientName: string
  templateName: string
  deadline: Date
  clientId: string
}

function buildNotifications(
  tasks: Task[],
  clients: Client[],
  templates: TaskTemplate[],
): NotifItem[] {
  const clientMap = new Map(clients.map((c) => [c.id, c]))
  const templateMap = new Map(templates.map((t) => [t.id, t]))
  const now = new Date()
  const items: NotifItem[] = []

  for (const task of tasks) {
    if (task.status !== 'pending') continue
    if (task.hiddenUntil && new Date(task.hiddenUntil) > now) continue
    const client = clientMap.get(task.clientId)
    const template = templateMap.get(task.templateId)
    if (!client || !template) continue

    const days = daysUntil(task.deadline)
    let type: NotifType | null = null
    if (isOverdue(task.deadline)) type = 'overdue'
    else if (days === 0) type = 'due_today'
    else if (days <= 7) type = 'due_week'
    if (!type) continue

    items.push({
      id: `${task.id}-${type}`,
      taskId: task.id,
      type,
      clientName: client.name,
      templateName: template.name,
      deadline: new Date(task.deadline),
      clientId: task.clientId,
    })
  }

  const order: NotifType[] = ['overdue', 'due_today', 'due_week']
  return items.sort((a, b) => {
    const oi = order.indexOf(a.type) - order.indexOf(b.type)
    if (oi !== 0) return oi
    return a.deadline.getTime() - b.deadline.getTime()
  })
}

const TYPE_LABELS: Record<NotifType, string> = {
  overdue: 'Overdue',
  due_today: 'Due Today',
  due_week: 'Due This Week',
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { tasks, clients, templates, notificationReadIds, markNotificationRead, markAllNotificationsRead } = useStore()

  const notifications = buildNotifications(tasks, clients, templates)
  const unreadCount = notifications.filter((n) => !notificationReadIds.has(n.id)).length

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleMarkAll() {
    const unread = notifications.filter((n) => !notificationReadIds.has(n.id)).map((n) => n.id)
    if (unread.length > 0) markAllNotificationsRead(unread)
  }

  const grouped = {
    overdue: notifications.filter((n) => n.type === 'overdue'),
    due_today: notifications.filter((n) => n.type === 'due_today'),
    due_week: notifications.filter((n) => n.type === 'due_week'),
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 text-neutral-400 hover:text-neutral-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <span className="text-sm font-semibold text-neutral-900">
              Notifications {unreadCount > 0 && <span className="text-xs font-normal text-neutral-400">({unreadCount} new)</span>}
            </span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs text-neutral-400 hover:text-neutral-700 underline underline-offset-2"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-neutral-300 hover:text-neutral-600">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-neutral-400 text-center">No urgent tasks right now.</p>
            ) : (
              (['overdue', 'due_today', 'due_week'] as NotifType[]).map((type) => {
                const items = grouped[type]
                if (items.length === 0) return null
                return (
                  <div key={type}>
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                      {TYPE_LABELS[type]}
                    </p>
                    {items.map((item) => {
                      const isRead = notificationReadIds.has(item.id)
                      return (
                        <div
                          key={item.id}
                          className={`px-4 py-2.5 border-b border-neutral-50 last:border-0 ${isRead ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {!isRead && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 mb-0.5" />
                              )}
                              <span className="text-sm font-medium text-neutral-900">{item.templateName}</span>
                              <p className="text-xs text-neutral-400 mt-0.5">
                                {item.clientName} — {format(item.deadline, 'd MMM yyyy')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                              {!isRead && (
                                <button
                                  onClick={() => markNotificationRead(item.id)}
                                  className="text-xs text-neutral-400 hover:text-neutral-700 whitespace-nowrap"
                                >
                                  Read
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  navigate(`/clients/${item.clientId}`)
                                  setOpen(false)
                                }}
                                className="text-neutral-300 hover:text-neutral-700"
                              >
                                <ArrowRight size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
