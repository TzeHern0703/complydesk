export function updateTabTitle(overdueCount: number) {
  document.title = overdueCount > 0 ? `(${overdueCount}) ComplyDesk` : 'ComplyDesk'
}

export function updateFavicon(hasOverdue: boolean) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  if (!hasOverdue) {
    link.href = '/favicon.ico'
    return
  }
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = new Image()
  img.src = '/favicon.ico'
  const draw = () => {
    ctx.drawImage(img, 0, 0, 32, 32)
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(26, 6, 7, 0, 2 * Math.PI)
    ctx.fill()
    link!.href = canvas.toDataURL()
  }
  img.onload = draw
  img.onerror = () => {
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, 32, 32)
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(26, 6, 7, 0, 2 * Math.PI)
    ctx.fill()
    link!.href = canvas.toDataURL()
  }
}

export function supportsNotifications(): boolean {
  return 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission {
  if (!supportsNotifications()) return 'denied'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!supportsNotifications()) return 'denied'
  return Notification.requestPermission()
}

export function sendBrowserNotification(title: string, body: string) {
  if (!supportsNotifications() || Notification.permission !== 'granted') return
  const n = new Notification(title, { body, icon: '/favicon.ico' })
  n.onclick = () => {
    window.focus()
    n.close()
  }
}

export function formatTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}
