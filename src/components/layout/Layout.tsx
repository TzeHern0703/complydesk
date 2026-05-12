import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Menu, Moon, Sun } from 'lucide-react'
import { format } from 'date-fns'
import { Sidebar } from './Sidebar'
import { NotificationCenter } from '../notifications/NotificationCenter'
import { useStore } from '../../store/useStore'
import { updateTabTitle, updateFavicon, sendBrowserNotification, formatTodayDate } from '../../lib/notificationUtils'
import { isOverdue, daysUntil } from '../../lib/dateUtils'
import { toggleDarkMode, isDarkMode } from '../../lib/darkMode'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(isDarkMode)
  const { tasks, clients, settings, updateSettings } = useStore()

  function handleToggleDark() {
    const next = toggleDarkMode()
    setDarkMode(next)
  }
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
      sendBrowserNotification('ComplyDesk — Today\'s tasks', body).then(({ sent }) => {
        if (sent) updateSettings({ notificationLastDailyAt: today })
        else dailyFiredRef.current = false // retry next minute if failed
      })
    }

    checkDailyNotification()
    const interval = setInterval(checkDailyNotification, 60000)
    return () => clearInterval(interval)
  }, [settings?.notificationEnabled, settings?.notificationDailyTime, settings?.notificationLastDailyAt])

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-black overflow-hidden">
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
        <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-zinc-800 bg-white dark:bg-black px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-500 hover:text-neutral-700 dark:text-zinc-400 dark:hover:text-purple-300"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-neutral-900 dark:text-white flex-1">ComplyDesk</span>
          <button
            onClick={handleToggleDark}
            className="text-neutral-400 hover:text-neutral-700 dark:text-zinc-400 dark:hover:text-purple-300 transition-colors mr-2"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NotificationCenter />
        </div>

        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-end gap-2 border-b border-neutral-200 dark:border-zinc-800 bg-white dark:bg-black px-6 py-2">
          <button
            onClick={handleToggleDark}
            className="text-neutral-400 hover:text-neutral-700 dark:text-zinc-400 dark:hover:text-purple-300 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NotificationCenter />
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
