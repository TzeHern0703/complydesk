import { Bell, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { supportsNotifications, requestNotificationPermission } from '../../lib/notificationUtils'
import { useStore } from '../../store/useStore'

interface NotificationPermissionCardProps {
  onDismiss: () => void
}

export function NotificationPermissionCard({ onDismiss }: NotificationPermissionCardProps) {
  const { updateSettings } = useStore()

  if (!supportsNotifications()) return null

  async function handleEnable() {
    const permission = await requestNotificationPermission()
    if (permission === 'granted') {
      await updateSettings({ notificationEnabled: true })
    } else {
      await updateSettings({ notificationEnabled: false })
    }
    onDismiss()
  }

  async function handleLater() {
    await updateSettings({ notificationPermissionDismissedAt: new Date().toISOString() })
    onDismiss()
  }

  return (
    <div className="border border-neutral-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-neutral-500 dark:text-zinc-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-neutral-900 dark:text-white">Get deadline reminders</p>
        </div>
        <button onClick={handleLater} className="text-neutral-300 hover:text-neutral-600 dark:text-zinc-600 dark:hover:text-zinc-300">
          <X size={14} />
        </button>
      </div>
      <p className="text-sm text-neutral-500 dark:text-zinc-400">
        Enable browser notifications to get alerts when tasks are due — even when you're working in another tab.
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={handleLater}>
          Maybe later
        </Button>
        <Button variant="primary" size="sm" onClick={handleEnable}>
          Enable notifications
        </Button>
      </div>
      <p className="text-xs text-neutral-400 dark:text-zinc-500">
        Notifications are generated locally in your browser. No data is sent to any server.
      </p>
    </div>
  )
}
