import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { format } from 'date-fns'
import { Sidebar } from './Sidebar'
import { NotificationCenter } from '../notifications/NotificationCenter'
import { useStore } from '../../store/useStore'
import { updateTabTitle, updateFavicon, sendBrowserNotification, formatTodayDate } from '../../lib/notificationUtils'
import { isOverdue, daysUntil } from '../../lib/dateUtils'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { tasks, clients, settings, updateSettings } = useStore()
  const dailyFiredRef = useRef(false)

  const activeClientIds = new Set(clients.filter((c) => c.isActive).map((c) => c.id))
  const now = new Date()
  const overdueCount = tasks.filter(
    (t) =>
      t.status === 'pending' &&
      activeClientIds.has(t.clientId) &&
      isOverdue(t.deadline) &&
      !(t.hiddenUntil && new Date(t.hiddenUntil) > now)
  ).length

  useEffect(() => {
    updateTabTitle(overdueCount)
    updateFavicon(overdueCount > 0)

    const interval = setInterval(() => {
      updateTabTitle(overdueCount)
      updateFavicon(overdueCount > 0)
    }, 3600000)

    return () => clearInterval(interval)
  }, [overdueCount])

  // Daily notification + real-time alerts
  useEffect(() => {
    if (!settings?.notificationEnabled) return

    const activeCids = new Set(clients.filter((c) => c.isActive).map((c) => c.id))
    const nowMs = new Date()

    function checkDailyNotification() {
      const today = formatTodayDate()
      if (settings?.notificationLastDailyAt === today) return
      if (dailyFiredRef.current) return

      const timeNow = format(new Date(), 'HH:mm')
      const targetTime = settings?.notificationDailyTime ?? '09:00'
      if (timeNow < targetTime) return

      dailyFiredRef.current = true
      const activeTasks = tasks.filter(
        (t) => t.status === 'pending' && activeCids.has(t.clientId) &&
          !(t.hiddenUntil && new Date(t.hiddenUntil) > nowMs)
      )
      const overdueNow = activeTasks.filter((t) => isOverdue(t.deadline)).length
      const dueToday = activeTasks.filter((t) => daysUntil(t.deadline) === 0).length
      const parts: string[] = []
      if (overdueNow > 0) parts.push(`${overdueNow} overdue`)
      if (dueToday > 0) parts.push(`${dueToday} due today`)
      const body = parts.length > 0 ? parts.join(' and ') + '.' : 'No urgent tasks today.'
      sendBrowserNotification('ComplyDesk — Today\'s tasks', body).then(() => {
        updateSettings({ notificationLastDailyAt: today })
      })
    }

    checkDailyNotification()
    const interval = setInterval(checkDailyNotification, 60000)
    return () => clearInterval(interval)
  }, [settings?.notificationEnabled, settings?.notificationDailyTime, settings?.notificationLastDailyAt])

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar overdueCount={overdueCount} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSidebarOpen(false)} />
          <div className="relative h-full">
            <Sidebar overdueCount={overdueCount} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-500 hover:text-neutral-700"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-neutral-900 flex-1">ComplyDesk</span>
          <NotificationCenter />
        </div>

        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-end border-b border-neutral-200 bg-white px-6 py-2">
          <NotificationCenter />
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
